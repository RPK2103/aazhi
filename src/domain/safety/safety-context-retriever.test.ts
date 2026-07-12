import { describe, expect, it } from "vitest";
import {
  calculateRiskDeltas,
  evaluateReassessmentNeed,
  type RiskConcept,
} from "@/domain/risk";
import {
  CONTENT_REPRESENTATIONS,
  DEFAULT_RETRIEVAL_LIMIT,
  deriveSafetyRetrievalConcepts,
  InvalidRetrievalLimitError,
  isContentRepresentation,
  isSafetyAuthority,
  retrieveSafetyContext,
  SAFETY_AUTHORITIES,
  type SafetyKnowledgeRecord,
} from "@/domain/safety";
import { INITIAL_SAFETY_KNOWLEDGE } from "@/data/safety";
import { S003_ENGINE_WAVE_DETERIORATION } from "@/evals";
import { buildRiskInterpretationInput } from "@/lib/ai";

function makeRecord(
  overrides: Partial<SafetyKnowledgeRecord> & Pick<SafetyKnowledgeRecord, "id">,
): SafetyKnowledgeRecord {
  return {
    authority: "FAO",
    documentTitle: "Test Document",
    jurisdiction: "International",
    section: "Test Section",
    riskConcepts: ["ENGINE_RELIABILITY"],
    content: "Test curated safety context content.",
    contentRepresentation: "CURATED_PARAPHRASE",
    sourceUrl: "https://www.fao.org/fishery/en/topic/16144",
    sourceLocator: "Test — section",
    version: null,
    effectiveDate: null,
    retrievalPriority: 1,
    applicabilityNote: null,
    ...overrides,
  };
}

describe("SafetyAuthority vocabulary", () => {
  it("is bounded to exactly six authorities", () => {
    expect(SAFETY_AUTHORITIES).toEqual([
      "FAO",
      "IMO",
      "ILO",
      "FAO_ILO_IMO",
      "INCOIS",
      "INDIA_FISHERIES_AUTHORITY",
    ]);
    expect(isSafetyAuthority("FAO")).toBe(true);
    expect(isSafetyAuthority("REDDIT")).toBe(false);
  });
});

describe("ContentRepresentation vocabulary", () => {
  it("is bounded to CURATED_PARAPHRASE and VERBATIM_EXCERPT", () => {
    expect(CONTENT_REPRESENTATIONS).toEqual([
      "CURATED_PARAPHRASE",
      "VERBATIM_EXCERPT",
    ]);
    expect(isContentRepresentation("CURATED_PARAPHRASE")).toBe(true);
    expect(isContentRepresentation("INVENTED")).toBe(false);
  });
});

describe("SafetyKnowledgeRecord", () => {
  it("accepts a valid curated record", () => {
    const record = makeRecord({ id: "sk-test-001" });
    expect(record.contentRepresentation).toBe("CURATED_PARAPHRASE");
    expect(record.content.length).toBeGreaterThan(0);
  });

  it("accepts applicabilityNote as string or null", () => {
    const withNote = makeRecord({
      id: "sk-note-001",
      applicabilityNote: "Applies to decked vessels under 12 m.",
    });
    const withoutNote = makeRecord({
      id: "sk-note-002",
      applicabilityNote: null,
    });
    expect(withNote.applicabilityNote).toBe(
      "Applies to decked vessels under 12 m.",
    );
    expect(withoutNote.applicabilityNote).toBeNull();
  });
});

describe("retrieveSafetyContext", () => {
  const engineRecord = makeRecord({
    id: "sk-engine-a",
    riskConcepts: ["ENGINE_RELIABILITY"],
    retrievalPriority: 1,
    authority: "FAO",
  });
  const waveRecord = makeRecord({
    id: "sk-wave-a",
    riskConcepts: ["WAVE_CONDITIONS"],
    retrievalPriority: 1,
    authority: "IMO",
  });
  const dualRecord = makeRecord({
    id: "sk-dual-a",
    riskConcepts: ["ENGINE_RELIABILITY", "WAVE_CONDITIONS"],
    retrievalPriority: 2,
    authority: "FAO_ILO_IMO",
  });

  it("retrieves a record on exact concept match", () => {
    const result = retrieveSafetyContext({
      riskConcepts: ["ENGINE_RELIABILITY"],
      knowledge: [engineRecord, waveRecord],
    });
    expect(result.records).toHaveLength(1);
    expect(result.records[0]?.id).toBe("sk-engine-a");
  });

  it("does not retrieve a record for nonmatching concept", () => {
    const result = retrieveSafetyContext({
      riskConcepts: ["HULL_INTEGRITY"],
      knowledge: [engineRecord],
    });
    expect(result.records).toHaveLength(0);
  });

  it("ranks records with more matching concepts higher", () => {
    const result = retrieveSafetyContext({
      riskConcepts: ["ENGINE_RELIABILITY", "WAVE_CONDITIONS"],
      knowledge: [engineRecord, waveRecord, dualRecord],
    });
    expect(result.records[0]?.id).toBe("sk-dual-a");
  });

  it("uses retrievalPriority for tie ordering", () => {
    const highPriority = makeRecord({
      id: "sk-priority-1",
      riskConcepts: ["ENGINE_RELIABILITY"],
      retrievalPriority: 1,
    });
    const lowPriority = makeRecord({
      id: "sk-priority-2",
      riskConcepts: ["ENGINE_RELIABILITY"],
      retrievalPriority: 3,
    });
    const result = retrieveSafetyContext({
      riskConcepts: ["ENGINE_RELIABILITY"],
      knowledge: [lowPriority, highPriority],
    });
    expect(result.records[0]?.id).toBe("sk-priority-1");
  });

  it("uses record ID for final deterministic tie ordering", () => {
    const recordB = makeRecord({
      id: "sk-b",
      riskConcepts: ["ENGINE_RELIABILITY"],
      retrievalPriority: 1,
      authority: "FAO",
    });
    const recordA = makeRecord({
      id: "sk-a",
      riskConcepts: ["ENGINE_RELIABILITY"],
      retrievalPriority: 1,
      authority: "FAO",
    });
    const result = retrieveSafetyContext({
      riskConcepts: ["ENGINE_RELIABILITY"],
      knowledge: [recordB, recordA],
    });
    expect(result.records[0]?.id).toBe("sk-a");
  });

  it("does not duplicate records for duplicate requested concepts", () => {
    const result = retrieveSafetyContext({
      riskConcepts: [
        "ENGINE_RELIABILITY",
        "ENGINE_RELIABILITY",
        "WAVE_CONDITIONS",
      ],
      knowledge: [engineRecord],
    });
    expect(result.records).toHaveLength(1);
    expect(result.requestedConcepts).toEqual([
      "ENGINE_RELIABILITY",
      "WAVE_CONDITIONS",
    ]);
  });

  it("returns empty result for empty requested concept list", () => {
    const result = retrieveSafetyContext({
      riskConcepts: [],
      knowledge: [engineRecord],
    });
    expect(result.records).toHaveLength(0);
    expect(result.requestedConcepts).toEqual([]);
  });

  it("returns zero records when no matches exist", () => {
    const result = retrieveSafetyContext({
      riskConcepts: ["OFFICIAL_ALERT"],
      knowledge: [engineRecord],
    });
    expect(result.records).toHaveLength(0);
  });

  it("exposes unmatched concepts as ungrounded", () => {
    const result = retrieveSafetyContext({
      riskConcepts: ["ENGINE_RELIABILITY", "WAVE_CONDITIONS"],
      knowledge: [engineRecord],
    });
    expect(result.ungroundedConcepts).toEqual(["WAVE_CONDITIONS"]);
  });

  it("exposes matched concepts in groundedConcepts", () => {
    const result = retrieveSafetyContext({
      riskConcepts: ["ENGINE_RELIABILITY", "WAVE_CONDITIONS"],
      knowledge: [engineRecord],
    });
    expect(result.groundedConcepts).toEqual(["ENGINE_RELIABILITY"]);
  });

  it("defaults retrieval limit to 5", () => {
    const knowledge = Array.from({ length: 8 }, (_, index) =>
      makeRecord({
        id: `sk-limit-${index}`,
        riskConcepts: ["ENGINE_RELIABILITY"],
        retrievalPriority: index + 1,
      }),
    );
    const result = retrieveSafetyContext({
      riskConcepts: ["ENGINE_RELIABILITY"],
      knowledge,
    });
    expect(result.records).toHaveLength(DEFAULT_RETRIEVAL_LIMIT);
  });

  it("honours explicit positive retrieval limit", () => {
    const knowledge = Array.from({ length: 5 }, (_, index) =>
      makeRecord({
        id: `sk-explicit-${index}`,
        riskConcepts: ["ENGINE_RELIABILITY"],
        retrievalPriority: index + 1,
      }),
    );
    const result = retrieveSafetyContext({
      riskConcepts: ["ENGINE_RELIABILITY"],
      knowledge,
      limit: 2,
    });
    expect(result.records).toHaveLength(2);
  });

  it("rejects zero retrieval limit", () => {
    expect(() =>
      retrieveSafetyContext({
        riskConcepts: ["ENGINE_RELIABILITY"],
        knowledge: [engineRecord],
        limit: 0,
      }),
    ).toThrow(InvalidRetrievalLimitError);
  });

  it("rejects negative retrieval limit", () => {
    expect(() =>
      retrieveSafetyContext({
        riskConcepts: ["ENGINE_RELIABILITY"],
        knowledge: [engineRecord],
        limit: -1,
      }),
    ).toThrow(InvalidRetrievalLimitError);
  });

  it("rejects non-integer retrieval limit", () => {
    expect(() =>
      retrieveSafetyContext({
        riskConcepts: ["ENGINE_RELIABILITY"],
        knowledge: [engineRecord],
        limit: 2.5,
      }),
    ).toThrow(InvalidRetrievalLimitError);
  });
});

describe("deriveSafetyRetrievalConcepts", () => {
  const s003Deltas = calculateRiskDeltas(
    S003_ENGINE_WAVE_DETERIORATION.previousState,
    S003_ENGINE_WAVE_DETERIORATION.currentState,
  );
  const s003Reassessment = evaluateReassessmentNeed(
    s003Deltas,
    S003_ENGINE_WAVE_DETERIORATION.currentState.activeConcerns,
  );
  const s003Input = buildRiskInterpretationInput(
    S003_ENGINE_WAVE_DETERIORATION.currentState,
    s003Deltas,
    s003Reassessment,
    INITIAL_SAFETY_KNOWLEDGE,
  );

  it("includes reassessment trigger concepts", () => {
    const concepts = deriveSafetyRetrievalConcepts({
      reassessmentDecision: {
        triggerConcepts: ["WAVE_CONDITIONS"],
      },
      calculatedDeltas: [],
      activeConcerns: [],
    });
    expect(concepts).toContain("WAVE_CONDITIONS");
  });

  it("includes active concern concepts", () => {
    const concepts = deriveSafetyRetrievalConcepts({
      reassessmentDecision: { triggerConcepts: [] },
      calculatedDeltas: [],
      activeConcerns: [
        {
          concept: "ENGINE_RELIABILITY",
          status: "OPEN",
        },
      ],
    });
    expect(concepts).toContain("ENGINE_RELIABILITY");
  });

  it("includes concepts from reassessment-relevant deltas", () => {
    const concepts = deriveSafetyRetrievalConcepts({
      reassessmentDecision: { triggerConcepts: [] },
      calculatedDeltas: [
        {
          concept: "WAVE_CONDITIONS",
          reassessmentRelevant: true,
        },
      ],
      activeConcerns: [],
    });
    expect(concepts).toContain("WAVE_CONDITIONS");
  });

  it("does not add WIND_CONDITIONS from non-relevant S003 wind delta alone", () => {
    const concepts = deriveSafetyRetrievalConcepts(s003Input);
    expect(concepts).not.toContain("WIND_CONDITIONS");
  });

  it("deduplicates derived concepts", () => {
    const concepts = deriveSafetyRetrievalConcepts(s003Input);
    expect(new Set(concepts).size).toBe(concepts.length);
  });

  it("orders derived concepts deterministically", () => {
    const concepts = deriveSafetyRetrievalConcepts(s003Input);
    expect(concepts).toEqual(["ENGINE_RELIABILITY", "WAVE_CONDITIONS"]);
  });

  it("includes ENGINE_RELIABILITY for S003", () => {
    expect(deriveSafetyRetrievalConcepts(s003Input)).toContain(
      "ENGINE_RELIABILITY",
    );
  });

  it("includes WAVE_CONDITIONS for S003", () => {
    expect(deriveSafetyRetrievalConcepts(s003Input)).toContain(
      "WAVE_CONDITIONS",
    );
  });
});

describe("S003 retrieval with initial corpus", () => {
  const deltas = calculateRiskDeltas(
    S003_ENGINE_WAVE_DETERIORATION.previousState,
    S003_ENGINE_WAVE_DETERIORATION.currentState,
  );
  const reassessment = evaluateReassessmentNeed(
    deltas,
    S003_ENGINE_WAVE_DETERIORATION.currentState.activeConcerns,
  );
  const input = buildRiskInterpretationInput(
    S003_ENGINE_WAVE_DETERIORATION.currentState,
    deltas,
    reassessment,
    INITIAL_SAFETY_KNOWLEDGE,
  );
  const concepts = deriveSafetyRetrievalConcepts(input);
  const retrieval = retrieveSafetyContext({
    riskConcepts: concepts,
    knowledge: INITIAL_SAFETY_KNOWLEDGE,
  });

  it("requests ENGINE_RELIABILITY and WAVE_CONDITIONS", () => {
    expect(retrieval.requestedConcepts).toEqual([
      "ENGINE_RELIABILITY",
      "WAVE_CONDITIONS",
    ]);
  });

  it("grounds ENGINE_RELIABILITY from corpus", () => {
    expect(retrieval.groundedConcepts).toContain("ENGINE_RELIABILITY");
  });

  it("grounds WAVE_CONDITIONS from INCOIS corpus record", () => {
    expect(retrieval.groundedConcepts).toContain("WAVE_CONDITIONS");
    expect(retrieval.ungroundedConcepts).not.toContain("WAVE_CONDITIONS");
  });

  it("retrieves INCOIS wave context without treating it as a safety threshold", () => {
    const waveRecord = retrieval.records.find(
      (record) => record.id === "sk-incois-wave-context-001",
    );
    expect(waveRecord).toBeDefined();
    expect(waveRecord?.applicabilityNote).toContain(
      "does not define an AAZHI vessel-safety or danger threshold",
    );
  });

  it("retrieves at least one ENGINE_RELIABILITY record", () => {
    expect(retrieval.records.length).toBeGreaterThanOrEqual(1);
    expect(
      retrieval.records.some((record) =>
        record.riskConcepts.includes("ENGINE_RELIABILITY"),
      ),
    ).toBe(true);
  });

  it("includes applicabilityNote on retrieved safetyContext records", () => {
    expect(input.safetyContext.length).toBeGreaterThanOrEqual(1);
    for (const record of input.safetyContext) {
      expect(record).toHaveProperty("applicabilityNote");
    }
    const engineRecord = input.safetyContext.find(
      (record) => record.id === "sk-fao-ilo-imo-engine-001",
    );
    expect(engineRecord?.applicabilityNote).toContain("12 m");
  });
});

describe("initial safety corpus quality", () => {
  const OFFICIAL_SOURCE_PATTERNS = [
    /^https:\/\/www\.fao\.org\//,
    /^https:\/\/openknowledge\.fao\.org\//,
    /^https:\/\/incois\.gov\.in\//,
  ];

  it("uses CURATED_PARAPHRASE for all seed records", () => {
    for (const record of INITIAL_SAFETY_KNOWLEDGE) {
      expect(record.contentRepresentation).toBe("CURATED_PARAPHRASE");
      expect(record.contentRepresentation).not.toBe("VERBATIM_EXCERPT");
    }
  });

  it("does not include removed ILO C188 seed record", () => {
    expect(
      INITIAL_SAFETY_KNOWLEDGE.some(
        (record) => record.id === "sk-ilo-fishing-convention-001",
      ),
    ).toBe(false);
  });

  it("does not include removed INCOIS PRIMARY_COMMUNICATION record", () => {
    expect(
      INITIAL_SAFETY_KNOWLEDGE.some(
        (record) => record.id === "sk-incois-maritime-services-001",
      ),
    ).toBe(false);
    expect(
      INITIAL_SAFETY_KNOWLEDGE.filter((record) =>
        record.riskConcepts.includes("PRIMARY_COMMUNICATION"),
      ).every((record) => record.authority !== "INCOIS"),
    ).toBe(true);
  });

  it("includes INCOIS wave conditions record", () => {
    const waveRecord = INITIAL_SAFETY_KNOWLEDGE.find(
      (record) => record.id === "sk-incois-wave-context-001",
    );
    expect(waveRecord).toBeDefined();
    expect(waveRecord?.riskConcepts).toEqual(["WAVE_CONDITIONS"]);
  });

  it("uses official source families for all seed records", () => {
    for (const record of INITIAL_SAFETY_KNOWLEDGE) {
      const isOfficial = OFFICIAL_SOURCE_PATTERNS.some((pattern) =>
        pattern.test(record.sourceUrl),
      );
      expect(isOfficial, record.id).toBe(true);
    }
  });

  it("includes applicabilityNote on every seed record", () => {
    for (const record of INITIAL_SAFETY_KNOWLEDGE) {
      expect(record.applicabilityNote).not.toBeNull();
      expect(record.applicabilityNote!.trim().length).toBeGreaterThan(0);
    }
  });

  it("covers required Phase 6 concept mappings", () => {
    const concepts = new Set<RiskConcept>();
    for (const record of INITIAL_SAFETY_KNOWLEDGE) {
      for (const concept of record.riskConcepts) {
        concepts.add(concept);
      }
    }
    expect(concepts.has("ENGINE_RELIABILITY")).toBe(true);
    expect(concepts.has("PRIMARY_COMMUNICATION")).toBe(true);
    expect(concepts.has("COMMUNICATION_REDUNDANCY")).toBe(true);
    expect(concepts.has("SAFETY_EQUIPMENT")).toBe(true);
    expect(concepts.has("VESSEL_STABILITY")).toBe(true);
  });
});

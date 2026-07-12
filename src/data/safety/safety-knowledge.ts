/**
 * Initial curated MVP safety knowledge corpus for retrieval architecture evaluation.
 *
 * This is not a comprehensive maritime safety corpus and does not establish
 * jurisdiction-specific legal requirements. Content uses CURATED_PARAPHRASE only.
 */
import type { SafetyKnowledgeRecord } from "@/domain/safety";

const VOLUNTARY_GUIDELINES_APPLICABILITY =
  "These Voluntary Guidelines are primarily directed at decked fishing vessels of 12 m in length and over but less than 24 m; competent authorities adapt provisions to local vessel types and operations.";

const VOLUNTARY_GUIDELINES_URL =
  "https://www.fao.org/fishery/static/voluntary_guidelines_design_construction_equipment_small_fishing_vessels/en/";

const VOLUNTARY_GUIDELINES_TITLE =
  "Voluntary Guidelines for the Design, Construction and Equipment of Small Fishing Vessels";

export const INITIAL_SAFETY_KNOWLEDGE: readonly SafetyKnowledgeRecord[] = [
  {
    id: "sk-fao-ilo-imo-engine-001",
    authority: "FAO_ILO_IMO",
    documentTitle: VOLUNTARY_GUIDELINES_TITLE,
    jurisdiction: "International",
    section: "Chapter 4 — Machinery and electrical installations",
    riskConcepts: ["ENGINE_RELIABILITY"],
    content:
      "Machinery and electrical installations are explicitly addressed as a small-fishing-vessel safety area in the joint FAO/ILO/IMO guidance.",
    contentRepresentation: "CURATED_PARAPHRASE",
    sourceUrl: VOLUNTARY_GUIDELINES_URL,
    sourceLocator:
      "Voluntary Guidelines — Chapter 4 Machinery and electrical installations",
    version: null,
    effectiveDate: null,
    retrievalPriority: 1,
    applicabilityNote: VOLUNTARY_GUIDELINES_APPLICABILITY,
  },
  {
    id: "sk-fao-ilo-imo-primary-comm-001",
    authority: "FAO_ILO_IMO",
    documentTitle:
      "Safety recommendations for decked fishing vessels of less than 12 metres in length and undecked fishing vessels",
    jurisdiction: "International",
    section: "Chapter 9 — Radio communications",
    riskConcepts: ["PRIMARY_COMMUNICATION"],
    content:
      "The joint small-fishing-vessel safety recommendations address radio installations used for distress, safety and general communications within their stated vessel scope.",
    contentRepresentation: "CURATED_PARAPHRASE",
    sourceUrl: "https://www.fao.org/4/i3108e/i3108e00.htm",
    sourceLocator:
      "Safety Recommendations — Chapter 9 Radio communications",
    version: null,
    effectiveDate: null,
    retrievalPriority: 1,
    applicabilityNote:
      "Unless otherwise stated, provisions apply to new decked fishing vessels of less than 12 m in length and new undecked vessels intended to operate at sea; they are guidance, not substitutes for national laws.",
  },
  {
    id: "sk-fao-comm-redundancy-001",
    authority: "FAO",
    documentTitle: "Communication | Fishing Safety",
    jurisdiction: "International",
    section: "Communication",
    riskConcepts: ["COMMUNICATION_REDUNDANCY", "PRIMARY_COMMUNICATION"],
    content:
      "FAO fishing-safety communication guidance emphasizes contact with other vessels and shore and describes radio communication alongside other internationally accepted emergency signalling means.",
    contentRepresentation: "CURATED_PARAPHRASE",
    sourceUrl:
      "https://www.fao.org/fishing-safety/risk-management/communication/en/",
    sourceLocator: "Fishing Safety — Communication",
    version: null,
    effectiveDate: null,
    retrievalPriority: 2,
    applicabilityNote:
      "This concept mapping represents communication preparedness context from FAO fishing-safety guidance; it does not assert a universal mandate for a second radio or duplicate equipment.",
  },
  {
    id: "sk-fao-safety-equipment-001",
    authority: "FAO",
    documentTitle: "Safety at sea for small-scale fishers",
    jurisdiction: "International",
    section: "Safety preparedness",
    riskConcepts: ["SAFETY_EQUIPMENT"],
    content:
      "FAO small-scale fisher safety guidance includes lifesaving equipment and checks or procedures performed before a fishing trip as part of safety preparedness.",
    contentRepresentation: "CURATED_PARAPHRASE",
    sourceUrl:
      "https://openknowledge.fao.org/items/595fa739-a4cb-47dd-b2cf-493d9e47fab6",
    sourceLocator: "Safety at sea for small-scale fishers — safety preparedness",
    version: null,
    effectiveDate: null,
    retrievalPriority: 1,
    applicabilityNote:
      "Practical safety awareness guidance for small-scale fishers; not a substitute for national laws, flag-state requirements, or formal vessel inspection regimes.",
  },
  {
    id: "sk-fao-ilo-imo-stability-001",
    authority: "FAO_ILO_IMO",
    documentTitle: VOLUNTARY_GUIDELINES_TITLE,
    jurisdiction: "International",
    section: "Chapter 3 — Stability and associated seaworthiness",
    riskConcepts: ["VESSEL_STABILITY"],
    content:
      "Stability and associated seaworthiness are explicitly addressed as a dedicated safety area in the small-fishing-vessel guidance.",
    contentRepresentation: "CURATED_PARAPHRASE",
    sourceUrl: VOLUNTARY_GUIDELINES_URL,
    sourceLocator:
      "Voluntary Guidelines — Chapter 3 Stability and associated seaworthiness",
    version: null,
    effectiveDate: null,
    retrievalPriority: 1,
    applicabilityNote: VOLUNTARY_GUIDELINES_APPLICABILITY,
  },
  {
    id: "sk-fao-hull-integrity-001",
    authority: "FAO_ILO_IMO",
    documentTitle: VOLUNTARY_GUIDELINES_TITLE,
    jurisdiction: "International",
    section: "Chapter 2 — Construction, watertight integrity and equipment",
    riskConcepts: ["HULL_INTEGRITY"],
    content:
      "Construction and watertight integrity are explicitly addressed within small-fishing-vessel safety guidance.",
    contentRepresentation: "CURATED_PARAPHRASE",
    sourceUrl: VOLUNTARY_GUIDELINES_URL,
    sourceLocator:
      "Voluntary Guidelines — Chapter 2 Construction, watertight integrity and equipment",
    version: null,
    effectiveDate: null,
    retrievalPriority: 2,
    applicabilityNote: VOLUNTARY_GUIDELINES_APPLICABILITY,
  },
  {
    id: "sk-incois-wave-context-001",
    authority: "INCOIS",
    documentTitle: "Ocean State Forecast",
    jurisdiction: "India",
    section: "Parameters Description",
    riskConcepts: ["WAVE_CONDITIONS"],
    content:
      "INCOIS Ocean State Forecast services represent significant wave height and mean wave period as marine environmental parameters used to describe ocean state.",
    contentRepresentation: "CURATED_PARAPHRASE",
    sourceUrl: "https://incois.gov.in/site/services/osf.jsp",
    sourceLocator: "Ocean State Forecast — Parameters Description",
    version: null,
    effectiveDate: null,
    retrievalPriority: 1,
    applicabilityNote:
      "Environmental forecast context from INCOIS; this record does not define an AAZHI vessel-safety or danger threshold.",
  },
] as const;

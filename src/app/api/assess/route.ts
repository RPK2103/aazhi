import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getLocation } from "@/lib/locations";
import { fetchMarineContext, MarineContextError } from "@/lib/marine";
import {
  AssessmentGenerationError,
  generateAssessment,
} from "@/lib/gemini";
import {
  assessmentInputSchema,
  hasFieldObservation,
  MAX_ASSESSMENT_MULTIPART_BYTES,
  parseContentLengthHeader,
  validateAssessmentFormData,
  validateUploadMetadata,
} from "@/lib/validation";

export const runtime = "nodejs";

class UploadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

class AssessmentRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function optionalFile(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : undefined;
}

function validateUpload(
  file: File | undefined,
  kind: "audio" | "image",
) {
  if (!file) return undefined;

  const validation = validateUploadMetadata(kind, file.type, file.size);
  if (!validation.valid && validation.reason === "unsupported-type") {
    throw new UploadError(`Unsupported ${kind} file type.`, 415);
  }
  if (!validation.valid) {
    throw new UploadError(
      `${kind === "audio" ? "Audio" : "Image"} file is too large.`,
      413,
    );
  }

  return { file, mimeType: validation.mimeType };
}

async function toInlineData(upload: ReturnType<typeof validateUpload>) {
  if (!upload) return undefined;
  const bytes = await upload.file.arrayBuffer();
  return {
    data: Buffer.from(bytes).toString("base64"),
    mimeType: upload.mimeType,
  };
}

function rejectOversizedBody(request: Request) {
  const contentLength = parseContentLengthHeader(
    request.headers.get("content-length"),
  );
  if (
    contentLength !== null &&
    contentLength > MAX_ASSESSMENT_MULTIPART_BYTES
  ) {
    throw new AssessmentRequestError(
      "The assessment request is too large.",
      413,
    );
  }
}

export async function POST(request: Request) {
  try {
    rejectOversizedBody(request);

    const formData = await request.formData();
    const formValidation = validateAssessmentFormData(formData);
    if (!formValidation.valid) {
      throw new AssessmentRequestError(
        "Check the form fields and try again.",
        400,
      );
    }

    const input = assessmentInputSchema.parse({
      location: formValidation.scalars.location,
      boatType: formValidation.scalars.boatType,
      crewCount: formValidation.scalars.crewCount,
      tripDuration: formValidation.scalars.tripDuration,
      language: formValidation.scalars.language,
      typedObservation: formValidation.scalars.typedObservation ?? "",
    });

    const audio = validateUpload(
      optionalFile(formValidation.files.audio),
      "audio",
    );
    const image = validateUpload(
      optionalFile(formValidation.files.image),
      "image",
    );

    if (
      !hasFieldObservation({
        typedObservation: input.typedObservation,
        hasAudio: Boolean(audio),
      })
    ) {
      return NextResponse.json(
        { error: "Add a typed or spoken field observation." },
        { status: 400 },
      );
    }

    const location = getLocation(input.location);
    if (!location) {
      return NextResponse.json(
        { error: "Select a supported coastal location." },
        { status: 400 },
      );
    }

    const marineContext = await fetchMarineContext(
      location.latitude,
      location.longitude,
    );
    const [audioInline, imageInline] = await Promise.all([
      toInlineData(audio),
      toInlineData(image),
    ]);
    const assessment = await generateAssessment({
      locationName: location.name,
      boatType: input.boatType,
      crewCount: input.crewCount,
      tripDuration: input.tripDuration,
      language: input.language,
      typedObservation: input.typedObservation,
      marineContext,
      audio: audioInline,
      image: imageInline,
    });

    return NextResponse.json({ assessment, marineContext });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Check the form fields and try again." },
        { status: 400 },
      );
    }
    if (error instanceof AssessmentRequestError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof UploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof MarineContextError) {
      return NextResponse.json(
        { error: error.message },
        { status: 503 },
      );
    }
    if (error instanceof AssessmentGenerationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "The assessment could not be completed." },
      { status: 500 },
    );
  }
}

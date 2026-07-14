"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { AssessmentResult } from "@/components/assessment-result";
import { COASTAL_LOCATIONS } from "@/lib/locations";
import { BOAT_TYPES, LANGUAGES, type AssessmentResponse } from "@/lib/types";
import {
  MAX_AUDIO_BYTES,
  validateUploadMetadata,
} from "@/lib/validation";

const RECORDING_LIMIT_SECONDS = 30;

function isAssessmentResponse(value: unknown): value is AssessmentResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AssessmentResponse>;
  return Boolean(
    candidate.assessment &&
      typeof candidate.assessment.actionPosture === "string" &&
      Array.isArray(candidate.assessment.departureBlockers) &&
      candidate.marineContext &&
      candidate.marineContext.source === "Open-Meteo Marine Forecast",
  );
}

export function FisherIntake() {
  const [typedObservation, setTypedObservation] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [micMessage, setMicMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AssessmentResponse | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const intakeRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);

  function scrollToElement(element: HTMLElement | null) {
    if (!element) return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    element.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  function clearRecordingTimers() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    intervalRef.current = null;
    timeoutRef.current = null;
  }

  function releaseMicrophone() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
    clearRecordingTimers();
    releaseMicrophone();
    setIsRecording(false);
  }

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") recorder.stop();
      clearRecordingTimers();
      releaseMicrophone();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  useEffect(() => {
    if (!result) return;
    const frame = requestAnimationFrame(() => scrollToElement(resultRef.current));
    return () => cancelAnimationFrame(frame);
  }, [result]);

  async function startRecording() {
    setMicMessage("");
    setError("");
    setAudioFile(null);

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setMicMessage(
        "Microphone recording is unavailable. Type your observation below.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeCandidates = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];
      const mimeType = mimeCandidates.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size > 0 && blob.size <= MAX_AUDIO_BYTES) {
          setAudioFile(
            new File([blob], "field-observation", { type: blob.type }),
          );
          setMicMessage("Spoken observation ready. It will be sent on submit.");
        } else if (blob.size > MAX_AUDIO_BYTES) {
          setMicMessage("Recording is too large. Type your observation below.");
        }
        recorderRef.current = null;
        releaseMicrophone();
      };

      recorderRef.current = recorder;
      recorder.start(500);
      const startedAt = Date.now();
      setElapsedSeconds(0);
      setIsRecording(true);
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(
          Math.min(
            RECORDING_LIMIT_SECONDS,
            Math.floor((Date.now() - startedAt) / 1000),
          ),
        );
      }, 250);
      timeoutRef.current = setTimeout(stopRecording, RECORDING_LIMIT_SECONDS * 1000);
    } catch {
      releaseMicrophone();
      setIsRecording(false);
      setMicMessage(
        "Microphone access was unavailable. Type your observation below.",
      );
    }
  }

  function removeAudio() {
    setAudioFile(null);
    setElapsedSeconds(0);
    setMicMessage("");
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError("");
    if (!file) return;

    const validation = validateUploadMetadata("image", file.type, file.size);
    if (!validation.valid && validation.reason === "unsupported-type") {
      setError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (!validation.valid) {
      setError("Image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!typedObservation.trim() && !audioFile) {
      setError("Speak or type what you are seeing at sea today.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("typedObservation", typedObservation);
    if (audioFile) formData.set("audio", audioFile);
    if (imageFile) formData.set("image", imageFile);

    setIsLoading(true);
    try {
      const response = await fetch("/api/assess", {
        method: "POST",
        body: formData,
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "The assessment could not be completed.";
        throw new Error(message);
      }
      if (!isAssessmentResponse(payload)) {
        throw new Error("The server returned an incomplete readiness brief.");
      }

      setResult(payload);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "The assessment could not be completed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function resetAssessment() {
    setResult(null);
    setTypedObservation("");
    removeAudio();
    removeImage();
    formRef.current?.reset();
    setError("");
    requestAnimationFrame(() => scrollToElement(intakeRef.current));
  }

  const recordingAction = isRecording
    ? "Stop recording"
    : audioFile
      ? "Re-record observation"
      : "Start recording";

  return (
    <>
      <div ref={intakeRef} className="intake-workflow">
        <div className="prompt-block">
          <p className="eyebrow">PROMPT</p>
          <h2 id="intake-title">What are you seeing at sea today?</h2>
        </div>

        <form
          ref={formRef}
          className="intake-form"
          aria-labelledby="intake-title"
          onSubmit={handleSubmit}
        >
          <div className="intake-card-grid">
            <section className="intake-card speak-card">
              <header className="card-heading">
                <p className="card-index">01 SPEAK</p>
                <h3>Tell AAZHI what you&apos;re seeing</h3>
              </header>

              <div className="mic-stage">
                <button
                  className={`mic-button${isRecording ? " is-recording" : ""}`}
                  type="button"
                  aria-label={recordingAction}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="28"
                    height="28"
                    fill="none"
                  >
                    <path
                      d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 1 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M5.5 11.5v.5a6.5 6.5 0 0 0 13 0v-.5M12 18.5V22M9 22h6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>{recordingAction.toUpperCase()}</span>
                </button>
                <p className="recording-state" aria-live="polite">
                  {isRecording
                    ? `Recording · ${elapsedSeconds}s / ${RECORDING_LIMIT_SECONDS}s`
                    : audioFile
                      ? "Spoken observation ready"
                      : "Max 30 seconds"}
                </p>
                {audioFile && !isRecording && (
                  <button
                    className="text-button"
                    type="button"
                    onClick={removeAudio}
                  >
                    Remove recording
                  </button>
                )}
              </div>

              {micMessage && (
                <p className="inline-message" role="status">
                  {micMessage}
                </p>
              )}

              <div className="card-divider">
                <span>OR TYPE OBSERVATION</span>
              </div>
              <div className="field observation-field">
                <label htmlFor="typedObservation">Typed observation</label>
                <textarea
                  id="typedObservation"
                  name="typedObservation"
                  maxLength={1500}
                  rows={5}
                  value={typedObservation}
                  onChange={(event) => setTypedObservation(event.target.value)}
                  placeholder="Describe what you are seeing, hearing, or noticing about the sea or vessel..."
                />
                <span className="character-count">
                  {typedObservation.length} / 1500
                </span>
              </div>
            </section>

            <section className="intake-card show-card">
              <header className="card-heading">
                <p className="card-index">02 SHOW</p>
                <h3>Show what you&apos;re seeing</h3>
              </header>

              <div className="upload-shell">
                <input
                  ref={imageInputRef}
                  id="image"
                  className="upload-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-describedby="image-boundary"
                  onChange={handleImage}
                />
                <label className="upload-zone" htmlFor="image">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="36"
                    height="36"
                    fill="none"
                  >
                    <path
                      d="M4 7.5A1.5 1.5 0 0 1 5.5 6h3l1.2-1.5h4.6L15.5 6h3A1.5 1.5 0 0 1 20 7.5v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-10Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx="12"
                      cy="12.5"
                      r="3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                  <strong>ADD VISIBLE CONTEXT</strong>
                  <small>JPEG, PNG or WebP · max 5 MB</small>
                </label>
              </div>

              {imagePreview && (
                <div className="image-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Selected situational context preview"
                  />
                  <div className="preview-actions">
                    <span>{imageFile?.name}</span>
                    <button
                      className="text-button"
                      type="button"
                      onClick={removeImage}
                    >
                      Remove image
                    </button>
                  </div>
                </div>
              )}

              <p id="image-boundary" className="context-boundary">
                Visible context only — AAZHI does not measure wave height from
                images.
              </p>
            </section>

            <section className="intake-card trip-card">
              <header className="card-heading">
                <p className="card-index">03 TRIP</p>
                <h3>Vessel &amp; trip context</h3>
              </header>

              <div className="trip-fields">
                <div className="field trip-field-wide">
                  <label htmlFor="location">Coastal location</label>
                  <select id="location" name="location" defaultValue="" required>
                    <option value="" disabled>
                      Select location
                    </option>
                    {COASTAL_LOCATIONS.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field trip-field-wide">
                  <label htmlFor="boatType">Boat type</label>
                  <select id="boatType" name="boatType" defaultValue="" required>
                    <option value="" disabled>
                      Select boat type
                    </option>
                    {BOAT_TYPES.map((boatType) => (
                      <option key={boatType} value={boatType}>
                        {boatType}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="crewCount">Crew count</label>
                  <input
                    id="crewCount"
                    name="crewCount"
                    type="number"
                    min="1"
                    max="30"
                    step="1"
                    inputMode="numeric"
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="tripDuration">Trip duration (hours)</label>
                  <input
                    id="tripDuration"
                    name="tripDuration"
                    type="number"
                    min="0.5"
                    max="72"
                    step="0.5"
                    inputMode="decimal"
                    required
                  />
                </div>

                <fieldset className="language-field trip-field-wide">
                  <legend>Output language</legend>
                  <div className="language-options">
                    {LANGUAGES.map((language) => (
                      <label key={language}>
                        <input
                          type="radio"
                          name="language"
                          value={language}
                          defaultChecked={language === "English"}
                        />
                        <span>{language === "Tamil" ? "தமிழ்" : language}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            </section>
          </div>

          <div className="form-actions">
            <div aria-live="assertive">
              {error && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
            </div>
            <button
              className="primary-button"
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading
                ? "RECONCILING FIELD AND MARINE CONTEXT…"
                : "ASSESS DEPARTURE READINESS"}
            </button>
            <p className="loading-status" aria-live="polite">
              {isLoading ? "Reconciling field and marine context…" : ""}
            </p>
            <p className="disclaimer">
              AAZHI provides preparedness and readiness assistance, not official
              maritime clearance. Follow local and maritime authority
              instructions.
            </p>
          </div>
        </form>
      </div>

      <p className="sr-only" aria-live="polite">
        {result ? "Assessment complete. Readiness brief follows." : ""}
      </p>
      {result && (
        <section
          ref={resultRef}
          className="result-region"
          aria-labelledby="result-region-title"
        >
          <h2 id="result-region-title" className="sr-only">
            Departure readiness brief
          </h2>
          <AssessmentResult result={result} onReset={resetAssessment} />
        </section>
      )}
    </>
  );
}

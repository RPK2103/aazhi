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
  IMAGE_MIME_TYPES,
  MAX_AUDIO_BYTES,
  MAX_IMAGE_BYTES,
  normalizeMimeType,
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

    const mime = normalizeMimeType(file.type);
    if (!IMAGE_MIME_TYPES.some((allowed) => allowed === mime)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
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
      window.scrollTo({ top: 0, behavior: "smooth" });
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
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (result) {
    return <AssessmentResult result={result} onReset={resetAssessment} />;
  }

  return (
    <form className="intake-form" onSubmit={handleSubmit}>
      <section className="form-section">
        <div className="section-heading">
          <p className="eyebrow">FIELD OBSERVATION</p>
          <h1>What are you seeing at sea today?</h1>
        </div>

        <div className="field">
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

        <div className="input-panel">
          <div>
            <p className="field-label">SPEAK</p>
            <p className="field-help">
              Describe local sea conditions and anything affecting boat, crew,
              or communication readiness.
            </p>
          </div>
          <div className="recording-controls">
            {!isRecording ? (
              <button
                className="record-button"
                type="button"
                onClick={startRecording}
              >
                {audioFile ? "RE-RECORD" : "START RECORDING"}
              </button>
            ) : (
              <button className="stop-button" type="button" onClick={stopRecording}>
                STOP RECORDING
              </button>
            )}
            {isRecording && (
              <span className="recording-state" aria-live="polite">
                Recording · {elapsedSeconds}s / {RECORDING_LIMIT_SECONDS}s
              </span>
            )}
            {audioFile && !isRecording && (
              <button className="text-button" type="button" onClick={removeAudio}>
                Remove recording
              </button>
            )}
          </div>
          {micMessage && (
            <p className="inline-message" role="status">
              {micMessage}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="typedObservation">Typed observation fallback</label>
          <textarea
            id="typedObservation"
            name="typedObservation"
            maxLength={1500}
            rows={5}
            value={typedObservation}
            onChange={(event) => setTypedObservation(event.target.value)}
            placeholder="Type what you see and any boat, crew, or communication concerns…"
          />
          <span className="character-count">
            {typedObservation.length} / 1500
          </span>
        </div>

        <div className="input-panel">
          <div>
            <label className="field-label" htmlFor="image">
              SHOW
            </label>
            <p className="field-help">
              Optional visible context. AAZHI does not measure wave height from
              images.
            </p>
          </div>
          <input
            ref={imageInputRef}
            id="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImage}
          />
          {imagePreview && (
            <div className="image-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Selected situational context preview" />
              <button className="text-button" type="button" onClick={removeImage}>
                Remove image
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="form-section">
        <div className="section-heading">
          <p className="eyebrow">TRIP CONTEXT</p>
          <h2>Readiness and exposure</h2>
        </div>
        <div className="field-grid">
          <div className="field field-wide">
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
            <label htmlFor="tripDuration">Planned trip duration (hours)</label>
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
          <fieldset className="language-field field-wide">
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

      <div className="form-actions">
        <p className="disclaimer">
          AAZHI provides preparedness and readiness assistance, not official
          maritime clearance. Follow local and maritime authority instructions.
        </p>
        <div aria-live="assertive">
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </div>
        <button className="primary-button" type="submit" disabled={isLoading}>
          {isLoading
            ? "RECONCILING FIELD AND MARINE CONTEXT…"
            : "ASSESS DEPARTURE READINESS"}
        </button>
        <p className="loading-status" aria-live="polite">
          {isLoading ? "Reconciling field and marine context…" : ""}
        </p>
      </div>
    </form>
  );
}

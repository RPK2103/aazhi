"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { COASTAL_LOCATIONS, getLocation } from "@/lib/locations";
import {
  BOAT_TYPES,
  LANGUAGES,
  type AssessmentResponse,
} from "@/lib/types";
import {
  MAX_AUDIO_BYTES,
  validateUploadMetadata,
} from "@/lib/validation";

const RECORDING_LIMIT_SECONDS = 30;

export interface SubmittedContext {
  locationId: string;
  locationName: string;
  boatType: string;
  crewCount: string;
  tripDuration: string;
  language: (typeof LANGUAGES)[number];
  typedObservation: string;
  hasAudio: boolean;
  hasImage: boolean;
}

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

export function useAssessmentWorkflow() {
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
  const [locationId, setLocationId] = useState("");
  const [boatType, setBoatType] = useState("");
  const [crewCount, setCrewCount] = useState("");
  const [tripDuration, setTripDuration] = useState("");
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>("English");
  const [submittedContext, setSubmittedContext] =
    useState<SubmittedContext | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

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
      timeoutRef.current = setTimeout(
        stopRecording,
        RECORDING_LIMIT_SECONDS * 1000,
      );
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
    formData.set("location", locationId);
    formData.set("boatType", boatType);
    formData.set("crewCount", crewCount);
    formData.set("tripDuration", tripDuration);
    formData.set("language", language);
    if (audioFile) formData.set("audio", audioFile);
    if (imageFile) formData.set("image", imageFile);

    const location = getLocation(locationId);
    setSubmittedContext({
      locationId,
      locationName: location?.name ?? locationId,
      boatType,
      crewCount,
      tripDuration,
      language,
      typedObservation: typedObservation.trim(),
      hasAudio: Boolean(audioFile),
      hasImage: Boolean(imageFile),
    });

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

  function resetAssessment(scrollTarget: HTMLElement | null) {
    setResult(null);
    setSubmittedContext(null);
    setTypedObservation("");
    removeAudio();
    removeImage();
    setLocationId("");
    setBoatType("");
    setCrewCount("");
    setTripDuration("");
    setLanguage("English");
    formRef.current?.reset();
    setError("");
    requestAnimationFrame(() => scrollToElement(scrollTarget));
  }

  const recordingAction = isRecording
    ? "Stop recording"
    : audioFile
      ? "Re-record observation"
      : "Start recording";

  const selectedLocationName =
    COASTAL_LOCATIONS.find((item) => item.id === locationId)?.name ?? "";

  return {
    typedObservation,
    setTypedObservation,
    audioFile,
    imageFile,
    imagePreview,
    isRecording,
    elapsedSeconds,
    micMessage,
    error,
    isLoading,
    result,
    locationId,
    setLocationId,
    boatType,
    setBoatType,
    crewCount,
    setCrewCount,
    tripDuration,
    setTripDuration,
    language,
    setLanguage,
    submittedContext,
    selectedLocationName,
    recordingAction,
    formRef,
    imageInputRef,
    startRecording,
    stopRecording,
    removeAudio,
    handleImage,
    removeImage,
    handleSubmit,
    resetAssessment,
    RECORDING_LIMIT_SECONDS,
    BOAT_TYPES,
    LANGUAGES,
    COASTAL_LOCATIONS,
  };
}

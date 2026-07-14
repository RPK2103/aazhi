"use client";

import type { useAssessmentWorkflow } from "@/hooks/use-assessment-workflow";

type Workflow = ReturnType<typeof useAssessmentWorkflow>;

interface Props {
  workflow: Workflow;
}

export function ObservationPanel({ workflow }: Props) {
  const {
    typedObservation,
    setTypedObservation,
    audioFile,
    imagePreview,
    isRecording,
    elapsedSeconds,
    micMessage,
    error,
    isLoading,
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
    recordingAction,
    formRef,
    imageInputRef,
    startRecording,
    stopRecording,
    removeAudio,
    handleImage,
    removeImage,
    handleSubmit,
    RECORDING_LIMIT_SECONDS,
    BOAT_TYPES,
    LANGUAGES,
    COASTAL_LOCATIONS,
  } = workflow;

  return (
    <aside className="observation-panel sea-glass" aria-labelledby="observation-title">
      <header className="observation-panel__header">
        <p className="text-label-sm">BEFORE DEPARTURE</p>
        <h2 id="observation-title" className="observation-panel__title">
          What are you seeing today?
        </h2>
      </header>

      <form
        ref={formRef}
        className="observation-panel__form"
        onSubmit={handleSubmit}
      >
        <div className="observation-panel__voice">
          <button
            type="button"
            className={`voice-instrument${isRecording ? " is-recording" : ""}`}
            aria-label={recordingAction}
            onClick={isRecording ? stopRecording : startRecording}
          >
            <span className="voice-instrument__ring voice-instrument__ring--outer" aria-hidden="true" />
            <span className="voice-instrument__ring voice-instrument__ring--inner" aria-hidden="true" />
            <svg aria-hidden="true" viewBox="0 0 24 24" width="32" height="32" fill="none">
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
          </button>
          <p className="voice-instrument__state" aria-live="polite">
            {isRecording
              ? `Recording · ${elapsedSeconds}s / ${RECORDING_LIMIT_SECONDS}s`
              : audioFile
                ? "Spoken observation ready"
                : "Tap to record"}
          </p>
          {audioFile && !isRecording && (
            <button className="workspace-text-button" type="button" onClick={removeAudio}>
              Remove recording
            </button>
          )}
          {micMessage && (
            <p className="voice-instrument__message" role="status">
              {micMessage}
            </p>
          )}
        </div>

        <div className="observation-panel__field">
          <label htmlFor="typedObservation">Typed observation</label>
          <textarea
            id="typedObservation"
            name="typedObservation"
            maxLength={1500}
            rows={4}
            value={typedObservation}
            onChange={(event) => setTypedObservation(event.target.value)}
            placeholder="Describe what you are seeing, hearing, or noticing..."
          />
          <span className="observation-panel__count">
            {typedObservation.length} / 1500
          </span>
        </div>

        <div className="observation-panel__capture">
          <input
            ref={imageInputRef}
            id="image"
            className="observation-panel__file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-describedby="image-boundary"
            onChange={handleImage}
          />
          <label
            className={`capture-frame${imagePreview ? " has-image" : ""}`}
            htmlFor="image"
          >
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="Selected situational context preview" />
            ) : (
              <span className="capture-frame__guide">Add visible context</span>
            )}
            <span className="capture-frame__corner capture-frame__corner--tl" aria-hidden="true" />
            <span className="capture-frame__corner capture-frame__corner--tr" aria-hidden="true" />
            <span className="capture-frame__corner capture-frame__corner--bl" aria-hidden="true" />
            <span className="capture-frame__corner capture-frame__corner--br" aria-hidden="true" />
          </label>
          {imagePreview && (
            <button className="workspace-text-button" type="button" onClick={removeImage}>
              Remove image
            </button>
          )}
          <p id="image-boundary" className="observation-panel__boundary">
            Visible context only — AAZHI does not measure wave height from images.
          </p>
        </div>

        <div className="observation-panel__trip-grid">
          <div className="observation-panel__field">
            <label htmlFor="location">Coastal location</label>
            <select
              id="location"
              name="location"
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              required
            >
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

          <div className="observation-panel__field">
            <label htmlFor="boatType">Boat type</label>
            <select
              id="boatType"
              name="boatType"
              value={boatType}
              onChange={(event) => setBoatType(event.target.value)}
              required
            >
              <option value="" disabled>
                Select boat type
              </option>
              {BOAT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="observation-panel__field">
            <label htmlFor="crewCount">Crew count</label>
            <input
              id="crewCount"
              name="crewCount"
              type="number"
              min="1"
              max="30"
              step="1"
              inputMode="numeric"
              value={crewCount}
              onChange={(event) => setCrewCount(event.target.value)}
              required
            />
          </div>

          <div className="observation-panel__field">
            <label htmlFor="tripDuration">Trip duration (hours)</label>
            <input
              id="tripDuration"
              name="tripDuration"
              type="number"
              min="0.5"
              max="72"
              step="0.5"
              inputMode="decimal"
              value={tripDuration}
              onChange={(event) => setTripDuration(event.target.value)}
              required
            />
          </div>

          <fieldset className="observation-panel__language">
            <legend>Output language</legend>
            <div className="observation-panel__language-options">
              {LANGUAGES.map((option) => (
                <label key={option}>
                  <input
                    type="radio"
                    name="language"
                    value={option}
                    checked={language === option}
                    onChange={() => setLanguage(option)}
                  />
                  <span>{option === "Tamil" ? "தமிழ்" : option}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div aria-live="assertive">
          {error && (
            <p className="observation-panel__error" role="alert">
              {error}
            </p>
          )}
        </div>

        <button
          className="workspace-primary-button"
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading
            ? "RECONCILING FIELD AND MARINE CONTEXT…"
            : "ASSESS DEPARTURE READINESS"}
        </button>
        <p className="observation-panel__loading" aria-live="polite">
          {isLoading ? "Reconciling field and marine context…" : ""}
        </p>
        <p className="observation-panel__disclaimer">
          AAZHI provides preparedness and readiness assistance, not official
          maritime clearance. Follow local and maritime authority instructions.
        </p>
      </form>
    </aside>
  );
}

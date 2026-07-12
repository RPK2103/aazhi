import {
  LocationIcon,
  ObservationIcon,
  TripIcon,
  VesselIcon,
} from "@/components/icons/marine-icons";
import type { SubmittedContext } from "@/hooks/use-assessment-workflow";

interface Props {
  context: SubmittedContext;
}

export function TripContextPanel({ context }: Props) {
  const observation =
    context.typedObservation ||
    (context.hasAudio ? "Spoken observation provided" : "No typed observation");

  return (
    <section className="trip-context glass-quiet" aria-labelledby="trip-context-title">
      <h3 id="trip-context-title" className="panel-heading">TRIP CONTEXT</h3>
      <div className="trip-context__strip">
        <div className="trip-context__cell">
          <LocationIcon className="trip-context__icon" aria-hidden="true" />
          <span className="trip-context__label">Location</span>
          <span className="trip-context__value">{context.locationName}</span>
        </div>
        <div className="trip-context__cell">
          <VesselIcon className="trip-context__icon" aria-hidden="true" />
          <span className="trip-context__label">Vessel</span>
          <span className="trip-context__value">{context.boatType}</span>
        </div>
        <div className="trip-context__cell">
          <TripIcon className="trip-context__icon" aria-hidden="true" />
          <span className="trip-context__label">Trip</span>
          <span className="trip-context__value">
            {context.tripDuration}h · {context.crewCount} crew
          </span>
        </div>
        <div className="trip-context__cell">
          <span className="trip-context__label">Language</span>
          <span className="trip-context__value">{context.language}</span>
        </div>
        <div className="trip-context__cell trip-context__cell--observation">
          <ObservationIcon className="trip-context__icon" aria-hidden="true" />
          <span className="trip-context__label">Observation</span>
          <span className="trip-context__value trip-context__observation" title={observation}>
            {observation}
          </span>
        </div>
        {context.hasImage && (
          <div className="trip-context__cell trip-context__cell--image">
            <span className="trip-context__label">Image</span>
            <span className="trip-context__value">Visible context provided</span>
          </div>
        )}
      </div>
    </section>
  );
}

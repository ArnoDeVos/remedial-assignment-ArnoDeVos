/**
 * Main neighbourhood map view and sighting-registration workflow.
 */

import { useMemo, useState } from 'react';

import ActivityPanel from '../components/ActivityPanel.jsx';
import NeighbourhoodMap from '../components/NeighbourhoodMap.jsx';
import SightingForm from '../components/SightingForm.jsx';
import SubjectList from '../components/SubjectList.jsx';
import TimeWindowFilter from '../components/TimeWindowFilter.jsx';

import { useAuth } from '../context/AuthContext.jsx';
import {
  useNeighbourhoodActivity,
  useNeighbourhoodMap,
  useTrajectories,
} from '../hooks/useNeighbourhood.js';
import { useSightings, useSubjects } from '../hooks/useSightings.js';
import { windowFromPreset } from '../utils/timeWindows.js';
import { formatDateTime } from '../utils/format.js';

/**
 * Renders the application's map, filters, activity summary and report form.
 *
 * @returns {JSX.Element} The map page.
 */
export default function MapPage() {
  const { isSignedIn } = useAuth();

  const [preset, setPreset] = useState('7d');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isReporting, setIsReporting] = useState(false);
  const [pickedLocation, setPickedLocation] = useState(null);
  const [hoveredSighting, setHoveredSighting] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // A stable object prevents otherwise identical resource requests on rerender.
  const timeWindow = useMemo(() => windowFromPreset(preset), [preset]);

  const mapResource = useNeighbourhoodMap();
  const activityResource = useNeighbourhoodActivity(timeWindow);
  const subjectsResource = useSubjects();
  const sightingsResource = useSightings({ ...timeWindow, limit: 800 });
  const trajectoriesResource = useTrajectories(selectedIds, timeWindow);

  /**
   * Adds or removes a subject from the selection.
   *
   * @param {string} subjectId Subject to toggle.
   * @returns {void}
   */
  function toggleSubject(subjectId) {
    setSelectedIds((current) =>
      current.includes(subjectId)
        ? current.filter((id) => id !== subjectId)
        : [...current, subjectId],
    );
  }

  /**
   * Refreshes everything a new sighting could have changed.
   *
   * @param {{sighting: object, warnings: Array<object>}} result The API result.
   * @returns {void}
   */
  function handleRegistered(result) {
    setIsReporting(false);
    setPickedLocation(null);

    setFeedback({
      tone: result.warnings.length > 0 ? 'warning' : 'success',
      message:
        result.warnings.length > 0
          ? `Registered, but flagged for review: ${result.warnings[0].message}`
          : `Registered at ${formatDateTime(result.sighting.observedAt)}.`,
    });

    sightingsResource.refetch();
    subjectsResource.refetch();
    activityResource.refetch();
  }

  if (mapResource.error) {
    return (
      <p className="state state--error">
        The map could not be loaded: {mapResource.error.message}
      </p>
    );
  }

  if (!mapResource.data) {
    return <p className="state state--loading">Loading the neighbourhood…</p>;
  }

  return (
    <div className="map-page">
      <aside className="map-page__sidebar">
        <SubjectList
          subjects={subjectsResource.data}
          selectedIds={selectedIds}
          onToggle={toggleSubject}
          onClear={() => setSelectedIds([])}
          isLoading={subjectsResource.isLoading}
        />

        <ActivityPanel
          activity={activityResource.data}
          isLoading={activityResource.isLoading}
        />
      </aside>

      <section className="map-page__main">
        <div className="map-page__toolbar">
          <TimeWindowFilter value={preset} onChange={setPreset} />

          {isSignedIn ? (
            <button
              type="button"
              className={`button${isReporting ? ' button--ghost' : ''}`}
              onClick={() => {
                setIsReporting((current) => !current);
                setPickedLocation(null);
                setFeedback(null);
              }}
            >
              {isReporting ? 'Cancel report' : 'Register a sighting'}
            </button>
          ) : (
            <span className="map-page__hint">Sign in to register a sighting.</span>
          )}
        </div>

        {feedback ? (
          <p className={`state state--${feedback.tone}`} role="status">
            {feedback.message}
          </p>
        ) : null}

        {isReporting ? (
          <p className="state state--info">Click the map to mark where you saw them.</p>
        ) : null}

        <div className="map-page__canvas">
          <NeighbourhoodMap
            map={mapResource.data}
            zoneActivity={activityResource.data?.zones ?? []}
            sightings={sightingsResource.data}
            trajectories={trajectoriesResource.data}
            selectedSubjectId={selectedIds.at(-1) ?? null}
            pickedLocation={pickedLocation}
            isPicking={isReporting}
            onPickLocation={setPickedLocation}
            onSelectSubject={toggleSubject}
            onHoverSighting={setHoveredSighting}
          />

          {hoveredSighting ? (
            <div className="map-page__tooltip">
              <strong>{hoveredSighting.subjectLabel}</strong>
              <span>{formatDateTime(hoveredSighting.observedAt)}</span>
              <span>Reported by {hoveredSighting.reporterName}</span>
              {hoveredSighting.notes ? <em>“{hoveredSighting.notes}”</em> : null}
              {hoveredSighting.status === 'needs_review' ? (
                <span className="badge badge--warning">flagged for review</span>
              ) : null}
            </div>
          ) : null}
        </div>

        <p className="map-page__caption">
          {sightingsResource.data.length} sightings shown
          {selectedIds.length > 0
            ? ` · ${trajectoriesResource.data.length} trajectories drawn`
            : ''}
          . Dashed lines mark movement the server judged physically implausible.
        </p>
      </section>

      {isReporting ? (
        <aside className="map-page__form">
          <SightingForm
            position={pickedLocation}
            subjects={subjectsResource.data}
            onCancel={() => {
              setIsReporting(false);
              setPickedLocation(null);
            }}
            onRegistered={handleRegistered}
          />
        </aside>
      ) : null}
    </div>
  );
}

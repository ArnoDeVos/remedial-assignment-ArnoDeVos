/**
 * Subject detail page for one reconstructed movement trajectory.
 */

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import NeighbourhoodMap from '../components/NeighbourhoodMap.jsx';
import TimeWindowFilter from '../components/TimeWindowFilter.jsx';

import { useNeighbourhoodMap } from '../hooks/useNeighbourhood.js';
import { useTrajectory } from '../hooks/useSightings.js';
import { windowFromPreset } from '../utils/timeWindows.js';
import { formatDateTime, formatDistance, formatDuration } from '../utils/format.js';

/**
 * Displays a subject's sightings, derived path and reconstruction statistics.
 *
 * @returns {JSX.Element} The subject trajectory page.
 */
export default function SubjectPage() {
  const { id } = useParams();
  const [preset, setPreset] = useState('30d');

  const timeWindow = useMemo(() => windowFromPreset(preset), [preset]);
  const mapResource = useNeighbourhoodMap();
  const trajectoryResource = useTrajectory(id, timeWindow);

  if (trajectoryResource.error) {
    return <p className="state state--error">{trajectoryResource.error.message}</p>;
  }

  if (!mapResource.data || !trajectoryResource.data) {
    return <p className="state state--loading">Reconstructing trajectory…</p>;
  }

  const { subject, sightings, segments, statistics, legs } = trajectoryResource.data;

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h2>{subject.label}</h2>
          <p className="page__subtitle">
            <code>{subject.referenceCode}</code>
            {subject.description ? ` · ${subject.description}` : ''}
          </p>
        </div>
        <TimeWindowFilter value={preset} onChange={setPreset} />
      </header>

      <div className="detail">
        <div className="detail__map">
          <NeighbourhoodMap
            map={mapResource.data}
            sightings={sightings}
            trajectories={[{ subjectId: subject.id, segments, points: sightings }]}
            selectedSubjectId={subject.id}
          />
        </div>

        <aside className="detail__side">
          <section className="panel">
            <h3>Reconstruction</h3>
            <dl className="stats stats--stacked">
              <div>
                <dt>Sightings</dt>
                <dd>{statistics.sightingCount}</dd>
              </div>
              <div>
                <dt>Separate outings</dt>
                <dd>{legs}</dd>
              </div>
              <div>
                <dt>Distance covered</dt>
                <dd>{formatDistance(statistics.totalMetres)}</dd>
              </div>
              <div>
                <dt>Time observed</dt>
                <dd>{formatDuration(statistics.totalSeconds)}</dd>
              </div>
              <div>
                <dt>Average speed</dt>
                <dd>
                  {statistics.averageSpeedMetresPerSecond === null
                    ? '—'
                    : `${(statistics.averageSpeedMetresPerSecond * 3.6).toFixed(1)} km/h`}
                </dd>
              </div>
              <div>
                <dt>Zones visited</dt>
                <dd>{statistics.zonesVisited.length}</dd>
              </div>
              <div>
                <dt>Independent reporters</dt>
                <dd>{statistics.distinctReporters}</dd>
              </div>
              <div>
                <dt>Implausible legs</dt>
                <dd className={statistics.implausibleSegments > 0 ? 'stats__value--warning' : undefined}>
                  {statistics.implausibleSegments}
                </dd>
              </div>
            </dl>
          </section>

          <section className="panel">
            <h3>Timeline</h3>
            <ol className="timeline">
              {sightings.map((sighting) => (
                <li
                  key={sighting.id}
                  className={sighting.status === 'needs_review' ? 'timeline--flagged' : undefined}
                >
                  <time dateTime={sighting.observedAt}>{formatDateTime(sighting.observedAt)}</time>
                  <span>
                    {sighting.zoneCode ?? 'unknown zone'} · reported by {sighting.reporterName}
                  </span>
                  {sighting.notes ? <em>“{sighting.notes}”</em> : null}
                  {sighting.reviewReason ? (
                    <span className="badge badge--warning">{sighting.reviewReason}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          <Link to="/subjects" className="button button--ghost">
            Back to all subjects
          </Link>
        </aside>
      </div>
    </div>
  );
}

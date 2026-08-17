/**
 * Activity panel.
 */

import { colourForSubject } from '../utils/palette.js';

/**
 * Displays the API's 24-hour activity distribution as a compact bar chart.
 *
 * @param {object} props Component props.
 * @param {Array<{hour: number, sightingCount: number}>} props.hourly All 24 hours.
 * @returns {JSX.Element} The hourly activity chart.
 */
function HourlyChart({ hourly }) {
  const busiest = Math.max(1, ...hourly.map((entry) => entry.sightingCount));

  return (
    <div className="chart" role="img" aria-label="Sightings per hour of the day">
      {hourly.map((entry) => (
        <div className="chart__column" key={entry.hour}>
          <div
            className="chart__bar"
            style={{ height: `${(entry.sightingCount / busiest) * 100}%` }}
            title={`${String(entry.hour).padStart(2, '0')}:00 — ${entry.sightingCount} sightings`}
          />
          {entry.hour % 6 === 0 ? <span className="chart__tick">{entry.hour}</span> : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Presents aggregate neighbourhood activity supplied by the API.
 *
 * @param {object} props Component props.
 * @param {object|null} props.activity Aggregated activity response.
 * @param {boolean} props.isLoading Whether activity is being loaded.
 * @returns {JSX.Element} The activity panel, a loading state, or nothing.
 */
export default function ActivityPanel({ activity, isLoading }) {
  if (isLoading && !activity) {
    return <section className="panel">Loading activity…</section>;
  }

  if (!activity) {
    return null;
  }

  const { summary, zones, hourly, contributors } = activity;

  return (
    <section className="panel">
      <h2>Activity</h2>

      <dl className="stats">
        <div>
          <dt>Sightings</dt>
          <dd>{summary.sightings}</dd>
        </div>
        <div>
          <dt>Subjects</dt>
          <dd>{summary.subjects}</dd>
        </div>
        <div>
          <dt>Reporters</dt>
          <dd>{summary.reporters}</dd>
        </div>
        <div>
          <dt>Flagged</dt>
          <dd className={summary.needsReview > 0 ? 'stats__value--warning' : undefined}>
            {summary.needsReview}
          </dd>
        </div>
      </dl>

      <h3>Busiest zones</h3>
      <ul className="bars">
        {zones.slice(0, 6).map((zone) => (
          <li key={zone.zoneCode}>
            <span className="bars__label">{zone.zoneName}</span>
            <span className="bars__track">
              <span className="bars__fill" style={{ width: `${zone.intensity * 100}%` }} />
            </span>
            <span className="bars__value">{zone.sightingCount}</span>
          </li>
        ))}
      </ul>

      <h3>By hour of day</h3>
      <HourlyChart hourly={hourly} />

      <h3>Most active reporters</h3>
      <ul className="list list--compact">
        {contributors.map((contributor) => (
          <li key={contributor.id}>
            <span
              className="dot"
              style={{ background: colourForSubject(contributor.id) }}
              aria-hidden="true"
            />
            <span>{contributor.displayName}</span>
            <span className="list__meta">{contributor.sightingCount}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Moderator queue for sightings that need a human decision.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../api/client.js';
import { useReviewQueue } from '../hooks/useSightings.js';
import { formatDateTime } from '../utils/format.js';

/**
 * Displays flagged sightings and lets a moderator accept or reject them.
 *
 * @returns {JSX.Element} The moderator review page.
 */
export default function ReviewPage() {
  const { data: sightings, isLoading, error, refetch } = useReviewQueue(true);
  const [busyId, setBusyId] = useState(null);
  const [failure, setFailure] = useState(null);

  /**
   * Resolves one flagged sighting and refreshes the queue.
   *
   * @param {string} sightingId The sighting to resolve.
   * @param {'accepted'|'rejected'} status The moderator's decision.
   * @returns {Promise<void>} Resolves once the queue has been refreshed.
   */
  async function resolve(sightingId, status) {
    setBusyId(sightingId);
    setFailure(null);

    try {
      await api.sightings.review(sightingId, { status });
      refetch();
    } catch (caught) {
      setFailure(caught.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h2>Review queue</h2>
          <p className="page__subtitle">
            Review sightings that could not be accepted automatically.
          </p>
        </div>
      </header>

      {error ? <p className="state state--error">{error.message}</p> : null}
      {failure ? <p className="state state--error">{failure}</p> : null}
      {isLoading ? <p className="state state--loading">Loading review queue…</p> : null}

      {!isLoading && sightings.length === 0 ? (
        <p className="state state--success">The review queue is empty.</p>
      ) : null}

      <ul className="review">
        {sightings.map((sighting) => (
          <li key={sighting.id} className="panel review__item">
            <div className="review__body">
              <h3>
                <Link to={`/subjects/${sighting.subjectId}`}>{sighting.subjectLabel}</Link>{' '}
                <code>{sighting.subjectReferenceCode}</code>
              </h3>

              <p className="review__reason">{sighting.reviewReason}</p>

              <dl className="review__meta">
                <div>
                  <dt>Observed</dt>
                  <dd>{formatDateTime(sighting.observedAt)}</dd>
                </div>
                <div>
                  <dt>Reported by</dt>
                  <dd>{sighting.reporterName}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>
                    {sighting.zoneCode ?? 'unknown'} ({sighting.position.x}, {sighting.position.y})
                  </dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd>{sighting.confidence}</dd>
                </div>
              </dl>

              {sighting.notes ? <p className="review__notes">“{sighting.notes}”</p> : null}
            </div>

            <div className="review__actions">
              <button
                type="button"
                className="button"
                disabled={busyId === sighting.id}
                onClick={() => resolve(sighting.id, 'accepted')}
              >
                Accept
              </button>
              <button
                type="button"
                className="button button--danger"
                disabled={busyId === sighting.id}
                onClick={() => resolve(sighting.id, 'rejected')}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

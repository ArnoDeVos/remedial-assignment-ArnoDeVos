/**
 * Selectable list of subjects.
 */

import { colourForSubject } from '../utils/palette.js';
import { formatRelative } from '../utils/format.js';

/**
 * Displays selectable subjects and serves as the trajectory colour legend.
 *
 * @param {object} props Component props.
 * @param {Array<object>} props.subjects Subjects to display.
 * @param {Array<string>} props.selectedIds Currently selected subject IDs.
 * @param {(subjectId: string) => void} props.onToggle Toggles a subject selection.
 * @param {() => void} props.onClear Clears all selected subjects.
 * @param {boolean} [props.isLoading=false] Whether subjects are loading.
 * @returns {JSX.Element} The subject selection panel.
 */
export default function SubjectList({
  subjects,
  selectedIds,
  onToggle,
  onClear,
  isLoading = false,
}) {
  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Subjects</h2>
        {selectedIds.length > 0 ? (
          <button type="button" className="button button--ghost button--small" onClick={onClear}>
            Clear ({selectedIds.length})
          </button>
        ) : null}
      </div>

      <p className="panel__hint">Select subjects to draw their trajectories on the map.</p>

      {isLoading ? <p className="state state--loading">Loading subjects…</p> : null}

      <ul className="list">
        {subjects.map((subject) => {
          const isSelected = selectedIds.includes(subject.id);

          return (
            <li key={subject.id}>
              <button
                type="button"
                className={`list__button${isSelected ? ' list__button--active' : ''}`}
                aria-pressed={isSelected}
                onClick={() => onToggle(subject.id)}
              >
                <span
                  className="dot"
                  style={{ background: colourForSubject(subject.id) }}
                  aria-hidden="true"
                />
                <span className="list__body">
                  <strong>{subject.label}</strong>
                  <small>
                    {subject.referenceCode} · {subject.sightingCount} sightings · last seen{' '}
                    {formatRelative(subject.lastSeenAt)}
                  </small>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!isLoading && subjects.length === 0 ? (
        <p className="state">Nobody has been registered yet.</p>
      ) : null}
    </section>
  );
}

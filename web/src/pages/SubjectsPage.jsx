/**
 * Subject index.
 *
 * A searchable table of everyone the neighbourhood has registered.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useSubjects } from '../hooks/useSightings.js';
import { colourForSubject } from '../utils/palette.js';
import { formatDateTime, formatRelative } from '../utils/format.js';

/**
 * Displays a searchable index of observed subjects.
 *
 * @returns {JSX.Element} he subjects index page
 */
export default function SubjectsPage() {
  const [search, setSearch] = useState('');
  const { data: subjects, isLoading, error } = useSubjects({ search });

  return (
    <div className="page">
      <header className="page__header">
        <h2>Subjects</h2>
        <input
          type="search"
          className="input input--search"
          placeholder="Search by description or code…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </header>

      {error ? <p className="state state--error">{error.message}</p> : null}
      {isLoading ? <p className="state state--loading">Loading…</p> : null}

      <table className="table">
        <thead>
          <tr>
            <th scope="col">Subject</th>
            <th scope="col">Code</th>
            <th scope="col">Sightings</th>
            <th scope="col">First seen</th>
            <th scope="col">Last seen</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => (
            <tr key={subject.id}>
              <td>
                <span
                  className="dot"
                  style={{ background: colourForSubject(subject.id) }}
                  aria-hidden="true"
                />
                <Link to={`/subjects/${subject.id}`}>{subject.label}</Link>
              </td>
              <td>
                <code>{subject.referenceCode}</code>
              </td>
              <td>{subject.sightingCount}</td>
              <td>{formatDateTime(subject.firstSeenAt)}</td>
              <td title={formatDateTime(subject.lastSeenAt)}>
                {formatRelative(subject.lastSeenAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!isLoading && subjects.length === 0 ? (
        <p className="state">No subjects match that search.</p>
      ) : null}
    </div>
  );
}

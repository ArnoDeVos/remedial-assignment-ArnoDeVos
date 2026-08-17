/**
 * Form for registering a sighting at a map-selected position.
 */

import { useState } from 'react';

import api, { ApiError } from '../api/client.js';
import { toDateTimeLocalValue } from '../utils/format.js';

/**
* Render the controlled sighting registration form.
 *
 * @param {object} props Component props.
 * @param {{x: number, y: number}|null} props.position Position selected on the map.
 * @param {Array<object>} props.subjects Existing subjects available for selection.
 * @param {() => void} props.onCancel Close the form without registering a sighting.
 * @param {(result: {sighting: object, warnings: Array<object>}) => void} props.onRegistered
 *   Handle a successful registration.
 * @returns {JSX.Element} The form.
 */
export default function SightingForm({ position, subjects, onCancel, onRegistered }) {
  const [mode, setMode] = useState('new');
  const [subjectId, setSubjectId] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [observedAt, setObservedAt] = useState(() => toDateTimeLocalValue(new Date()));
  const [confidence, setConfidence] = useState('medium');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  /**
   * Sends the sighting to the API.
   *
   * @param {import('react').FormEvent} event The submit event.
   * @returns {Promise<void>} Resolves once the request finished.
   */
  async function handleSubmit(event) {
    event.preventDefault();

    if (!position) {
      setError('Click the map to mark where you saw them.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const result = await api.sightings.create({
        ...(mode === 'existing'
          ? { subjectId }
          : { newSubject: { label, ...(description ? { description } : {}) } }),
        positionX: position.x,
        positionY: position.y,
        observedAt: new Date(observedAt).toISOString(),
        confidence,
        ...(notes ? { notes } : {}),
      });

      onRegistered(result);
    } catch (caught) {
      setError(caught.message);

      if (caught instanceof ApiError && caught.details) {
        setFieldErrors(caught.details);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <h2>Register a sighting</h2>

      <p className="form__position">
        {position ? (
          <>
            Location: <strong>{`${position.x}, ${position.y}`}</strong>
          </>
        ) : (
          'Click the map to mark where you saw them.'
        )}
      </p>

      <div className="segmented segmented--compact" role="group" aria-label="Who did you see">
        <button
          type="button"
          className={`segmented__option${mode === 'new' ? ' segmented__option--active' : ''}`}
          onClick={() => setMode('new')}
        >
          Someone new
        </button>
        <button
          type="button"
          className={`segmented__option${mode === 'existing' ? ' segmented__option--active' : ''}`}
          onClick={() => setMode('existing')}
        >
          Seen before
        </button>
      </div>

      {mode === 'existing' ? (
        <label className="field">
          <span>Subject</span>
          <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} required>
            <option value="">Pick a subject…</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {`${subject.referenceCode} — ${subject.label}`}
              </option>
            ))}
          </select>
          {fieldErrors.subjectId ? <em className="field__error">{fieldErrors.subjectId}</em> : null}
        </label>
      ) : (
        <>
          <label className="field">
            <span>What did you see?</span>
            <input
              type="text"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Person in a red raincoat"
              maxLength={120}
              required
            />
            {fieldErrors['newSubject.label'] ? (
              <em className="field__error">{fieldErrors['newSubject.label']}</em>
            ) : null}
          </label>

          <label className="field">
            <span>Extra detail (optional)</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              maxLength={1000}
            />
          </label>
        </>
      )}

      <div className="form__row">
        <label className="field">
          <span>When</span>
          <input
            type="datetime-local"
            value={observedAt}
            onChange={(event) => setObservedAt(event.target.value)}
            required
          />
          {fieldErrors.observedAt ? <em className="field__error">{fieldErrors.observedAt}</em> : null}
        </label>

        <label className="field">
          <span>How sure are you?</span>
          <select value={confidence} onChange={(event) => setConfidence(event.target.value)}>
            <option value="low">Not very</option>
            <option value="medium">Reasonably</option>
            <option value="high">Certain</option>
          </select>
        </label>
      </div>

      <label className="field">
        <span>Note (optional)</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Walking towards the tram stop"
        />
        {fieldErrors.notes ? <em className="field__error">{fieldErrors.notes}</em> : null}
      </label>

      {error ? <p className="state state--error">{error}</p> : null}

      <div className="form__actions">
        <button type="button" className="button button--ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button" disabled={isSubmitting || !position}>
          {isSubmitting ? 'Registering…' : 'Register sighting'}
        </button>
      </div>
    </form>
  );
}

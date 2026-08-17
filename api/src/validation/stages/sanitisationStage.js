/**
 * Stage 1 — sanitisation.
 */

import { ValidationError } from '../../errors/ApplicationError.js';

/** Matches anything that looks like an HTML or XML tag. */
const TAG_PATTERN = /<[^>]*>/gu;

/** Matches C0 and C1 control characters, which have no business in a note. */
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F-\u009F]/gu;

/** Matches runs of whitespace, including newlines. */
const WHITESPACE_RUN_PATTERN = /\s+/gu;

/**
 * Reduces a free-text value to clean, single-spaced plain text.
 *
 * @param {string|undefined|null} value Raw input.
 * @returns {string|null} The cleaned text, or null when nothing is left.
 */
export function cleanText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value
    .replace(TAG_PATTERN, ' ')
    .replace(CONTROL_CHARACTER_PATTERN, ' ')
    .replace(WHITESPACE_RUN_PATTERN, ' ')
    .trim();

  return cleaned.length === 0 ? null : cleaned;
}

const sanitisationStage = {
  name: 'sanitisation',

  /**
   * @param {object} context Shared pipeline context.
   * @returns {void}
   */
  process(context) {
    const notes = cleanText(context.input.notes);

    // A note that consisted only of markup is a sign of a broken or hostile client, and worth telling the resident about rather than silently storing an empty field.
    if (context.input.notes && notes === null) {
      throw new ValidationError('The note contained no readable text.', {
        notes: 'Write the note as plain text.',
      });
    }

    context.record.notes = notes;
    context.record.confidence = context.input.confidence;
  },
};

export default sanitisationStage;

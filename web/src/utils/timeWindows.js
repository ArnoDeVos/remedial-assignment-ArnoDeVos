/**
 * Time-window presets shared by map, activity and trajectory views.
 */
export const TIME_WINDOW_PRESETS = Object.freeze([
  { id: '24h', label: 'Last 24 hours', hours: 24 },
  { id: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { id: '30d', label: 'Last 30 days', hours: 24 * 30 },
  { id: 'all', label: 'Everything', hours: null },
]);

/**
 * Converts a preset ID into the `from` filter expected by the API.
 *
 * @param {string} presetId A stable ID from {@link TIME_WINDOW_PRESETS}.
 * @returns {{from?: string, to?: string}} The lower time boundary or no filter for all history.
 */
export function windowFromPreset(presetId) {
  const preset = TIME_WINDOW_PRESETS.find((candidate) => candidate.id === presetId);

  if (!preset || preset.hours === null) {
    return {};
  }

  const from = new Date(Date.now() - preset.hours * 60 * 60 * 1000);

  return { from: from.toISOString() };
}

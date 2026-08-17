/**
 * Time window selector.
 */

import { TIME_WINDOW_PRESETS } from '../utils/timeWindows.js';

/**
 * Renders a controlled segmented selector for the activity time window.
 *
 * @param {object} props Component props.
 * @param {string} props.value ID of the selected preset.
 * @param {(presetId: string) => void} props.onChange Handles preset selection.
 * @returns {JSX.Element} The time-window selector.
 */
export default function TimeWindowFilter({ value, onChange }) {
  return (
    <div className="segmented" role="group" aria-label="Time window">
      {TIME_WINDOW_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className={`segmented__option${value === preset.id ? ' segmented__option--active' : ''}`}
          aria-pressed={value === preset.id}
          onClick={() => onChange(preset.id)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

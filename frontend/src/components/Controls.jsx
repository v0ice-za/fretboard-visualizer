import { CHROMATIC_NOTES } from '../data/notes.js';
import { TUNING_NAMES } from '../data/tunings.js';
import { SCALE_NAMES, SCALES, SCALE_CATEGORIES } from '../data/scales.js';
import './Controls.css';

export default function Controls({
  tuningName, setTuningName,
  rootNote, setRootNote,
  scaleName, setScaleName,
  showIntervals, setShowIntervals,
}) {
  const groupedScales = SCALE_CATEGORIES.map(cat => ({
    category: cat,
    scales: SCALE_NAMES.filter(name => SCALES[name].category === cat),
  }));

  return (
    <div className="controls">
      <div className="controls-row">
        {/* Tuning */}
        <div className="control-group">
          <label className="control-label">Tuning</label>
          <select
            className="control-select"
            value={tuningName}
            onChange={e => setTuningName(e.target.value)}
          >
            {TUNING_NAMES.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* Root note */}
        <div className="control-group">
          <label className="control-label">Root Note</label>
          <div className="note-buttons">
            {CHROMATIC_NOTES.map(note => (
              <button
                key={note}
                className={`note-btn ${rootNote === note ? 'note-btn--active' : ''}`}
                onClick={() => setRootNote(note)}
              >
                {note}
              </button>
            ))}
          </div>
        </div>

        {/* Scale */}
        <div className="control-group">
          <label className="control-label">Scale</label>
          <select
            className="control-select"
            value={scaleName}
            onChange={e => setScaleName(e.target.value)}
          >
            {groupedScales.map(({ category, scales }) => (
              <optgroup key={category} label={category}>
                {scales.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Display mode */}
        <div className="control-group control-group--toggle">
          <label className="control-label">Show</label>
          <div className="toggle-row">
            <button
              className={`toggle-btn ${!showIntervals ? 'toggle-btn--active' : ''}`}
              onClick={() => setShowIntervals(false)}
            >
              Notes
            </button>
            <button
              className={`toggle-btn ${showIntervals ? 'toggle-btn--active' : ''}`}
              onClick={() => setShowIntervals(true)}
            >
              Intervals
            </button>
          </div>
        </div>
      </div>

      {/* Scale info bar */}
      <ScaleInfoBar rootNote={rootNote} scaleName={scaleName} />
    </div>
  );
}

function ScaleInfoBar({ rootNote, scaleName }) {
  const scale = SCALES[scaleName];
  if (!scale) return null;

  return (
    <div className="scale-info-bar">
      <span className="scale-info-name">
        {rootNote} {scaleName}
      </span>
      <span className="scale-info-category">{scale.category}</span>
      <span className="scale-info-notes">
        {scale.intervals.length} notes · {scale.intervals.join(' – ')} semitones
      </span>
      <div className="scale-legend">
        <span className="legend-item">
          <span className="legend-dot legend-dot--root" />
          Root
        </span>
        <span className="legend-item">
          <span className="legend-dot legend-dot--scale" />
          Scale note
        </span>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { TUNINGS } from '../data/tunings.js';
import { CHROMATIC_NOTES } from '../data/notes.js';
import {
  getNoteAtFret,
  getScaleNotes,
  isRoot,
  getIntervalName,
  getNoteInterval,
  FRET_MARKERS,
  DOUBLE_MARKERS,
} from '../utils/musicTheory.js';
import './Fretboard.css';

const FRET_COUNT = 24;
const FRETS = Array.from({ length: FRET_COUNT + 1 }, (_, i) => i);

export default function Fretboard({ tuningName, rootNote, scaleName, showIntervals, setRootNote }) {
  const strings = TUNINGS[tuningName] ?? TUNINGS['Standard E'];
  const displayStrings = [...strings].reverse();

  const scaleNotes = useMemo(
    () => getScaleNotes(rootNote, scaleName),
    [rootNote, scaleName]
  );

  return (
    <div className="fretboard-wrapper">
      <div className="fretboard-scroll">
        <div className="fretboard">
          <div className="nut" />

          <div className="string-labels">
            {displayStrings.map((note, i) => (
              <div key={i} className="string-label">{note}</div>
            ))}
          </div>

          <div className="fretboard-neck">
            <div className="frets-grid">
              {FRETS.map(fret => (
                <div key={fret} className={`fret-column ${fret === 0 ? 'fret-open' : ''}`}>
                  {displayStrings.map((openNote, strIdx) => {
                    const note = getNoteAtFret(openNote, fret);
                    const inScale = scaleNotes.has(note);
                    const root = inScale && isRoot(note, rootNote);
                    const interval = inScale ? getNoteInterval(note, rootNote, scaleName) : null;

                    return (
                      <div key={strIdx} className="fret-cell">
                        <div className="string-line" />
                        {fret > 0 && <div className="fret-bar" />}
                        {fret > 0 && inScale && (
                          <div
                            className={`note-dot ${root ? 'note-dot--root' : 'note-dot--scale'}`}
                            onClick={() => setRootNote(note)}
                          >
                            <span className="note-dot-label">
                              {showIntervals && interval !== null
                                ? getIntervalName(interval)
                                : note}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {fret > 0 && FRET_MARKERS.has(fret) && (
                    <div className="fret-inlay fret-inlay--single" />
                  )}
                  {fret > 0 && DOUBLE_MARKERS.has(fret) && (
                    <>
                      <div className="fret-inlay fret-inlay--double-1" />
                      <div className="fret-inlay fret-inlay--double-2" />
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="fret-numbers">
              {FRETS.map(fret => (
                <div key={fret} className="fret-number-cell">
                  {fret > 0 && (
                    <span className={`fret-number ${FRET_MARKERS.has(fret) || DOUBLE_MARKERS.has(fret) ? 'fret-number--marked' : ''}`}>
                      {fret}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

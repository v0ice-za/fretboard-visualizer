import { useMemo } from 'react';
import { TUNINGS } from '@/data/tunings.js';
import { FRET_MARKERS, DOUBLE_MARKERS, getNoteAtFret } from '@/utils/musicTheory.js';
import { CHORDS } from '@/data/chords.js';
import {
  calculateFretboardDots,
  calculateChordDots,
  calculateFreeformDots,
  generateAriaLabel,
  getFretLineX,
  getDotCx,
  getDotCy,
  VIEWBOX_WIDTH,
  VIEWBOX_HEIGHT,
  FRET_COUNT,
  STRING_COUNT,
  NUT_X,
  FRET_AREA_RIGHT,
  STRING_Y,
  NUT_LABEL_X,
  FRET_NUMBER_Y,
} from '@/utils/fretboardUtils';
import FretDot, { FretDotDefs } from './FretDot';
import type { FreeformMark } from '@/stores/fretboardStore';

const FRETS = Array.from({ length: FRET_COUNT }, (_, i) => i + 1); // [1..24]

interface FretboardCanvasProps {
  tuning: string;
  rootNote: string;
  scaleName: string;
  capoPosition?: number;
  modeIndex?: number | null;
  freeformMarks?: FreeformMark[];
  freeformModeActive?: boolean;
  noteNamesVisible?: boolean;
  chordName?: string | null;
  /** Explicit pitch-class open strings (low→high), overriding the by-name TUNINGS lookup.
   *  Supplied for custom tunings (which aren't in TUNINGS) and the creator's live preview. */
  strings?: string[];
  onFretClick?: (mark: { fret: number; string: number }) => void;
}

export default function FretboardCanvas({
  tuning,
  rootNote,
  scaleName,
  capoPosition = 0,
  modeIndex = null,
  freeformMarks = [],
  freeformModeActive = false,
  noteNamesVisible = false,
  chordName,
  strings,
  onFretClick,
}: FretboardCanvasProps) {
  const openStrings = strings ?? (TUNINGS as Record<string, string[]>)[tuning] ?? TUNINGS['Standard E'];

  const ariaLabel = useMemo(
    () => generateAriaLabel(tuning, rootNote, scaleName, modeIndex, capoPosition),
    [tuning, rootNote, scaleName, modeIndex, capoPosition]
  );

  const dots = useMemo(() => {
    if (chordName) {
      const chord = (CHORDS as Record<string, { intervals: number[] }>)[chordName]
      if (chord) return calculateChordDots(chord.intervals, rootNote, tuning, capoPosition, strings)
    }
    return calculateFretboardDots(tuning, rootNote, scaleName, capoPosition, modeIndex, strings)
  }, [tuning, rootNote, scaleName, capoPosition, modeIndex, chordName, strings]);

  const freeformDots = useMemo(
    () => calculateFreeformDots(freeformMarks, tuning, capoPosition),
    [freeformMarks, tuning, capoPosition]
  );

  const midY = (STRING_Y[2] + STRING_Y[3]) / 2;

  // Dot size scales with fret column width — fret 1 is the reference (full size)
  const fret1Width = getFretLineX(1) - NUT_X;
  const getDotScale = (fret: number) => {
    if (fret === 0) return 1;
    const w = getFretLineX(fret) - getFretLineX(fret - 1);
    return Math.max(0.55, w / fret1Width);
  };

  return (
    <div
      style={{ overflowX: 'auto', touchAction: 'pan-x' }}
      data-testid="fretboard-scroll-wrapper"
    >
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        style={{ width: '100%', minWidth: '450px', height: 'auto', display: 'block' }}
        data-testid="fretboard-svg"
      >
        <FretDotDefs />

        {/* Fretboard surface */}
        <rect
          x={NUT_X}
          y={STRING_Y[0] - 14}
          width={FRET_AREA_RIGHT - NUT_X}
          height={STRING_Y[STRING_COUNT - 1] - STRING_Y[0] + 28}
          fill="var(--color-fretboard, #0b0b16)"
          rx={2}
        />

        {/* Capo dim overlay — covers frets 0 through capoPosition-1 */}
        {capoPosition > 0 && (
          <rect
            data-testid="capo-dim"
            x={0}
            y={STRING_Y[0] - 14}
            width={getFretLineX(capoPosition - 1) || NUT_X}
            height={STRING_Y[STRING_COUNT - 1] - STRING_Y[0] + 28}
            fill="rgba(0,0,0,0.55)"
          />
        )}

        {/* String horizontal lines — visual top (i=0) is high e (thin), bottom (i=5) is low E (thick) */}
        {STRING_Y.map((y, i) => (
          <g key={i}>
            {/* Shadow/depth line underneath */}
            <line
              data-testid="string-line"
              x1={NUT_X}
              y1={y + 0.8}
              x2={FRET_AREA_RIGHT}
              y2={y + 0.8}
              stroke="rgba(0,0,0,0.6)"
              strokeWidth={1.0 + i * 0.4}
            />
            {/* Main string */}
            <line
              x1={NUT_X}
              y1={y}
              x2={FRET_AREA_RIGHT}
              y2={y}
              stroke="var(--color-string, #b8b8d0)"
              strokeWidth={1.0 + i * 0.4}
            />
            {/* Specular highlight on top */}
            <line
              x1={NUT_X}
              y1={y - 0.4}
              x2={FRET_AREA_RIGHT}
              y2={y - 0.4}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={0.5 + i * 0.15}
            />
          </g>
        ))}

        {/* Nut line (thick vertical bar at fret 0) */}
        <line
          x1={NUT_X}
          y1={STRING_Y[0] - 12}
          x2={NUT_X}
          y2={STRING_Y[STRING_COUNT - 1] + 12}
          stroke="#b8a980"
          strokeWidth={5}
          strokeLinecap="round"
        />

        {/* Fret vertical lines (frets 1–24) */}
        {FRETS.map(fret => (
          <g key={fret}>
            {/* Shadow edge (right side of fret bar) */}
            <line
              x1={getFretLineX(fret) + 1}
              y1={STRING_Y[0] - 12}
              x2={getFretLineX(fret) + 1}
              y2={STRING_Y[STRING_COUNT - 1] + 12}
              stroke="rgba(0,0,0,0.5)"
              strokeWidth={1.5}
            />
            {/* Main fret bar */}
            <line
              data-testid="fret-line"
              x1={getFretLineX(fret)}
              y1={STRING_Y[0] - 12}
              x2={getFretLineX(fret)}
              y2={STRING_Y[STRING_COUNT - 1] + 12}
              stroke="var(--color-fret, #9090c0)"
              strokeWidth={3}
            />
            {/* Specular highlight (left edge) */}
            <line
              x1={getFretLineX(fret) - 1}
              y1={STRING_Y[0] - 12}
              x2={getFretLineX(fret) - 1}
              y2={STRING_Y[STRING_COUNT - 1] + 12}
              stroke="rgba(255,255,255,0.18)"
              strokeWidth={1}
            />
          </g>
        ))}

        {/* Capo indicator — amber bar at the left boundary of capo fret column */}
        {capoPosition > 0 && (
          <line
            data-testid="capo-indicator"
            x1={getFretLineX(capoPosition - 1)}
            y1={STRING_Y[0] - 12}
            x2={getFretLineX(capoPosition - 1)}
            y2={STRING_Y[STRING_COUNT - 1] + 12}
            stroke="#f59e0b"
            strokeWidth={6}
            strokeLinecap="round"
          />
        )}

        {/* Fret position inlay markers */}
        {FRETS.map(fret => {
          const mx = getDotCx(fret);
          if (DOUBLE_MARKERS.has(fret)) {
            return (
              <g key={fret} data-testid={`inlay-${fret}`}>
                <circle cx={mx} cy={(STRING_Y[1] + STRING_Y[2]) / 2} r={5} fill="var(--color-fret-marker, #1e1e35)" />
                <circle cx={mx} cy={(STRING_Y[3] + STRING_Y[4]) / 2} r={5} fill="var(--color-fret-marker, #1e1e35)" />
              </g>
            );
          }
          if (FRET_MARKERS.has(fret)) {
            return (
              <circle
                key={fret}
                data-testid={`inlay-${fret}`}
                cx={mx}
                cy={midY}
                r={5}
                fill="var(--color-fret-marker, #1e1e35)"
              />
            );
          }
          return null;
        })}

        {/* Nut labels — visual top is high e (strings[5]), visual bottom is low E (strings[0]) */}
        {STRING_Y.map((y, i) => (
          <text
            key={i}
            data-testid={`nut-label-${i}`}
            x={NUT_LABEL_X}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="var(--font-mono, 'JetBrains Mono Variable', monospace)"
            fontSize={11}
            fill="var(--color-text-primary, #e2e8f0)"
          >
            {capoPosition > 0
              ? getNoteAtFret(openStrings[STRING_COUNT - 1 - i], capoPosition)
              : openStrings[STRING_COUNT - 1 - i]}
          </text>
        ))}

        {/* Fret numbers along the bottom */}
        {FRETS.map(fret => {
          const isMarked = FRET_MARKERS.has(fret) || DOUBLE_MARKERS.has(fret);
          return (
            <text
              key={fret}
              data-testid={`fret-number-${fret}`}
              x={getDotCx(fret)}
              y={FRET_NUMBER_Y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="var(--font-mono, 'JetBrains Mono Variable', monospace)"
              fontSize={10}
              fontWeight={isMarked ? 'bold' : 'normal'}
              fill={isMarked ? '#d4a017' : '#8892a4'}
            >
              {fret}
            </text>
          );
        })}

        {/* Scale / root highlight dots */}
        {dots.map(dot => (
          <FretDot
            key={`${dot.fret}-${dot.string}`}
            fret={dot.fret}
            string={dot.string}
            state={dot.state}
            note={dot.note}
            cx={dot.cx}
            cy={dot.cy}
            sizeScale={getDotScale(dot.fret)}
            showNoteName={noteNamesVisible}
          />
        ))}

        {/* Freeform dots — rendered after scale dots so cyan appears on top */}
        {freeformDots.map(dot => (
          <FretDot
            key={`free-${dot.fret}-${dot.string}`}
            fret={dot.fret}
            string={dot.string}
            state={dot.state}
            note={dot.note}
            cx={dot.cx}
            cy={dot.cy}
            sizeScale={getDotScale(dot.fret)}
            showNoteName={noteNamesVisible}
          />
        ))}

        {/* Fret hit targets — enable click + keyboard freeform marking */}
        {Array.from({ length: STRING_COUNT }, (_, stringIdx) =>
          Array.from({ length: FRET_COUNT + 1 }, (_, fret) => {
            const cx = getDotCx(fret);
            const cy = getDotCy(stringIdx);
            const w = fret === 0 ? NUT_X : (getFretLineX(fret) - getFretLineX(fret - 1));
            const h = 30;
            const isBelowCapo = fret > 0 && fret < capoPosition;
            return (
              <rect
                key={`hit-${fret}-${stringIdx}`}
                x={cx - w / 2}
                y={cy - h / 2}
                width={w}
                height={h}
                fill="transparent"
                tabIndex={freeformModeActive && !isBelowCapo ? 0 : -1}
                role={freeformModeActive && !isBelowCapo ? 'button' : undefined}
                aria-label={freeformModeActive && !isBelowCapo ? `String ${stringIdx + 1}, fret ${fret}` : undefined}
                style={{ cursor: freeformModeActive && !isBelowCapo ? 'pointer' : 'default' }}
                onClick={() => {
                  if (freeformModeActive && !isBelowCapo && onFretClick) {
                    onFretClick({ fret, string: stringIdx });
                  }
                }}
                onKeyDown={(e) => {
                  if ((e.key === ' ' || e.key === 'Enter') && freeformModeActive && !isBelowCapo) {
                    e.preventDefault();
                    if (onFretClick) onFretClick({ fret, string: stringIdx });
                  }
                }}
              />
            );
          })
        )}
      </svg>
    </div>
  );
}

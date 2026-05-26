import { useMemo } from 'react';
import { TUNINGS } from '@/data/tunings.js';
import { FRET_MARKERS, DOUBLE_MARKERS, getNoteAtFret } from '@/utils/musicTheory.js';
import {
  calculateFretboardDots,
  generateAriaLabel,
  getFretLineX,
  getDotCx,
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

const FRETS = Array.from({ length: FRET_COUNT }, (_, i) => i + 1); // [1..24]

interface FretboardCanvasProps {
  tuning: string;
  rootNote: string;
  scaleName: string;
  capoPosition?: number;
  modeIndex?: number | null;
}

export default function FretboardCanvas({
  tuning,
  rootNote,
  scaleName,
  capoPosition = 0,
  modeIndex = null,
}: FretboardCanvasProps) {
  const strings = (TUNINGS as Record<string, string[]>)[tuning] ?? TUNINGS['Standard E'];

  const ariaLabel = useMemo(
    () => generateAriaLabel(tuning, rootNote, scaleName, modeIndex, capoPosition),
    [tuning, rootNote, scaleName, modeIndex, capoPosition]
  );

  const dots = useMemo(
    () => calculateFretboardDots(tuning, rootNote, scaleName, capoPosition, modeIndex),
    [tuning, rootNote, scaleName, capoPosition, modeIndex]
  );

  const midY = (STRING_Y[2] + STRING_Y[3]) / 2;

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
          <line
            key={i}
            data-testid="string-line"
            x1={NUT_X}
            y1={y}
            x2={FRET_AREA_RIGHT}
            y2={y}
            stroke="var(--color-string, #3a3a5c)"
            strokeWidth={0.5 + i * 0.2}
          />
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
          <line
            key={fret}
            data-testid="fret-line"
            x1={getFretLineX(fret)}
            y1={STRING_Y[0] - 12}
            x2={getFretLineX(fret)}
            y2={STRING_Y[STRING_COUNT - 1] + 12}
            stroke="var(--color-fret, #5a5a90)"
            strokeWidth={2}
          />
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
              ? getNoteAtFret(strings[STRING_COUNT - 1 - i], capoPosition)
              : strings[STRING_COUNT - 1 - i]}
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
              fontSize={9}
              fill={isMarked ? 'var(--color-text-primary, #e2e8f0)' : 'var(--color-text-muted, #334155)'}
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
          />
        ))}
      </svg>
    </div>
  );
}

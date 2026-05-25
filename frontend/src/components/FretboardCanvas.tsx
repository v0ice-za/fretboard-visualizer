import { useMemo } from 'react';
import { TUNINGS } from '@/data/tunings.js';
import { FRET_MARKERS, DOUBLE_MARKERS } from '@/utils/musicTheory.js';
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
}

export default function FretboardCanvas({
  tuning,
  rootNote,
  scaleName,
  capoPosition = 0,
}: FretboardCanvasProps) {
  const strings = (TUNINGS as Record<string, string[]>)[tuning] ?? TUNINGS['Standard E'];

  const ariaLabel = useMemo(
    () => generateAriaLabel(tuning, rootNote, scaleName),
    [tuning, rootNote, scaleName]
  );

  const dots = useMemo(
    () => calculateFretboardDots(tuning, rootNote, scaleName, capoPosition),
    [tuning, rootNote, scaleName, capoPosition]
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

        {/* String horizontal lines (index 0 = low E at top) */}
        {STRING_Y.map((y, i) => (
          <line
            key={i}
            data-testid="string-line"
            x1={NUT_X}
            y1={y}
            x2={FRET_AREA_RIGHT}
            y2={y}
            stroke="var(--color-string, #3a3a5c)"
            strokeWidth={0.5 + (STRING_COUNT - 1 - i) * 0.2}
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
            stroke="var(--color-fret, #1a1a2e)"
            strokeWidth={1.5}
          />
        ))}

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

        {/* Nut labels — open string note names, left of nut */}
        {strings.map((note, i) => (
          <text
            key={i}
            data-testid={`nut-label-${i}`}
            x={NUT_LABEL_X}
            y={STRING_Y[i]}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="var(--font-mono, 'JetBrains Mono Variable', monospace)"
            fontSize={11}
            fill="var(--color-text-primary, #e2e8f0)"
          >
            {note}
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
            cx={dot.cx}
            cy={dot.cy}
          />
        ))}
      </svg>
    </div>
  );
}

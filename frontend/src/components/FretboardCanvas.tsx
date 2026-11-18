import { useLayoutEffect, useMemo, useRef } from 'react';
import { TUNINGS } from '@/data/tunings.js';
import { FRET_MARKERS, DOUBLE_MARKERS, getNoteAtFret } from '@/utils/musicTheory.js';
import { CHORDS } from '@/data/chords.js';
import {
  calculateFretboardDots,
  calculateChordDots,
  calculateFreeformDots,
  calculateKeyRootMarkers,
  generateAriaLabel,
  getLegendEntries,
  getFretLineX,
  getDotCx,
  getDotCy,
  mirrorX,
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
import FretboardLegend from './FretboardLegend';
import type { DotState } from '@/utils/fretboardUtils';
import type { FreeformMark } from '@/stores/fretboardStore';

const FRETS = Array.from({ length: FRET_COUNT }, (_, i) => i + 1); // [1..24]

// Story 8.3 instrument materials
const BOARD_DEPTH_ID = 'fretboard-depth';
/** Pearl inlay: oyster fill with a faint cyan refraction rim. */
const PEARL = {
  fill: 'var(--inlay-pearl, #e2e8f0)',
  fillOpacity: 0.2,
  stroke: 'var(--inlay-refraction, rgba(34,211,238,0.15))',
  strokeWidth: 1,
} as const;

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
  /** Root the active chord elsewhere than rootNote (diatonic chords each have their
   *  own root — ii of C major = D). Falls back to rootNote when null/undefined. */
  chordRoot?: string | null;
  /** Explicit pitch-class open strings (low→high), overriding the by-name TUNINGS lookup.
   *  Supplied for custom tunings (which aren't in TUNINGS) and the creator's live preview. */
  strings?: string[];
  onFretClick?: (mark: { fret: number; string: number }) => void;
  /** Render the dot-colour legend under the board (main app only, not the tuning-creator preview). */
  showLegend?: boolean;
  /** Mirror the board horizontally — nut on the right. Done by coordinate
   *  mapping (x → VIEWBOX_WIDTH − x), never a scale transform, so text stays upright. */
  leftHanded?: boolean;
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
  chordRoot,
  strings,
  onFretClick,
  showLegend = false,
  leftHanded = false,
}: FretboardCanvasProps) {
  const openStrings = strings ?? (TUNINGS as Record<string, string[]>)[tuning] ?? TUNINGS['Standard E'];

  // A chord is only "shown" when its name resolves — an unknown name falls back to the
  // scale view, and the rings, legend, and aria-label must agree with what's drawn.
  const chord = chordName ? (CHORDS as Record<string, { intervals: number[] }>)[chordName] : undefined;
  const chordActive = chord !== undefined;
  const effectiveChordRoot = chordRoot ?? rootNote;

  const ariaLabel = useMemo(
    () =>
      generateAriaLabel(
        tuning,
        rootNote,
        scaleName,
        modeIndex,
        capoPosition,
        chordActive && chordName ? { root: effectiveChordRoot, type: chordName } : null
      ),
    [tuning, rootNote, scaleName, modeIndex, capoPosition, chordActive, chordName, effectiveChordRoot]
  );

  const dots = useMemo(() => {
    if (chord) return calculateChordDots(chord.intervals, effectiveChordRoot, tuning, capoPosition, strings)
    return calculateFretboardDots(tuning, rootNote, scaleName, capoPosition, modeIndex, strings)
  }, [chord, effectiveChordRoot, tuning, rootNote, scaleName, capoPosition, modeIndex, strings]);

  const keyRootMarkers = useMemo(
    () => (chordActive ? calculateKeyRootMarkers(rootNote, effectiveChordRoot, tuning, capoPosition, strings) : []),
    [chordActive, rootNote, effectiveChordRoot, tuning, capoPosition, strings]
  );

  // Positions already carrying a (labelled) chord dot — a ring around one of these
  // must not repeat the note name.
  const dotPositions = useMemo(() => new Set(dots.map(d => `${d.fret}-${d.string}`)), [dots]);

  const freeformDots = useMemo(
    () => calculateFreeformDots(freeformMarks, tuning, capoPosition),
    [freeformMarks, tuning, capoPosition]
  );

  const legendEntries = useMemo(() => {
    if (!showLegend) return [];
    const states = new Set<DotState>();
    for (const d of dots) states.add(d.state);
    if (keyRootMarkers.length > 0) states.add('key-root');
    if (freeformDots.length > 0) states.add('freeform');
    return getLegendEntries({ chordActive, states });
  }, [showLegend, dots, keyRootMarkers, freeformDots, chordActive]);

  const midY = (STRING_Y[2] + STRING_Y[3]) / 2;

  // Every x below is computed right-handed, then passed through these at render time.
  const mx = (x: number) => mirrorX(x, leftHanded);
  const mRectX = (x: number, w: number) => (leftHanded ? VIEWBOX_WIDTH - x - w : x);
  // Hit-target DOM (= Tab) order follows the visual left→right direction.
  const hitFrets = Array.from({ length: FRET_COUNT + 1 }, (_, i) => (leftHanded ? FRET_COUNT - i : i));

  // On narrow screens the board scrolls; keep the nut in view on mount and whenever the
  // orientation flips — but only then, so the user's own scrolling is never fought.
  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = leftHanded ? el.scrollWidth - el.clientWidth : 0;
  }, [leftHanded]);

  // Dot size scales with fret column width — fret 1 is the reference (full size)
  const fret1Width = getFretLineX(1) - NUT_X;
  const getDotScale = (fret: number) => {
    if (fret === 0) return 1;
    const w = getFretLineX(fret) - getFretLineX(fret - 1);
    return Math.max(0.55, w / fret1Width);
  };

  return (
    <>
      <div
        ref={scrollRef}
        style={{ overflowX: 'auto', touchAction: 'pan-x' }}
        className="fretboard-well"
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
          <defs>
            {/* Story 8.3: recessed-board depth — shade only the top/bottom edges
                (outside the string band) so the dots' contrast basis, the flat
                --color-fretboard, is untouched where dots actually sit. */}
            <linearGradient id={BOARD_DEPTH_ID} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--board-edge-shade, rgba(0,0,0,0.55))' }} />
              <stop offset="0.09" style={{ stopColor: 'var(--board-edge-shade, rgba(0,0,0,0.55))', stopOpacity: 0 }} />
              <stop offset="0.93" style={{ stopColor: 'var(--board-edge-shade, rgba(0,0,0,0.55))', stopOpacity: 0 }} />
              <stop offset="1" style={{ stopColor: 'var(--board-edge-shade, rgba(0,0,0,0.55))' }} />
            </linearGradient>
          </defs>

          {/* Fretboard surface */}
          <rect
            x={mRectX(NUT_X, FRET_AREA_RIGHT - NUT_X)}
            y={STRING_Y[0] - 14}
            width={FRET_AREA_RIGHT - NUT_X}
            height={STRING_Y[STRING_COUNT - 1] - STRING_Y[0] + 28}
            fill="var(--color-fretboard, #0b0b16)"
            rx={2}
          />
          <rect
            x={mRectX(NUT_X, FRET_AREA_RIGHT - NUT_X)}
            y={STRING_Y[0] - 14}
            width={FRET_AREA_RIGHT - NUT_X}
            height={STRING_Y[STRING_COUNT - 1] - STRING_Y[0] + 28}
            fill={`url(#${BOARD_DEPTH_ID})`}
            rx={2}
            pointerEvents="none"
          />

          {/* Capo dim overlay — covers frets 0 through capoPosition-1 */}
          {capoPosition > 0 && (
            <rect
              data-testid="capo-dim"
              x={mRectX(0, getFretLineX(capoPosition - 1) || NUT_X)}
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
                x1={mx(NUT_X)}
                y1={y + 0.8}
                x2={mx(FRET_AREA_RIGHT)}
                y2={y + 0.8}
                stroke="rgba(0,0,0,0.6)"
                strokeWidth={1.0 + i * 0.4}
              />
              {/* Main string */}
              <line
                x1={mx(NUT_X)}
                y1={y}
                x2={mx(FRET_AREA_RIGHT)}
                y2={y}
                // Story 8.3: wound bronze on the three low strings (visual bottom,
                // i >= 3), drawn steel on the trebles.
                stroke={i >= 3
                  ? 'var(--string-wound, var(--color-string, #b8b8d0))'
                  : 'var(--string-plain, var(--color-string, #b8b8d0))'}
                strokeWidth={1.0 + i * 0.4}
                opacity={0.85}
              />
              {/* Specular highlight on top */}
              <line
                x1={mx(NUT_X)}
                y1={y - 0.4}
                x2={mx(FRET_AREA_RIGHT)}
                y2={y - 0.4}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={0.5 + i * 0.15}
              />
            </g>
          ))}

          {/* Nut line (thick vertical bar at fret 0) */}
          <line
            x1={mx(NUT_X)}
            y1={STRING_Y[0] - 12}
            x2={mx(NUT_X)}
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
                x1={mx(getFretLineX(fret) + 1)}
                y1={STRING_Y[0] - 12}
                x2={mx(getFretLineX(fret) + 1)}
                y2={STRING_Y[STRING_COUNT - 1] + 12}
                stroke="var(--fret-wire-shadow, rgba(0,0,0,0.5))"
                strokeWidth={1.5}
              />
              {/* Main fret bar — nickel-silver core (Story 8.3) */}
              <line
                data-testid="fret-line"
                x1={mx(getFretLineX(fret))}
                y1={STRING_Y[0] - 12}
                x2={mx(getFretLineX(fret))}
                y2={STRING_Y[STRING_COUNT - 1] + 12}
                stroke="var(--fret-wire, var(--color-fret, #9090c0))"
                strokeWidth={3}
              />
              {/* Specular highlight (left edge) */}
              <line
                x1={mx(getFretLineX(fret) - 1)}
                y1={STRING_Y[0] - 12}
                x2={mx(getFretLineX(fret) - 1)}
                y2={STRING_Y[STRING_COUNT - 1] + 12}
                stroke="var(--fret-wire-highlight, rgba(255,255,255,0.18))"
                strokeWidth={1}
                opacity={0.7}
              />
            </g>
          ))}

          {/* Capo indicator — amber bar at the left boundary of capo fret column */}
          {capoPosition > 0 && (
            <line
              data-testid="capo-indicator"
              x1={mx(getFretLineX(capoPosition - 1))}
              y1={STRING_Y[0] - 12}
              x2={mx(getFretLineX(capoPosition - 1))}
              y2={STRING_Y[STRING_COUNT - 1] + 12}
              stroke="#f59e0b"
              strokeWidth={6}
              strokeLinecap="round"
            />
          )}

          {/* Fret position inlay markers */}
          {FRETS.map(fret => {
            const ix = mx(getDotCx(fret));
            if (DOUBLE_MARKERS.has(fret)) {
              return (
                <g key={fret} data-testid={`inlay-${fret}`}>
                  <circle cx={ix} cy={(STRING_Y[1] + STRING_Y[2]) / 2} r={5} {...PEARL} />
                  <circle cx={ix} cy={(STRING_Y[3] + STRING_Y[4]) / 2} r={5} {...PEARL} />
                </g>
              );
            }
            if (FRET_MARKERS.has(fret)) {
              return (
                <circle
                  key={fret}
                  data-testid={`inlay-${fret}`}
                  cx={ix}
                  cy={midY}
                  r={5}
                  {...PEARL}
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
              x={mx(NUT_LABEL_X)}
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
                x={mx(getDotCx(fret))}
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
              cx={mx(dot.cx)}
              cy={dot.cy}
              sizeScale={getDotScale(dot.fret)}
              showNoteName={noteNamesVisible}
            />
          ))}

          {/* Key-root rings — after the chord dots so a ring encircles a chord tone it shares a position with */}
          {keyRootMarkers.map(marker => (
            <FretDot
              key={`key-root-${marker.fret}-${marker.string}`}
              fret={marker.fret}
              string={marker.string}
              state={marker.state}
              note={marker.note}
              cx={mx(marker.cx)}
              cy={marker.cy}
              sizeScale={getDotScale(marker.fret)}
              showNoteName={noteNamesVisible && !dotPositions.has(`${marker.fret}-${marker.string}`)}
            />
          ))}

          {/* Freeform dots — rendered after scale dots so freeform (pink) appears on top */}
          {freeformDots.map(dot => (
            <FretDot
              key={`free-${dot.fret}-${dot.string}`}
              fret={dot.fret}
              string={dot.string}
              state={dot.state}
              note={dot.note}
              cx={mx(dot.cx)}
              cy={dot.cy}
              sizeScale={getDotScale(dot.fret)}
              showNoteName={noteNamesVisible}
            />
          ))}

          {/* Fret hit targets — enable click + keyboard freeform marking */}
          {Array.from({ length: STRING_COUNT }, (_, stringIdx) =>
            hitFrets.map((fret) => {
              const cx = mx(getDotCx(fret));
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
      <FretboardLegend entries={legendEntries} />
    </>
  );
}

import { DOT_CONFIG } from './FretDot';
import type { LegendEntry } from '@/utils/fretboardUtils';

const SWATCH = 14;
const C = SWATCH / 2;

/** Mini version of a FretDot, drawn from the same DOT_CONFIG so the legend can't drift. */
function Swatch({ state }: { state: LegendEntry['state'] }) {
  const { fill, opacity } = DOT_CONFIG[state];
  return (
    <svg width={SWATCH} height={SWATCH} viewBox={`0 0 ${SWATCH} ${SWATCH}`} aria-hidden="true" className="shrink-0">
      {state === 'key-root' ? (
        <circle cx={C} cy={C} r={C - 1.5} fill="none" stroke={fill} strokeWidth={2} opacity={opacity} />
      ) : (
        <circle cx={C} cy={C} r={state === 'freeform' ? C - 3 : C - 1} fill={fill} opacity={opacity} />
      )}
      {state === 'freeform' && (
        <circle cx={C} cy={C} r={C - 0.75} fill="none" stroke={fill} strokeWidth={1} strokeDasharray="2 1.5" opacity={opacity} />
      )}
    </svg>
  );
}

/** Explains the dot colours currently on the fretboard (Story 7.1). */
export default function FretboardLegend({ entries }: { entries: LegendEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <ul
      aria-label="Fretboard legend"
      className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground"
    >
      {entries.map(({ state, label }) => (
        <li key={state} className="flex items-center gap-1.5">
          <Swatch state={state} />
          {label}
        </li>
      ))}
    </ul>
  );
}

import './ProGate.css';

const FEATURE_INFO = {
  chords: {
    title: 'Chord Finder',
    tagline: 'Every voicing, every shape, every tuning.',
    description: 'Explore hundreds of chord voicings, barre chords, and inversions mapped to any tuning. Find exactly the right shape for any chord, anywhere on the neck.',
    perks: [
      'Chord diagrams for all positions',
      'Barre & open chord variants',
      'Inversions & voicing explorer',
      'Works with all tunings',
    ],
  },
  'ear-training': {
    title: 'Ear Training',
    tagline: 'Build the skill that lasts a lifetime.',
    description: 'Train your musical ear with interval recognition, scale identification, and chord recognition exercises. Track your progress and watch your ear improve over time.',
    perks: [
      'Interval recognition drills',
      'Scale identification exercises',
      'Chord recognition training',
      'Progress tracking',
    ],
  },
  'scale-library': {
    title: 'Scale Library',
    tagline: 'Go deeper into every scale.',
    description: 'An in-depth reference for every scale and mode — theory, characteristic intervals, common uses, and related chords. Built for both improvisation and composition.',
    perks: [
      'Full mode relationships',
      'Characteristic interval analysis',
      'Jazz & classical context',
      'Related chord suggestions',
    ],
  },
};

const LockIcon = () => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
    <rect x="6" y="16" width="24" height="17" rx="3.5" stroke="currentColor" strokeWidth="2"/>
    <path d="M11 16v-4.5a7 7 0 0114 0V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="18" cy="24.5" r="2.5" fill="currentColor"/>
  </svg>
);

export default function ProGate({ feature }) {
  const info = FEATURE_INFO[feature] ?? {
    title: feature,
    tagline: 'Pro feature',
    description: 'This feature is available on the Pro plan.',
    perks: [],
  };

  return (
    <div className="pro-gate">
      <div className="pro-gate-card">
        <div className="pro-gate-lock">
          <LockIcon />
        </div>
        <span className="pro-gate-badge">Pro</span>
        <h2 className="pro-gate-title">{info.title}</h2>
        <p className="pro-gate-tagline">{info.tagline}</p>
        <p className="pro-gate-desc">{info.description}</p>
        {info.perks.length > 0 && (
          <ul className="pro-gate-perks">
            {info.perks.map(perk => (
              <li key={perk} className="pro-gate-perk">
                <span className="pro-gate-check">✓</span>
                {perk}
              </li>
            ))}
          </ul>
        )}
        <button className="pro-gate-cta">Upgrade to Pro</button>
        <p className="pro-gate-note">Coming soon — join the waitlist</p>
      </div>
    </div>
  );
}

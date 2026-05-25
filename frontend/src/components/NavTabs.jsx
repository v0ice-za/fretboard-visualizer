import './NavTabs.css';

const ICONS = {
  fretboard: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <line x1="1" y1="3.5" x2="14" y2="3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="1" y1="7.5" x2="14" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="1" y1="11.5" x2="14" y2="11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="4.5" y1="1.5" x2="4.5" y2="13.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
      <line x1="10.5" y1="1.5" x2="10.5" y2="13.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  chords: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="4.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="10.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="7.5" cy="10.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <line x1="6.5" y1="5" x2="8.5" y2="5" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="5.5" y1="6.5" x2="6.5" y2="9" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="9.5" y1="6.5" x2="8.5" y2="9" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  'ear-training': (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5C5 1.5 3 3.5 3 6c0 2 1.5 3.5 3 4.2V12a1.5 1.5 0 003 0v-1.8c1.5-.7 3-2.2 3-4.2 0-2.5-2-4.5-4.5-4.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.5 6c0-1.1.9-2 2-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  'scale-library': (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="2" width="3" height="11" rx="0.8" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="6" y="2" width="3" height="11" rx="0.8" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M10.5 3l2.5 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
};

const LockIcon = () => (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
    <rect x="1.5" y="4" width="6" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M3 4V2.8a1.5 1.5 0 013 0V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

export default function NavTabs({ pages, active, onSelect }) {
  return (
    <nav className="nav-tabs">
      <div className="nav-tabs-inner">
        <div className="nav-tabs-list">
          {pages.map(p => (
            <button
              key={p.id}
              className={`nav-tab ${active === p.id ? 'nav-tab--active' : ''} ${p.pro ? 'nav-tab--locked' : ''}`}
              onClick={() => onSelect(p.id)}
            >
              <span className="nav-tab-icon">{ICONS[p.id]}</span>
              <span className="nav-tab-label">{p.label}</span>
              {p.pro && (
                <span className="nav-tab-pro">
                  <LockIcon />
                  Pro
                </span>
              )}
            </button>
          ))}
        </div>
        <button className="nav-upgrade-btn">Upgrade to Pro</button>
      </div>
    </nav>
  );
}

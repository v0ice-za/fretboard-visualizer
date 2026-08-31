import { useState } from 'react';
import { Type, Pencil, Library, User } from 'lucide-react';
import { CHROMATIC_NOTES } from '@/data/notes.js';
import { SCALES, SCALE_NAMES, SCALE_CATEGORIES } from '@/data/scales.js';
import { FREE_TUNINGS } from '@/data/freeTunings';
import { useFretboardStore } from '@/stores/fretboardStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { apiClient } from '@/lib/apiClient';
import { queryClient } from '@/lib/queryClient';
import { LoginModal } from '@/features/auth/LoginModal';
import CustomTuningCreator from '@/features/settings/CustomTuningCreator';
import { subscriptionQueryKey } from '@/hooks/useSubscription';
import { useCustomTunings } from '@/hooks/useCustomTunings';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

// Sentinel Select value that opens the creator instead of selecting a tuning.
const CREATE_TUNING_VALUE = '__create_custom_tuning__';

export default function ControlBar() {
  const {
    tuning, setTuning,
    rootNote, setRootNote,
    scaleName, setScaleName,
    capoPosition, setCapoPosition,
    noteNamesVisible, setNoteNamesVisible,
    freeformModeActive, setFreeformModeActive,
  } = useFretboardStore();
  const { activeLayout, setLayout } = useLayoutStore();
  const { sidePanel } = activeLayout;
  const loginOpen = useLayoutStore((s) => s.loginModalOpen);
  const openLoginModal = useLayoutStore((s) => s.openLoginModal);
  const closeLoginModal = useLayoutStore((s) => s.closeLoginModal);

  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isPremium = useSubscriptionStore((s) => s.isPremium);
  const user = useAuthStore((s) => s.user);
  const [accountOpen, setAccountOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const { data: customTunings } = useCustomTunings();

  const onTuningChange = (v: string | null) => {
    if (!v) return;
    if (v === CREATE_TUNING_VALUE) { setCreatorOpen(true); return; }
    setTuning(v);
  };

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Best-effort — the server may already consider the session gone. Clear locally regardless.
    }
    useAuthStore.getState().clearAuth();
    useSubscriptionStore.getState().setIsPremium(false);
    queryClient.removeQueries({ queryKey: subscriptionQueryKey });
    setAccountOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-[var(--color-surface,#0f0f1a)] border-b border-[var(--color-border,#1e1e30)]">
      {/* Logo */}
      <span className="app-logo flex-shrink-0">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 19L19 3M3 19c0 0 2-1 4-1s4 1 4 1 2-1 4-1 2 1 2 1" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="11" cy="11" r="2" fill="#fbbf24" />
        </svg>
      </span>

      {/* Tuning */}
      <Select value={tuning} onValueChange={onTuningChange}>
        <SelectTrigger className="w-40" aria-label="Tuning">
          {(FREE_TUNINGS as readonly string[]).includes(tuning)
            ? <SelectValue />
            : <span className="flex flex-1 text-left text-sm">{tuning}</span>
          }
        </SelectTrigger>
        <SelectContent>
          {FREE_TUNINGS.map(name => (
            <SelectItem key={name} value={name}>{name}</SelectItem>
          ))}
          {isPremium && customTunings && customTunings.length > 0 && (
            <SelectGroup>
              <SelectLabel>My Tunings</SelectLabel>
              {customTunings.map(t => (
                <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
              ))}
            </SelectGroup>
          )}
          {isPremium && (
            <SelectItem value={CREATE_TUNING_VALUE}>＋ Create Custom Tuning</SelectItem>
          )}
        </SelectContent>
      </Select>

      {/* Key (root note) */}
      <Select value={rootNote} onValueChange={(v) => v && setRootNote(v)}>
        <SelectTrigger className="w-24" aria-label="Key">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CHROMATIC_NOTES.map(note => (
            <SelectItem key={note} value={note}>{note}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Scale (grouped by category) */}
      <Select value={scaleName} onValueChange={(v) => v && setScaleName(v)}>
        <SelectTrigger className="w-52" aria-label="Scale">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SCALE_CATEGORIES.map((cat: string) => (
            <SelectGroup key={cat}>
              <SelectLabel>{cat}</SelectLabel>
              {(SCALE_NAMES as string[]).filter(n => (SCALES as Record<string, { category: string }>)[n].category === cat).map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {/* Capo */}
      <div className="flex items-center gap-2 flex-shrink-0" aria-label="Capo position">
        <span id="capo-label" className="text-xs text-slate-400 whitespace-nowrap">
          {capoPosition === 0 ? 'Capo: None' : `Capo: ${capoPosition}`}
        </span>
        <Slider
          min={0}
          max={12}
          step={1}
          value={[capoPosition]}
          onValueChange={(v) => { const n = Array.isArray(v) ? v[0] : v; if (typeof n === 'number') setCapoPosition(n); }}
          className="w-20"
          aria-labelledby="capo-label"
        />
      </div>

      {/* Right-aligned icon buttons */}
      <div className="flex-shrink-0 flex items-center gap-1 ml-auto">
        <button
          onClick={() => setNoteNamesVisible(!noteNamesVisible)}
          className={`p-2 rounded-lg transition-colors ${
            noteNamesVisible
              ? 'bg-indigo-500/20 text-indigo-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle note names"
          aria-label="Toggle note names"
          aria-pressed={noteNamesVisible}
        >
          <Type size={16} />
        </button>

        <button
          onClick={() => setFreeformModeActive(!freeformModeActive)}
          className={`p-2 rounded-lg transition-colors ${
            freeformModeActive
              ? 'bg-indigo-500/20 text-indigo-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
          title="Toggle freeform mode"
          aria-label="Toggle freeform mode"
          aria-pressed={freeformModeActive}
        >
          <Pencil size={16} />
        </button>

        {/* Library */}
        <button
          onClick={() => setLayout({ sidePanel: !sidePanel })}
          className={`p-2 rounded-lg transition-colors ${
            sidePanel
              ? 'bg-indigo-500/20 text-indigo-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
          title="Library"
          aria-label="Library"
          aria-pressed={sidePanel}
        >
          <Library size={16} />
        </button>

        {/* Account */}
        <button
          className={`p-2 rounded-lg transition-colors ${
            isAuthenticated
              ? 'bg-indigo-500/20 text-indigo-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
          title={isAuthenticated ? 'Account' : 'Sign in'}
          aria-label={isAuthenticated ? 'Account' : 'Sign in'}
          onClick={() => (isAuthenticated ? setAccountOpen(true) : openLoginModal())}
        >
          <User size={16} />
        </button>
      </div>

      {/* Custom tuning creator (premium) */}
      <CustomTuningCreator open={creatorOpen} onOpenChange={setCreatorOpen} />

      {/* Auth overlay (unauthenticated) */}
      <LoginModal open={loginOpen} onOpenChange={(open) => (open ? openLoginModal() : closeLoginModal())} />

      {/* Account menu (authenticated) */}
      <Sheet open={accountOpen} onOpenChange={setAccountOpen}>
        <SheetContent side="right" className="w-full gap-4 p-4 sm:max-w-sm">
          <SheetHeader className="p-0">
            <SheetTitle>Account</SheetTitle>
            <SheetDescription>{user?.name ?? user?.email ?? ''}</SheetDescription>
          </SheetHeader>
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}

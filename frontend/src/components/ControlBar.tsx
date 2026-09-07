import { useState } from 'react';
import { Type, Pencil, Library, User, Sun, Moon, Edit2, Trash2 } from 'lucide-react';
import { CHROMATIC_NOTES } from '@/data/notes.js';
import { SCALES, SCALE_NAMES, SCALE_CATEGORIES } from '@/data/scales.js';
import { TUNINGS } from '@/data/tunings.js';
import { FREE_TUNINGS } from '@/data/freeTunings';
import { useFretboardStore } from '@/stores/fretboardStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { useThemeStore } from '@/stores/themeStore';
import { apiClient } from '@/lib/apiClient';
import { queryClient } from '@/lib/queryClient';
import { LoginModal } from '@/features/auth/LoginModal';
import CustomTuningCreator from '@/features/settings/CustomTuningCreator';
import { subscriptionQueryKey } from '@/hooks/useSubscription';
import { useCustomTunings } from '@/hooks/useCustomTunings';
import { useRenameTuning, useDeleteTuning } from '@/hooks/useTuningMutations';
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
import { Input } from '@/components/ui/input';
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
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const [accountOpen, setAccountOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [renamingTuningName, setRenamingTuningName] = useState('');
  const [deletingTuningName, setDeletingTuningName] = useState('');

  const { data: customTunings } = useCustomTunings();
  const renameMutation = useRenameTuning();
  const deleteMutation = useDeleteTuning();

  const getCurrentCustomTuning = () => customTunings?.find(t => t.name === tuning);
  const isCurrentTuningCustom = getCurrentCustomTuning() !== undefined;

  const onTuningChange = (v: string | null) => {
    if (!v) return;
    if (v === CREATE_TUNING_VALUE) { setCreatorOpen(true); return; }
    setTuning(v);
  };

  const handleRenameClick = () => {
    const tuning = getCurrentCustomTuning();
    if (tuning) {
      setRenamingTuningName(tuning.name);
      setRenameDialogOpen(true);
    }
  };

  const handleRenameSubmit = async () => {
    const currentTuning = getCurrentCustomTuning();
    if (currentTuning && renamingTuningName.trim()) {
      await renameMutation.mutateAsync({
        id: currentTuning.id,
        name: renamingTuningName.trim(),
        strings: currentTuning.strings,
      });
      setRenameDialogOpen(false);
    }
  };

  const handleDeleteClick = () => {
    const tuning = getCurrentCustomTuning();
    if (tuning) {
      setDeletingTuningName(tuning.name);
      setDeleteConfirmOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    const currentTuning = getCurrentCustomTuning();
    if (currentTuning) {
      await deleteMutation.mutateAsync(currentTuning.id);
      // Fallback to Standard E if the deleted tuning was active
      if (tuning === currentTuning.name) {
        setTuning('Standard E');
      }
      setDeleteConfirmOpen(false);
    }
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
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-card border-b border-border">
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
          {/* Free tunings group */}
          <SelectGroup>
            <SelectLabel>Free Tunings</SelectLabel>
            {FREE_TUNINGS.map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectGroup>

          {/* Premium-only tunings (show all predefined minus free) */}
          {isPremium && (
            <SelectGroup>
              <SelectLabel>All Tunings</SelectLabel>
              {Object.keys(TUNINGS).filter((name) => !(FREE_TUNINGS as readonly string[]).includes(name)).map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectGroup>
          )}

          {/* My custom tunings */}
          {isPremium && customTunings && customTunings.length > 0 && (
            <SelectGroup>
              <SelectLabel>My Tunings</SelectLabel>
              {customTunings.map(t => (
                <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
              ))}
            </SelectGroup>
          )}

          {/* Create custom tuning (premium only) */}
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
        <span id="capo-label" className="text-xs text-muted-foreground whitespace-nowrap">
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
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          onClick={() => setNoteNamesVisible(!noteNamesVisible)}
          className={`p-2 rounded-lg transition-colors ${
            noteNamesVisible
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:text-foreground'
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
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:text-foreground'
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
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:text-foreground'
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
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title={isAuthenticated ? 'Account' : 'Sign in'}
          aria-label={isAuthenticated ? 'Account' : 'Sign in'}
          onClick={() => (isAuthenticated ? setAccountOpen(true) : openLoginModal())}
        >
          <User size={16} />
        </button>
      </div>

      {/* Custom tuning actions (rename/delete) — show when a custom tuning is active */}
      {isPremium && isCurrentTuningCustom && (
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={handleRenameClick}
            className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
            title="Rename tuning"
            aria-label="Rename tuning"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-2 rounded-lg transition-colors text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Delete tuning"
            aria-label="Delete tuning"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* Custom tuning creator (premium) */}
      <CustomTuningCreator open={creatorOpen} onOpenChange={setCreatorOpen} />

      {/* Rename tuning sheet */}
      <Sheet open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <SheetContent side="bottom" className="gap-4">
          <SheetHeader className="p-0 mb-4">
            <SheetTitle>Rename Tuning</SheetTitle>
            <SheetDescription>Enter a new name for this tuning</SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            <Input
              placeholder="New tuning name"
              value={renamingTuningName}
              onChange={(e) => setRenamingTuningName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit();
                }
              }}
              disabled={renameMutation.isPending}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRenameDialogOpen(false)} disabled={renameMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleRenameSubmit} disabled={!renamingTuningName.trim() || renameMutation.isPending}>
                {renameMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete tuning confirmation sheet */}
      <Sheet open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <SheetContent side="bottom" className="gap-4">
          <SheetHeader className="p-0 mb-4">
            <SheetTitle>Delete Tuning?</SheetTitle>
            <SheetDescription>
              Delete "{deletingTuningName}"?
              {tuning === deletingTuningName
                ? ' This tuning is currently in use — the board will fall back to Standard E.'
                : ''}
              {' '}This cannot be undone.
            </SheetDescription>
          </SheetHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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

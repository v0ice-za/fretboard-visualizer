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
import { IconButton } from '@/components/shared/IconButton';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

/** Small uppercase category label sitting above a selector's value. */
function SelectCategory({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-none">
      {children}
    </span>
  );
}

/** Vertical hairline divider between logical control groups. */
function Divider() {
  return <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-[var(--glass-border)]" />;
}

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
    <div className="glass-bar relative z-20 flex flex-wrap items-center gap-3 px-5 py-2">
      {/* Logo */}
      <span className="flex-shrink-0 grid size-6 place-items-center rounded-xl [background:var(--signature-grad)] [box-shadow:var(--glow-primary)]">
        <svg width="14" height="14" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M3 19L19 3M3 19c0 0 2-1 4-1s4 1 4 1 2-1 4-1 2 1 2 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="11" cy="11" r="2.2" fill="white" />
        </svg>
      </span>

      <Divider />

      {/* Tuning */}
      <Select value={tuning} onValueChange={onTuningChange}>
        <SelectTrigger className="h-auto! w-44 py-1.5" aria-label="Tuning">
          <span className="flex min-w-0 flex-col items-start gap-0.5">
            <SelectCategory>Tuning</SelectCategory>
            {(FREE_TUNINGS as readonly string[]).includes(tuning)
              ? <SelectValue className="max-w-full truncate text-sm font-medium text-foreground" />
              : <span className="max-w-full truncate text-sm font-medium text-foreground">{tuning}</span>
            }
          </span>
        </SelectTrigger>
        <SelectContent className="glass-overlay">
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
        <SelectTrigger className="h-auto! w-24 py-1.5" aria-label="Key">
          <span className="flex min-w-0 flex-col items-start gap-0.5">
            <SelectCategory>Key</SelectCategory>
            <SelectValue className="max-w-full truncate text-sm font-medium text-foreground" />
          </span>
        </SelectTrigger>
        <SelectContent className="glass-overlay">
          {CHROMATIC_NOTES.map(note => (
            <SelectItem key={note} value={note}>{note}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Scale (grouped by category) */}
      <Select value={scaleName} onValueChange={(v) => v && setScaleName(v)}>
        <SelectTrigger className="h-auto! w-52 py-1.5" aria-label="Scale">
          <span className="flex min-w-0 flex-col items-start gap-0.5">
            <SelectCategory>Scale</SelectCategory>
            <SelectValue className="max-w-full truncate text-sm font-medium text-foreground" />
          </span>
        </SelectTrigger>
        <SelectContent className="glass-overlay">
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

      <Divider />

      {/* Capo */}
      <div className="flex flex-shrink-0 items-center gap-2.5 rounded-lg px-1" aria-label="Capo position">
        <span id="capo-label" className="whitespace-nowrap text-[13px] text-muted-foreground">
          {capoPosition === 0 ? 'Capo: None' : `Capo: ${capoPosition}`}
        </span>
        <Slider
          min={0}
          max={12}
          step={1}
          value={[capoPosition]}
          onValueChange={(v) => { const n = Array.isArray(v) ? v[0] : v; if (typeof n === 'number') setCapoPosition(n); }}
          className="w-24 [&_[data-slot=slider-range]]:[background-image:var(--signature-grad)] [&_[data-slot=slider-thumb]]:size-4 [&_[data-slot=slider-thumb]]:[box-shadow:var(--glow-primary)]"
          aria-labelledby="capo-label"
        />
      </div>

      {/* Right-aligned action cluster — labelled on desktop, tooltip everywhere */}
      <TooltipProvider delay={150}>
        <div className="ml-auto flex flex-shrink-0 items-center gap-1.5">
          {/* Theme toggle */}
          <Tooltip>
            <TooltipTrigger
              render={
                <IconButton
                  onClick={toggleTheme}
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? <Sun /> : <Moon />}
                </IconButton>
              }
            />
            <TooltipContent>{theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</TooltipContent>
          </Tooltip>

          {/* Note names */}
          <Tooltip>
            <TooltipTrigger
              render={
                <IconButton
                  onClick={() => setNoteNamesVisible(!noteNamesVisible)}
                  active={noteNamesVisible}
                  aria-label="Toggle note names"
                  aria-pressed={noteNamesVisible}
                >
                  <Type />
                  <span className="hidden md:inline">Notes</span>
                </IconButton>
              }
            />
            <TooltipContent>Toggle note names</TooltipContent>
          </Tooltip>

          {/* Freeform */}
          <Tooltip>
            <TooltipTrigger
              render={
                <IconButton
                  onClick={() => setFreeformModeActive(!freeformModeActive)}
                  active={freeformModeActive}
                  aria-label="Toggle freeform mode"
                  aria-pressed={freeformModeActive}
                >
                  <Pencil />
                  <span className="hidden md:inline">Draw</span>
                </IconButton>
              }
            />
            <TooltipContent>Toggle freeform mode</TooltipContent>
          </Tooltip>

          {/* Library */}
          <Tooltip>
            <TooltipTrigger
              render={
                <IconButton
                  onClick={() => setLayout({ sidePanel: !sidePanel })}
                  active={sidePanel}
                  aria-label="Library"
                  aria-pressed={sidePanel}
                >
                  <Library />
                  <span className="hidden md:inline">Library</span>
                </IconButton>
              }
            />
            <TooltipContent>Library</TooltipContent>
          </Tooltip>

          {/* Account */}
          <Tooltip>
            <TooltipTrigger
              render={
                <IconButton
                  onClick={() => (isAuthenticated ? setAccountOpen(true) : openLoginModal())}
                  active={isAuthenticated}
                  aria-label={isAuthenticated ? 'Account' : 'Sign in'}
                >
                  <User />
                  <span className="hidden md:inline">{isAuthenticated ? 'Account' : 'Sign in'}</span>
                </IconButton>
              }
            />
            <TooltipContent>{isAuthenticated ? 'Account' : 'Sign in'}</TooltipContent>
          </Tooltip>

          {/* Custom tuning actions (rename/delete) — show when a custom tuning is active */}
          {isPremium && isCurrentTuningCustom && (
            <>
              <Divider />
              <Tooltip>
                <TooltipTrigger
                  render={
                    <IconButton onClick={handleRenameClick} aria-label="Rename tuning">
                      <Edit2 />
                    </IconButton>
                  }
                />
                <TooltipContent>Rename tuning</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <IconButton onClick={handleDeleteClick} tone="destructive" aria-label="Delete tuning">
                      <Trash2 />
                    </IconButton>
                  }
                />
                <TooltipContent>Delete tuning</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </TooltipProvider>

      {/* Custom tuning creator (premium) */}
      <CustomTuningCreator open={creatorOpen} onOpenChange={setCreatorOpen} />

      {/* Rename tuning sheet */}
      <Sheet open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <SheetContent side="bottom" className="glass-overlay gap-5 p-6">
          <SheetHeader className="p-0">
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
        <SheetContent side="bottom" className="glass-overlay gap-5 p-6">
          <SheetHeader className="p-0">
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
        <SheetContent side="right" className="glass-overlay w-full gap-5 p-6 sm:max-w-sm">
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

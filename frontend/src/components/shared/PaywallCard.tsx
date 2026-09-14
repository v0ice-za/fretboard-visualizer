import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import {
  useFloating,
  useDismiss,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
  offset,
  flip,
  shift,
  autoUpdate,
} from '@floating-ui/react'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/apiClient'
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore'
import { useLayoutStore } from '@/stores/layoutStore'
import type { CheckoutSessionResponseDto } from '@/types/api'

interface PaywallCardProps {
  open: boolean
  onClose: () => void
  anchorEl: HTMLElement | null
  inline?: boolean
}

const BENEFITS = [
  'Access all 14 tunings including Drop B, Open A, and more',
  'Full chord library with shape highlighting on any tuning',
  'Session persistence — your fretboard setup saves between visits',
]

function CardBody({ onClose }: { onClose: () => void }) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const openLoginModal = useLayoutStore((s) => s.openLoginModal)

  const checkout = useMutation({
    mutationFn: () => apiClient.post<CheckoutSessionResponseDto>('/checkout/session'),
    onSuccess: (data) => {
      window.location.href = data.url
    },
  })

  const handleUpgrade = () => {
    if (!isAuthenticated) {
      openLoginModal()
      onClose()
      return
    }
    checkout.mutate()
  }

  return (
    <>
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-semibold text-foreground">Unlock Premium</span>
        <button
          onClick={onClose}
          className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--glass-border)] hover:text-foreground"
          aria-label="Dismiss paywall"
        >
          <X size={14} />
        </button>
      </div>
      <ul className="text-xs text-muted-foreground space-y-1.5 mb-3">
        {BENEFITS.map((b) => (
          <li key={b} className="flex gap-2 items-start">
            <span aria-hidden className="mt-1.5 size-1.5 flex-none rounded-full [background:var(--signature-grad)]" />
            {b}
          </li>
        ))}
      </ul>
      <p className="text-sm font-semibold text-foreground mb-3">$12/yr</p>
      {checkout.isError && (
        <p role="alert" className="text-xs text-destructive mb-2">
          Something went wrong — please try again.
        </p>
      )}
      <Button
        size="sm"
        className="w-full text-primary-foreground [background-image:var(--signature-grad)] [box-shadow:var(--glow-primary)]"
        disabled={checkout.isPending}
        onClick={handleUpgrade}
      >
        {checkout.isPending ? 'Redirecting…' : 'Upgrade'}
      </Button>
    </>
  )
}

export default function PaywallCard({ open, onClose, anchorEl, inline = false }: PaywallCardProps) {
  const inlineRef = useRef<HTMLDivElement>(null)

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (nextOpen) => { if (!nextOpen) onClose() },
    placement: 'right',
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  })

  const dismiss = useDismiss(context)
  const { getFloatingProps } = useInteractions([dismiss])

  useEffect(() => {
    refs.setReference(anchorEl)
  }, [anchorEl, refs])

  // Inline Escape handler (Floating UI dismiss doesn't apply in inline mode)
  useEffect(() => {
    if (!open || !inline) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, inline, onClose])

  // Inline click-outside handler
  useEffect(() => {
    if (!open || !inline) return
    const handler = (e: MouseEvent) => {
      if (inlineRef.current && !inlineRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, inline, onClose])

  // Extract before JSX to satisfy react-hooks/refs lint rule
  const setFloatingRef = refs.setFloating

  if (!open) return null

  if (inline) {
    return (
      <div
        ref={inlineRef}
        className="glass-overlay max-w-[280px] mx-auto mt-4 rounded-xl p-4"
        data-testid="paywall-card"
      >
        <CardBody onClose={onClose} />
      </div>
    )
  }

  return (
    <FloatingPortal>
      <FloatingFocusManager context={context} modal={false}>
        <div
          // eslint-disable-next-line react-hooks/refs -- floating-ui callback ref, not a .current read
          ref={setFloatingRef}
          role="dialog"
          aria-label="Upgrade to Premium"
          style={floatingStyles}
          className="glass-overlay z-50 max-w-[280px] rounded-xl p-4"
          data-testid="paywall-card"
          {...getFloatingProps()}
        >
          <CardBody onClose={onClose} />
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  )
}

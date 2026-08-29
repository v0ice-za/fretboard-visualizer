import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import PaywallCard from './PaywallCard'
import { apiClient } from '@/lib/apiClient'
import { useAuthStore, DEFAULT_AUTH } from '@/stores/authStore'
import { useLayoutStore } from '@/stores/layoutStore'

vi.mock('@/lib/apiClient', () => ({
  apiClient: { post: vi.fn(), get: vi.fn(), del: vi.fn() },
}))

const post = apiClient.post as unknown as ReturnType<typeof vi.fn>

function renderPaywall(props: Partial<React.ComponentProps<typeof PaywallCard>> = {}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <PaywallCard open anchorEl={null} onClose={() => {}} inline {...props} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  useAuthStore.setState({ ...DEFAULT_AUTH })
  useLayoutStore.setState({ loginModalOpen: false })
  vi.clearAllMocks()
})

describe('PaywallCard', () => {
  it('renders when open=true (inline)', () => {
    renderPaywall()
    expect(document.querySelector('[data-testid="paywall-card"]')).toBeInTheDocument()
  })

  it('does not render when open=false', () => {
    renderPaywall({ open: false })
    expect(document.querySelector('[data-testid="paywall-card"]')).not.toBeInTheDocument()
  })

  it('shows headline, benefit bullets, price, Upgrade CTA, dismiss button', () => {
    renderPaywall()
    expect(screen.getByText('Unlock Premium')).toBeInTheDocument()
    expect(screen.getByText(/Access all 14 tunings/)).toBeInTheDocument()
    expect(screen.getByText(/Full chord library/)).toBeInTheDocument()
    expect(screen.getByText(/Session persistence/)).toBeInTheDocument()
    expect(screen.getByText('$12/yr')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Upgrade/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dismiss paywall/i })).toBeInTheDocument()
  })

  it('has max-w-[280px] class', () => {
    renderPaywall()
    const card = document.querySelector('[data-testid="paywall-card"]')!
    expect(card.className).toContain('max-w-[280px]')
  })

  it('dismiss button calls onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderPaywall({ onClose })
    await user.click(screen.getByRole('button', { name: /Dismiss paywall/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('Escape key calls onClose (inline mode)', () => {
    const onClose = vi.fn()
    renderPaywall({ onClose })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('click outside closes inline PaywallCard', () => {
    const onClose = vi.fn()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <div>
          <div data-testid="outside">Outside</div>
          <PaywallCard open anchorEl={null} onClose={onClose} inline />
        </div>
      </QueryClientProvider>,
    )
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(onClose).toHaveBeenCalled()
  })

  it('click inside inline PaywallCard does NOT call onClose', () => {
    const onClose = vi.fn()
    renderPaywall({ onClose })
    fireEvent.mouseDown(document.querySelector('[data-testid="paywall-card"]')!)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('inline mode: renders as div block, no dialog role', () => {
    renderPaywall()
    const card = document.querySelector('[data-testid="paywall-card"]')!
    expect(card.tagName).toBe('DIV')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders in desktop (floating) mode with role="dialog"', () => {
    renderPaywall({ inline: false })
    const card = document.querySelector('[data-testid="paywall-card"]')!
    expect(card).toBeInTheDocument()
    expect(card).toHaveAttribute('role', 'dialog')
    expect(card).toHaveAttribute('aria-label', 'Upgrade to Premium')
  })

  describe('Upgrade CTA', () => {
    it('unauthenticated: opens the login modal and dismisses the paywall, does not call checkout', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      renderPaywall({ onClose })

      await user.click(screen.getByRole('button', { name: /Upgrade/i }))

      expect(useLayoutStore.getState().loginModalOpen).toBe(true)
      expect(onClose).toHaveBeenCalled()
      expect(post).not.toHaveBeenCalled()
    })

    it('authenticated: calls checkout and redirects on success', async () => {
      useAuthStore.setState({ accessToken: 't', user: { id: 1, email: 'a@b.c', name: null } })
      post.mockResolvedValue({ url: 'https://checkout.stripe.com/test-session' })
      const user = userEvent.setup()
      const originalLocation = window.location
      // jsdom's window.location is read-only; replace it for this test only.
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...originalLocation, href: '' },
      })

      renderPaywall()
      await user.click(screen.getByRole('button', { name: /Upgrade/i }))

      expect(post).toHaveBeenCalledWith('/checkout/session')
      await waitFor(() => expect(window.location.href).toBe('https://checkout.stripe.com/test-session'))

      Object.defineProperty(window, 'location', { writable: true, value: originalLocation })
    })

    it('authenticated: shows inline error and re-enables the button on failure', async () => {
      useAuthStore.setState({ accessToken: 't', user: { id: 1, email: 'a@b.c', name: null } })
      post.mockRejectedValue(new Error('CHECKOUT_SESSION_FAILED'))
      const user = userEvent.setup()
      renderPaywall()

      await user.click(screen.getByRole('button', { name: /Upgrade/i }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong — please try again.')
      expect(screen.getByRole('button', { name: /Upgrade/i })).not.toBeDisabled()
    })

    it('authenticated: button is disabled and shows a pending label while the mutation is in flight', async () => {
      useAuthStore.setState({ accessToken: 't', user: { id: 1, email: 'a@b.c', name: null } })
      let resolvePost: (v: { url: string }) => void = () => {}
      post.mockReturnValue(new Promise((resolve) => { resolvePost = resolve }))
      const user = userEvent.setup()
      renderPaywall()

      await user.click(screen.getByRole('button', { name: /Upgrade/i }))

      expect(screen.getByRole('button', { name: /Redirecting/i })).toBeDisabled()
      resolvePost({ url: 'https://checkout.stripe.com/test-session' })
    })
  })
})

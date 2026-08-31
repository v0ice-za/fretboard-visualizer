import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'
import CustomTuningCreator from './CustomTuningCreator'
import { useFretboardStore, DEFAULT_FRETBOARD_STATE } from '@/stores/fretboardStore'
import { apiClient } from '@/lib/apiClient'

vi.mock('@/lib/apiClient', () => ({
  apiClient: { post: vi.fn(), get: vi.fn(), del: vi.fn() },
}))

// base-ui (Sheet) uses ResizeObserver internally — polyfill for jsdom
;(globalThis as Record<string, unknown>).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderCreator(onOpenChange = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <CustomTuningCreator open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  )
  return onOpenChange
}

beforeEach(() => {
  useFretboardStore.setState({ ...DEFAULT_FRETBOARD_STATE })
  vi.mocked(apiClient.post).mockReset()
})

describe('CustomTuningCreator', () => {
  it('renders 6 string rows, a name input, and the preview', () => {
    renderCreator()
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByLabelText(`String ${i} note`)).toBeInTheDocument()
      expect(screen.getByLabelText(`String ${i} octave`)).toBeInTheDocument()
    }
    expect(screen.getByLabelText('Tuning name')).toBeInTheDocument()
    expect(screen.getByTestId('tuning-preview')).toBeInTheDocument()
  })

  it('seeds standard tuning and updates the preview when a string changes', async () => {
    const user = userEvent.setup()
    renderCreator()
    // String 1 = low E = strings[0] = visual bottom = nut-label-5
    expect(screen.getByTestId('nut-label-5')).toHaveTextContent('E')
    await user.selectOptions(screen.getByLabelText('String 1 note'), 'C')
    expect(screen.getByTestId('nut-label-5')).toHaveTextContent('C')
  })

  it('Save posts the note+octave payload and closes on success', async () => {
    const user = userEvent.setup()
    vi.mocked(apiClient.post).mockResolvedValue({})
    const onOpenChange = renderCreator()
    await user.type(screen.getByLabelText('Tuning name'), 'My Drop')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/tunings', {
      name: 'My Drop',
      strings: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('Save is disabled while the name is blank', () => {
    renderCreator()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('Discard closes without posting', async () => {
    const user = userEvent.setup()
    const onOpenChange = renderCreator()
    await user.click(screen.getByRole('button', { name: 'Discard' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(apiClient.post).not.toHaveBeenCalled()
  })
})

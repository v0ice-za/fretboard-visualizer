import { useSubscriptionStore, DEFAULT_SUBSCRIPTION } from '@/stores/subscriptionStore'

beforeEach(() => {
  useSubscriptionStore.setState({ ...DEFAULT_SUBSCRIPTION })
})

describe('useSubscriptionStore', () => {
  it('default isPremium is false', () => {
    expect(useSubscriptionStore.getState().isPremium).toBe(false)
  })

  it('setIsPremium(true) updates store', () => {
    useSubscriptionStore.getState().setIsPremium(true)
    expect(useSubscriptionStore.getState().isPremium).toBe(true)
  })
})

import { create } from 'zustand'

interface SubscriptionStore {
  isPremium: boolean
  setIsPremium: (v: boolean) => void
}

export const DEFAULT_SUBSCRIPTION = { isPremium: false }

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  ...DEFAULT_SUBSCRIPTION,
  setIsPremium: (v) => set({ isPremium: v }),
}))

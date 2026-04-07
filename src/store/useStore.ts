import { create } from 'zustand'
import type { Product } from '../data/products'

export type Scene = 'idling' | 'transition' | 'products' | 'detail'

interface AppState {
  scene: Scene
  selectedProduct: Product | null
  transitionProgress: number
  setScene: (scene: Scene) => void
  setSelectedProduct: (product: Product | null) => void
  setTransitionProgress: (progress: number) => void
  goToProducts: () => void
  goToDetail: (product: Product) => void
  goToIdling: () => void
  goBack: () => void
}

export const useStore = create<AppState>((set, get) => ({
  scene: 'idling',
  selectedProduct: null,
  transitionProgress: 0,

  setScene: (scene) => set({ scene }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  setTransitionProgress: (progress) => set({ transitionProgress: progress }),

  goToProducts: () => {
    set({ scene: 'transition', transitionProgress: 0 })
  },

  goToDetail: (product) => {
    set({ selectedProduct: product, scene: 'detail' })
  },

  goToIdling: () => {
    set({ scene: 'idling', selectedProduct: null, transitionProgress: 0 })
  },

  goBack: () => {
    const { scene } = get()
    if (scene === 'detail') {
      set({ scene: 'products', selectedProduct: null })
    } else if (scene === 'products') {
      set({ scene: 'idling', transitionProgress: 0 })
    }
  },
}))

import { create } from 'zustand'
import type { Product } from '../data/products'

export type Scene = 'idling' | 'transition' | 'products' | 'detail'

interface AppState {
  scene: Scene
  selectedProduct: Product | null
  transitionProgress: number
  // Product-select transition: card flies toward camera before detail opens
  cardTransition: boolean
  setScene: (scene: Scene) => void
  setSelectedProduct: (product: Product | null) => void
  setTransitionProgress: (progress: number) => void
  goToProducts: () => void
  goToDetail: (product: Product) => void
  goToIdling: () => void
  goBack: () => void
  startCardTransition: (product: Product) => void
}

export const useStore = create<AppState>((set, get) => ({
  scene: 'idling',
  selectedProduct: null,
  transitionProgress: 0,
  cardTransition: false,

  setScene: (scene) => set({ scene }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  setTransitionProgress: (progress) => set({ transitionProgress: progress }),

  goToProducts: () => {
    set({ scene: 'transition', transitionProgress: 0 })
  },

  goToDetail: (product) => {
    set({ selectedProduct: product, scene: 'detail', cardTransition: false })
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

  // Kick off the card-fly animation → after delay, open detail
  startCardTransition: (product) => {
    set({ cardTransition: true, selectedProduct: product })
    setTimeout(() => {
      get().goToDetail(product)
    }, 680)
  },
}))

import { createContext, useContext } from 'react'

interface ClickContextValue {
  currentClick: number
  totalClicks: number
  /** Map from source line number to its click index */
  lineToClick: Map<number, number>
  /** Map from source line number to how many clicks it consumes */
  lineToStepCount: Map<number, number>
}

export const ClickContext = createContext<ClickContextValue>({
  currentClick: 0,
  totalClicks: 0,
  lineToClick: new Map(),
  lineToStepCount: new Map(),
})

export function useClicks() {
  return useContext(ClickContext)
}

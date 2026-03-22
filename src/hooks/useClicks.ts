import { createContext, useContext } from 'react'

interface ClickContextValue {
  currentClick: number
  totalClicks: number
}

export const ClickContext = createContext<ClickContextValue>({
  currentClick: 0,
  totalClicks: 0,
})

export function useClicks() {
  return useContext(ClickContext)
}

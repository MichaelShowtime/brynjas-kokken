import { createContext, useContext } from 'react'

export const RundvisningContext = createContext({ start: () => {}, aktiv: false })

export function useRundvisning() {
  return useContext(RundvisningContext)
}

import React, { createContext, useContext, useState } from 'react'

export type PeriodOption = '7d' | '30d' | '90d'

interface PeriodContextType {
  period: PeriodOption
  setPeriod: (p: PeriodOption) => void
  periodLabel: string
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined)

export const PeriodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [period, setPeriod] = useState<PeriodOption>('30d')

  const periodLabel =
    period === '7d' ? 'Últimos 7 dias' : period === '30d' ? 'Últimos 30 dias' : 'Últimos 90 dias'

  return (
    <PeriodContext.Provider value={{ period, setPeriod, periodLabel }}>
      {children}
    </PeriodContext.Provider>
  )
}

export function usePeriod(): PeriodContextType {
  const ctx = useContext(PeriodContext)
  if (!ctx) {
    throw new Error('usePeriod must be used within a PeriodProvider')
  }
  return ctx
}

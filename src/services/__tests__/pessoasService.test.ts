import { describe, it, expect } from 'vitest'
import {
  calcularStatusDocumento,
  calcularDiasAteRenovacao,
  type NovaPessoaInput,
} from '@/services/pessoasService'

describe('Módulo Cadastro Unificado de Pessoas - Regras de Negócio', () => {
  it('deve calcular status de documento com vencimento futuro (>30 dias) como vigente', () => {
    const dataFutura = new Date()
    dataFutura.setDate(dataFutura.getDate() + 60)
    const res = calcularStatusDocumento(dataFutura.toISOString().split('T')[0])
    expect(res.status).toBe('vigente')
    expect(res.diasParaVencer).toBeGreaterThan(30)
  })

  it('deve calcular status de documento vencendo em <= 30 dias', () => {
    const dataVencendo = new Date()
    dataVencendo.setDate(dataVencendo.getDate() + 15)
    const res = calcularStatusDocumento(dataVencendo.toISOString().split('T')[0])
    expect(res.status).toBe('vencendo')
    expect(res.diasParaVencer).toBeLessThanOrEqual(30)
    expect(res.diasParaVencer).toBeGreaterThanOrEqual(0)
  })

  it('deve calcular status de documento vencido (< 0 dias)', () => {
    const dataVencida = new Date()
    dataVencida.setDate(dataVencida.getDate() - 10)
    const res = calcularStatusDocumento(dataVencida.toISOString().split('T')[0])
    expect(res.status).toBe('vencido')
    expect(res.diasParaVencer).toBeLessThan(0)
  })

  it('deve retornar sem_validade quando documento não possui data de vencimento', () => {
    const res = calcularStatusDocumento(undefined)
    expect(res.status).toBe('sem_validade')
  })

  it('deve calcular dias até renovação corretamente', () => {
    const dataFutura = new Date()
    dataFutura.setDate(dataFutura.getDate() + 45)
    const dias = calcularDiasAteRenovacao(dataFutura.toISOString().split('T')[0])
    expect(dias).toBe(45)
  })
})

import { describe, it, expect } from 'vitest'
import { preencherTemplate, gerarHashSha256 } from '@/services/contratosService'
import { TEMPLATES_CONTRATUAIS } from '@/services/templatesContrato'

describe('Gestão de Contratos Unificada (PJ e CLT) - Regras de Negócio', () => {
  it('deve possuir templates homologados para PJ e CLT', () => {
    const templatesPj = TEMPLATES_CONTRATUAIS.filter((t) => t.modalidade === 'PJ')
    const templatesClt = TEMPLATES_CONTRATUAIS.filter((t) => t.modalidade === 'CLT')

    expect(templatesPj.length).toBeGreaterThanOrEqual(2)
    expect(templatesClt.length).toBeGreaterThanOrEqual(2)

    const cltExp = TEMPLATES_CONTRATUAIS.find((t) => t.tipoModelo === 'CLT_EXPERIENCIA')
    expect(cltExp).toBeDefined()
    expect(cltExp?.diasAlertaPadrao).toBe(15)

    const pjPadrao = TEMPLATES_CONTRATUAIS.find((t) => t.tipoModelo === 'PJ_PRESTACAO_SERVICOS')
    expect(pjPadrao).toBeDefined()
    expect(pjPadrao?.diasAlertaPadrao).toBe(60)
  })

  it('deve interpolar dados corretamente em template jurídico sem deixar tags pendentes', () => {
    const template = TEMPLATES_CONTRATUAIS[0].conteudoPadrao

    const resultado = preencherTemplate(template, {
      codigoContrato: 'CT-PJ-TESTE-999',
      pessoaNome: 'Mariana Lima',
      pessoaDocumento: '123.456.789-00',
      prestadorRazaoSocial: 'Mariana Lima Consultoria ME',
      prestadorCnpj: '12.345.678/0001-99',
      cargoFuncao: 'Arquiteta Cloud',
      departamento: 'Engenharia',
      centroCusto: 'CC-ENG',
      gestorNome: 'Douglas Severo',
      dataInicio: '2026-01-01',
      dataFim: '2026-12-31',
      prazoTipo: 'Determinado',
      diasAlerta: 60,
      valorMensal: 25000,
      valorHora: 156.25,
      horasBase: 160,
      clausulasEspeciais: 'SLA de 99.9% e plantão de incidentes.',
    })

    expect(resultado).toContain('CT-PJ-TESTE-999')
    expect(resultado).toContain('Mariana Lima Consultoria ME')
    expect(resultado).toContain('12.345.678/0001-99')
    expect(resultado).toContain('Arquiteta Cloud')
    expect(resultado).toContain('R$ 25.000,00')
    expect(resultado).toContain('SLA de 99.9% e plantão de incidentes.')
    expect(resultado).not.toContain('{{CODIGO_CONTRATO}}')
    expect(resultado).not.toContain('{{PESSOA_NOME}}')
  })

  it('deve gerar hash SHA-256 consistente para auditoria imutável', async () => {
    const texto = 'CONTRATO DE TRABALHO HOMOLOGADO SOUYESS V1.0'
    const hash1 = await gerarHashSha256(texto)
    const hash2 = await gerarHashSha256(texto)
    const hashDiferente = await gerarHashSha256(texto + ' alterado')

    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64)
    expect(hash1).not.toBe(hashDiferente)
  })
})

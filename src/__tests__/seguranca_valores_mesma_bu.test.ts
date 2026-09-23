import { describe, it, expect, beforeAll } from 'vitest'
import PocketBase from 'pocketbase'

/**
 * Validação de Segurança: Proteção de campos sensíveis (valor_contratado, valor_hora)
 * e documentos protegidos entre perfis diferentes da MESMA BU (RH vs Gestor).
 *
 * Perfis de Teste:
 * 1. RH: severo.douglas2@gmail.com (acesso total consolidado e financeiro irrestrito)
 * 2. Gestor BU Tecnologia: gestor@empresa.com (empresa: xtt7smd3mrppw30)
 *
 * Colaborador sob teste (mesma BU Tecnologia):
 * - Renato Albuquerque: id 'yrk1td6xkivtcmt', empresa 'xtt7smd3mrppw30'
 * - Contrato: id '2pwjj528ila23ht', código 'CT-PJ-2025-014', empresa 'xtt7smd3mrppw30'
 *
 * Assertivas obrigatórias:
 * (a) Gestor NÃO recebe `valor_contratado` / `valor_hora` em list, view por ID, nem via expand de relacionamentos;
 * (b) RH/Diretoria RECEBE os valores;
 * (c) Documentos protegidos (`documentos_pessoa`) inacessíveis ao gestor (ou estritamente restritos);
 * (d) Funções legítimas (leitura de dados não sensíveis) continuam funcionando para o gestor.
 */

const PB_URL =
  (import.meta as any).env?.VITE_POCKETBASE_URL ||
  'https://sistema-rh-inteligente-4d4e0.shrd00.internal.goskip.dev'

describe('Segurança de Dados Financeiros e Cofre na Mesma BU — RH vs Gestor', () => {
  let pbRh: PocketBase
  let pbGestor: PocketBase

  let userRh: any
  let userGestor: any

  const RENATO_ID = 'yrk1td6xkivtcmt'
  const CONTRATO_RENATO_ID = '2pwjj528ila23ht'

  beforeAll(async () => {
    pbRh = new PocketBase(PB_URL)
    pbGestor = new PocketBase(PB_URL)

    const authRh = await pbRh
      .collection('users')
      .authWithPassword('severo.douglas2@gmail.com', 'Skip@Pass')
    userRh = authRh.record

    const authGestor = await pbGestor
      .collection('users')
      .authWithPassword('gestor@empresa.com', 'Skip@Pass')
    userGestor = authGestor.record
  })

  // 1. Integridade dos perfis
  describe('1. Verificação de autenticação e contexto de BU', () => {
    it('RH e Gestor autenticam corretamente com seus cargos', () => {
      expect(userRh.cargo_funcao).toBe('RH / Recrutador')
      expect(userGestor.cargo_funcao).toBe('Gestor Contratante')
      expect(userGestor.empresa).toBe('xtt7smd3mrppw30')
    })
  })

  // 2. Proteção de valor_contratado e valor_hora em PESSOAS (mesma BU)
  describe('2. Coleção `pessoas`: proteção de campos financeiros sensíveis', () => {
    it('(a) Gestor NÃO recebe valor_contratado nem valor_hora no LIST de pessoas', async () => {
      const pessoas = await pbGestor.collection('pessoas').getFullList()
      expect(pessoas.length).toBeGreaterThanOrEqual(1)

      const renato = pessoas.find((p) => p.id === RENATO_ID)
      expect(renato).toBeDefined()
      // O gestor não pode receber valor_contratado nem valor_hora
      expect(renato?.valor_contratado).toBeFalsy()
      expect(renato?.valor_hora).toBeFalsy()
    })

    it('(a) Gestor NÃO recebe valor_contratado nem valor_hora no VIEW direto por ID', async () => {
      const renato = await pbGestor.collection('pessoas').getOne(RENATO_ID)
      expect(renato.id).toBe(RENATO_ID)
      expect(renato.valor_contratado).toBeFalsy()
      expect(renato.valor_hora).toBeFalsy()
    })

    it('(b) RH RECEBE valor_contratado e valor_hora em list e view de pessoas', async () => {
      const renatoView = await pbRh.collection('pessoas').getOne(RENATO_ID)
      expect(Number(renatoView.valor_contratado)).toBeGreaterThan(0)
      expect(Number(renatoView.valor_hora)).toBeGreaterThan(0)

      const pessoas = await pbRh.collection('pessoas').getFullList({
        filter: `id = '${RENATO_ID}'`,
      })
      expect(pessoas.length).toBe(1)
      expect(Number(pessoas[0].valor_contratado)).toBeGreaterThan(0)
      expect(Number(pessoas[0].valor_hora)).toBeGreaterThan(0)
    })
  })

  // 3. Proteção de valores em CONTRATOS (mesma BU)
  describe('3. Coleção `contratos`: proteção de valor_mensal e valor_hora', () => {
    it('(a) Gestor NÃO recebe valor_mensal nem valor_hora no LIST de contratos', async () => {
      const contratos = await pbGestor.collection('contratos').getFullList()
      const contratoRenato = contratos.find((c) => c.id === CONTRATO_RENATO_ID)
      expect(contratoRenato).toBeDefined()

      expect(contratoRenato?.valor_mensal).toBeFalsy()
      expect(contratoRenato?.valor_hora).toBeFalsy()
    })

    it('(a) Gestor NÃO recebe valor_mensal nem valor_hora no VIEW direto por ID de contratos', async () => {
      const contrato = await pbGestor.collection('contratos').getOne(CONTRATO_RENATO_ID)
      expect(contrato.id).toBe(CONTRATO_RENATO_ID)
      expect(contrato.valor_mensal).toBeFalsy()
      expect(contrato.valor_hora).toBeFalsy()
    })

    it('(b) RH RECEBE valor_mensal e valor_hora em contratos', async () => {
      const contrato = await pbRh.collection('contratos').getOne(CONTRATO_RENATO_ID)
      expect(Number(contrato.valor_mensal)).toBeGreaterThan(0)
      expect(Number(contrato.valor_hora)).toBeGreaterThan(0)
    })
  })

  // 4. Proteção contra vazamento via EXPAND de relacionamentos
  describe('4. Proteção contra vazamento via EXPAND de relacionamentos', () => {
    it('(a) Gestor NÃO recebe campos financeiros ao expandir pessoa a partir de contratos', async () => {
      const contratos = await pbGestor.collection('contratos').getFullList({
        filter: `id = '${CONTRATO_RENATO_ID}'`,
        expand: 'pessoa',
      })
      expect(contratos.length).toBe(1)
      const expandedPessoa = contratos[0].expand?.pessoa
      expect(expandedPessoa).toBeDefined()
      expect(expandedPessoa?.valor_contratado).toBeFalsy()
      expect(expandedPessoa?.valor_hora).toBeFalsy()
    })

    it('(a) Gestor NÃO recebe campos financeiros ao expandir pessoa a partir de apontamentos_horas', async () => {
      const apontamentos = await pbGestor.collection('apontamentos_horas').getFullList({
        filter: `pessoa = '${RENATO_ID}'`,
        expand: 'pessoa',
      })
      expect(apontamentos.length).toBeGreaterThanOrEqual(1)
      for (const ap of apontamentos) {
        if (ap.expand?.pessoa) {
          expect(ap.expand.pessoa.valor_contratado).toBeFalsy()
          expect(ap.expand.pessoa.valor_hora).toBeFalsy()
        }
      }
    })

    it('(a) Gestor NÃO recebe valores financeiros congelados em fechamentos_competencia (ou fechamento restrito)', async () => {
      // fechamentos_competencia possui valor_hora_congelado e valor_total_calculado
      const fechamentos = await pbGestor.collection('fechamentos_competencia').getFullList({
        filter: `pessoa = '${RENATO_ID}'`,
        expand: 'pessoa',
      })
      for (const f of fechamentos) {
        expect(f.valor_hora_congelado).toBeFalsy()
        expect(f.valor_total_calculado).toBeFalsy()
        if (f.expand?.pessoa) {
          expect(f.expand.pessoa.valor_contratado).toBeFalsy()
          expect(f.expand.pessoa.valor_hora).toBeFalsy()
        }
      }
    })

    it('(b) RH RECEBE campos financeiros expandidos', async () => {
      const contratosRh = await pbRh.collection('contratos').getFullList({
        filter: `id = '${CONTRATO_RENATO_ID}'`,
        expand: 'pessoa',
      })
      expect(contratosRh.length).toBe(1)
      expect(Number(contratosRh[0].expand?.pessoa?.valor_contratado)).toBeGreaterThan(0)
      expect(Number(contratosRh[0].expand?.pessoa?.valor_hora)).toBeGreaterThan(0)
    })
  })

  // 5. Proteção de Documentos do Cofre (documentos_pessoa)
  describe('5. Coleção `documentos_pessoa`: documentos protegidos inacessíveis ao gestor', () => {
    it('(c) Gestor NÃO tem acesso a documentos confidenciais/pessoais de documentos_pessoa (list ou view)', async () => {
      // Documentos do Renato: certidão fiscal, contrato de prestação, termo NDA
      // Pela regra de segurança fail-closed, gestores da BU não devem ter acesso indiscriminado aos documentos confidenciais do cofre
      // Apenas RH/Diretoria deve ter acesso aos documentos de documentos_pessoa (ou view deve retornar 404/vazio para gestor)
      const docsGestor = await pbGestor.collection('documentos_pessoa').getFullList({
        filter: `pessoa = '${RENATO_ID}'`,
      })
      // Gestor não deve conseguir listar documentos protegidos
      expect(docsGestor.length).toBe(0)

      // Tentativa de view por ID de um documento existente do Renato
      // Ex: q3w9h6swxzpwbz3 (contrato_prestacao_nexus_cloud_2025_hkel34uy4c.pdf)
      let viewErro: any = null
      try {
        await pbGestor.collection('documentos_pessoa').getOne('q3w9h6swxzpwbz3')
      } catch (err) {
        viewErro = err
      }
      expect(viewErro).not.toBeNull()
      expect(viewErro.status).toBe(404)
    })

    it('(b) RH RECEBE e lista documentos do cofre normalmente', async () => {
      const docsRh = await pbRh.collection('documentos_pessoa').getFullList({
        filter: `pessoa = '${RENATO_ID}'`,
      })
      expect(docsRh.length).toBeGreaterThanOrEqual(1)

      const docUnico = await pbRh.collection('documentos_pessoa').getOne('q3w9h6swxzpwbz3')
      expect(docUnico.id).toBe('q3w9h6swxzpwbz3')
      expect(docUnico.pessoa).toBe(RENATO_ID)
    })
  })

  // 6. Funções legítimas do gestor continuam funcionando
  describe('6. Funções legítimas da mesma BU continuam operando normalmente para o gestor', () => {
    it('(d) Gestor continua lendo dados cadastrais não sensíveis de colaboradores da sua BU', async () => {
      const renato = await pbGestor.collection('pessoas').getOne(RENATO_ID)
      expect(renato.nome).toBe('Renato Albuquerque')
      expect(renato.cargo_funcao).toBe('Especialista em Arquitetura Cloud & DevOps')
      expect(renato.departamento).toBe('Engenharia de Software')
      expect(renato.situacao_contrato).toBe('Vigente')
      expect(renato.empresa).toBe(userGestor.empresa)
      expect(renato.modalidade).toBe('PJ')
    })

    it('(d) Gestor continua lendo títulos, código e modalidade de contratos da sua BU', async () => {
      const contrato = await pbGestor.collection('contratos').getOne(CONTRATO_RENATO_ID)
      expect(contrato.codigo_contrato).toBe('CT-PJ-2025-014')
      expect(contrato.titulo).toBe('Contrato de Prestação de Serviços de Arquitetura Cloud & SRE')
      expect(contrato.modalidade).toBe('PJ')
      expect(contrato.status).toBe('Vigente')
      expect(contrato.empresa).toBe(userGestor.empresa)
    })

    it('(d) Gestor continua lançando e lendo apontamentos de horas da sua BU', async () => {
      const apontamentos = await pbGestor.collection('apontamentos_horas').getFullList({
        filter: `pessoa = '${RENATO_ID}'`,
      })
      expect(apontamentos.length).toBeGreaterThanOrEqual(1)
      const primeiro = apontamentos[0]
      expect(primeiro.pessoa).toBe(RENATO_ID)
      expect(primeiro.horas).toBeGreaterThan(0)
    })
  })
})

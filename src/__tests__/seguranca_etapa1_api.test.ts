import { describe, it, expect, beforeAll } from 'vitest'
import PocketBase from 'pocketbase'

/**
 * Validação de Segurança e Isolamento Multitenant (BU) - PocketBase API
 *
 * Perfis de Teste:
 * 1. RH: severo.douglas2@gmail.com
 * 2. Gestor BU Tecnologia: gestor@empresa.com (xtt7smd3mrppw30)
 * 3. Gestora BU Vértice Mídia: gestora.produto@empresa.com (y8e1l9jzx2vdaxh)
 * 4. Gestor BU Operações: gestor.operacoes@empresa.com (jgk0j8v066w7nfx)
 */

const PB_URL =
  (import.meta as any).env?.VITE_POCKETBASE_URL ||
  'https://sistema-rh-inteligente-4d4e0.shrd00.internal.goskip.dev'

describe('Validação de Segurança e Confiabilidade — API Rules & Hooks', () => {
  let pbRh: PocketBase
  let pbTech: PocketBase
  let pbMidia: PocketBase
  let pbOps: PocketBase
  let pbAnon: PocketBase

  let userRh: any
  let userTech: any
  let userMidia: any
  let userOps: any

  beforeAll(async () => {
    pbRh = new PocketBase(PB_URL)
    pbTech = new PocketBase(PB_URL)
    pbMidia = new PocketBase(PB_URL)
    pbOps = new PocketBase(PB_URL)
    pbAnon = new PocketBase(PB_URL)

    const authRh = await pbRh
      .collection('users')
      .authWithPassword('severo.douglas2@gmail.com', 'Skip@Pass')
    userRh = authRh.record

    const authTech = await pbTech
      .collection('users')
      .authWithPassword('gestor@empresa.com', 'Skip@Pass')
    userTech = authTech.record

    const authMidia = await pbMidia
      .collection('users')
      .authWithPassword('gestora.produto@empresa.com', 'Skip@Pass')
    userMidia = authMidia.record

    const authOps = await pbOps
      .collection('users')
      .authWithPassword('gestor.operacoes@empresa.com', 'Skip@Pass')
    userOps = authOps.record
  })

  // 1. TESTES DE AUTENTICAÇÃO E PERFIS
  describe('1. Autenticação e integridade de perfis', () => {
    it('[PASS] Todos os 4 usuários de teste autenticam com sucesso', () => {
      expect(userRh.email).toBe('severo.douglas2@gmail.com')
      expect(userRh.cargo_funcao).toBe('RH / Recrutador')

      expect(userTech.email).toBe('gestor@empresa.com')
      expect(userTech.cargo_funcao).toBe('Gestor Contratante')
      expect(userTech.empresa).toBe('xtt7smd3mrppw30')

      expect(userMidia.email).toBe('gestora.produto@empresa.com')
      expect(userMidia.cargo_funcao).toBe('Gestor Contratante')
      expect(userMidia.empresa).toBe('y8e1l9jzx2vdaxh')

      expect(userOps.email).toBe('gestor.operacoes@empresa.com')
      expect(userOps.cargo_funcao).toBe('Gestor Contratante')
      expect(userOps.empresa).toBe('jgk0j8v066w7nfx')
    })
  })

  // 2. AÇÕES PERMITIDAS CONTINUAM FUNCIONANDO
  describe('2. Ações permitidas para cada perfil', () => {
    it('[PASS] RH lista todas as pessoas do grupo econômico', async () => {
      const pessoas = await pbRh.collection('pessoas').getFullList()
      expect(pessoas.length).toBeGreaterThanOrEqual(5)
    })

    it('[PASS] Gestor BU Tecnologia lista pessoas da PRÓPRIA BU/responsabilidade', async () => {
      const pessoasTech = await pbTech.collection('pessoas').getFullList()
      expect(pessoasTech.length).toBeGreaterThanOrEqual(1)
      // Todas as pessoas retornadas devem pertencer à empresa da BU Tecnologia OU ter o gestor como responsável
      for (const p of pessoasTech) {
        const empresaMatch = p.empresa === userTech.empresa
        const gestorMatch = p.gestor_responsavel === userTech.id
        expect(empresaMatch || gestorMatch).toBe(true)
      }
    })

    it('[PASS] Gestora BU Vértice Mídia lista pessoas da PRÓPRIA BU/responsabilidade', async () => {
      const pessoasMidia = await pbMidia.collection('pessoas').getFullList()
      expect(pessoasMidia.length).toBeGreaterThanOrEqual(1)
      for (const p of pessoasMidia) {
        const empresaMatch = p.empresa === userMidia.empresa
        const gestorMatch = p.gestor_responsavel === userMidia.id
        expect(empresaMatch || gestorMatch).toBe(true)
      }
    })

    it('[PASS] Gestor BU Tecnologia lista e visualiza apontamentos de pessoas da sua BU', async () => {
      const apontamentos = await pbTech.collection('apontamentos_horas').getFullList()
      expect(apontamentos.length).toBeGreaterThanOrEqual(1)
    })

    it('[PASS] Gestor aprova/atualiza vaga onde é gestor_responsavel', async () => {
      // Vaga 0vxbkci9xsth920 tem gestor_responsavel = uy2o0xjvgt133eq (userTech)
      const vaga = await pbTech.collection('vagas').getOne('0vxbkci9xsth920')
      expect(vaga.id).toBe('0vxbkci9xsth920')
      expect(vaga.gestor_responsavel).toBe(userTech.id)

      // Atualiza parecer do gestor
      const updated = await pbTech.collection('vagas').update('0vxbkci9xsth920', {
        parecer_gestor_vaga: 'Descrição técnica e parecer validados via teste de integração.',
      })
      expect(updated.parecer_gestor_vaga).toContain('validados via teste de integração')
    })
  })

  // 3. ACESSO INDEVIDO ENTRE BUS É BLOQUEADO
  describe('3. Bloqueio de acesso cruzado indevido entre BUs', () => {
    it('[PASS] Gestor BU Tecnologia NÃO enxerga registros de pessoas exclusivas da BU Vértice Mídia na listagem', async () => {
      const pessoas = await pbTech.collection('pessoas').getFullList()
      // Camila Vasconcelos pertence a BU Vértice Mídia (y8e1l9jzx2vdaxh) e gestora Mariana
      const camila = pessoas.find((p) => p.id === '67n00jzfxy3x9yr')
      expect(camila).toBeUndefined()
    })

    it('[PASS] Gestora BU Vértice Mídia NÃO enxerga registros de pessoas exclusivas da BU Tecnologia na listagem', async () => {
      const pessoas = await pbMidia.collection('pessoas').getFullList()
      // Renato Albuquerque pertence a BU Tecnologia (xtt7smd3mrppw30) e gestor Carlos
      const renato = pessoas.find((p) => p.id === 'yrk1td6xkivtcmt')
      expect(renato).toBeUndefined()
    })

    it('[PASS] Gestor BU Tecnologia tem view direto recusado (HTTP 404) para pessoa de outra BU', async () => {
      // Camila Vasconcelos (67n00jzfxy3x9yr) pertence à Vértice Mídia
      let erro: any = null
      try {
        await pbTech.collection('pessoas').getOne('67n00jzfxy3x9yr')
      } catch (err) {
        erro = err
      }
      expect(erro).not.toBeNull()
      expect(erro.status).toBe(404) // PocketBase oculta registros não autorizados com 404
    })

    it('[PASS] Gestora BU Vértice Mídia tem view direto recusado (HTTP 404) para pessoa da BU Tecnologia', async () => {
      // Renato Albuquerque (yrk1td6xkivtcmt) pertence à Tecnologia
      let erro: any = null
      try {
        await pbMidia.collection('pessoas').getOne('yrk1td6xkivtcmt')
      } catch (err) {
        erro = err
      }
      expect(erro).not.toBeNull()
      expect(erro.status).toBe(404)
    })

    it('[PASS] Gestor BU Tecnologia tem view direto recusado para contratos de outra BU', async () => {
      // Contrato da Camila Vasconcelos (9lr1kwh6df7fpim) na Vértice Mídia
      let erro: any = null
      try {
        await pbTech.collection('contratos').getOne('9lr1kwh6df7fpim')
      } catch (err) {
        erro = err
      }
      expect(erro).not.toBeNull()
      expect(erro.status).toBe(404)
    })

    it('[PASS] Gestor BU Tecnologia tem view direto recusado para documentos de pessoas de outra BU', async () => {
      // Documento da Camila Vasconcelos na Vértice Mídia (1dlon3dnn2r6xif)
      let erro: any = null
      try {
        await pbTech.collection('documentos_pessoa').getOne('1dlon3dnn2r6xif')
      } catch (err) {
        erro = err
      }
      expect(erro).not.toBeNull()
      expect(erro.status).toBe(404)
    })

    it('[PASS] Gestora BU Vértice Mídia tem view direto recusado para apontamentos de pessoas da BU Tecnologia', async () => {
      // Apontamento do Renato Albuquerque (c2dn00x0sepnlvh)
      let erro: any = null
      try {
        await pbMidia.collection('apontamentos_horas').getOne('c2dn00x0sepnlvh')
      } catch (err) {
        erro = err
      }
      expect(erro).not.toBeNull()
      expect(erro.status).toBe(404)
    })
  })

  // 4. SEM VAZAMENTO POR EXPAND
  describe('4. Proteção contra vazamento por expand de relações', () => {
    it('[PASS] Ao expandir relações, o PocketBase não vaza dados confidenciais fora da regra', async () => {
      // Buscar contratos com expand de pessoa
      const contratosTech = await pbTech.collection('contratos').getFullList({
        expand: 'pessoa,empresa',
      })
      for (const ct of contratosTech) {
        if (ct.expand?.pessoa) {
          // A pessoa expandida deve pertencer à BU ou ao gestor
          expect(
            ct.expand.pessoa.empresa === userTech.empresa ||
              ct.expand.pessoa.gestor_responsavel === userTech.id,
          ).toBe(true)
        }
      }
    })
  })

  // 5. SEM ESCALADA DE PRIVILÉGIOS (users hook & API rules)
  describe('5. Bloqueio de escalada de privilégios (hook seguranca_usuarios.js)', () => {
    it('[PASS] Gestor tentando alterar sua própria empresa/área/cargo_funcao é recusado', async () => {
      let erro: any = null
      try {
        await pbTech.collection('users').update(userTech.id, {
          cargo_funcao: 'RH / Recrutador', // tentativa de se auto-promover a RH
        })
      } catch (err) {
        erro = err
      }
      expect(erro).not.toBeNull()
      expect(erro.status).toBe(403)
      expect(erro.message).toContain('cargo_funcao')
    })

    it('[PASS] Gestor tentando alterar sua empresa para outra BU é recusado', async () => {
      let erro: any = null
      try {
        await pbTech.collection('users').update(userTech.id, {
          empresa: 'y8e1l9jzx2vdaxh', // tentativa de mudar para Vértice Mídia
        })
      } catch (err) {
        erro = err
      }
      expect(erro).not.toBeNull()
      expect(erro.status).toBe(403)
      expect(erro.message).toContain('empresa')
    })

    it('[PASS] Gestor tentando alterar cadastro de outro usuário é recusado', async () => {
      let erro: any = null
      try {
        await pbTech.collection('users').update(userMidia.id, {
          name: 'Nome hackeado por outro gestor',
        })
      } catch (err) {
        erro = err
      }
      expect(erro).not.toBeNull()
      expect(erro.status).toBe(403)
      expect(erro.message).toContain('Apenas usuários com perfil RH')
    })

    it('[PASS] RH pode atualizar campos de usuários normalmente', async () => {
      const updated = await pbRh.collection('users').update(userTech.id, {
        name: userTech.name, // RH salvando o mesmo nome
      })
      expect(updated.id).toBe(userTech.id)
    })
  })

  // 6. CAMPOS FINANCEIROS E METAS DE ORÇAMENTO
  describe('6. Proteção de dados financeiros (metas_orcamento_departamento)', () => {
    it('[PASS] Gestor tem permissão de criação de nova meta recusada (createRule apenasRh)', async () => {
      let erro: any = null
      try {
        await pbTech.collection('metas_orcamento_departamento').create({
          departamento: 'Segurança Invadida',
          limite_mensal: 999999,
          ativo: true,
        })
      } catch (err) {
        erro = err
      }
      expect(erro).not.toBeNull()
      expect(erro.status).toBe(403)
    })

    it('[PASS] Gestor tem exclusão de meta recusada (deleteRule apenasRh)', async () => {
      // Buscar uma meta existente
      const metas = await pbRh.collection('metas_orcamento_departamento').getFullList()
      if (metas.length > 0) {
        const metaId = metas[0].id
        let erro: any = null
        try {
          await pbTech.collection('metas_orcamento_departamento').delete(metaId)
        } catch (err) {
          erro = err
        }
        expect(erro).not.toBeNull()
        expect(erro.status).toBe(403)
      }
    })

    it('[PASS] Gestor tem atualização de valor de meta recusada (updateRule apenasRh)', async () => {
      const metas = await pbRh.collection('metas_orcamento_departamento').getFullList()
      if (metas.length > 0) {
        const metaId = metas[0].id
        let erro: any = null
        try {
          await pbTech.collection('metas_orcamento_departamento').update(metaId, {
            limite_mensal: 500000,
          })
        } catch (err) {
          erro = err
        }
        expect(erro).not.toBeNull()
        expect(erro.status).toBe(403)
      }
    })
  })

  // 7. HOOKS PERSONALIZADOS E ENDPOINTS INTERNOS / PÚBLICOS
  describe('7. Endpoints internos recusam sem sessão e públicos funcionam', () => {
    it('[PASS] Endpoint interno /backend/v1/financeiro/metas/checar-alertas recusa chamada sem sessão (401)', async () => {
      let status = 0
      try {
        const res = await fetch(`${PB_URL}/backend/v1/financeiro/metas/checar-alertas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        status = res.status
      } catch {
        /* intentionally ignored */
      }
      expect(status).toBe(401)
    })

    it('[PASS] Endpoint interno /backend/v1/analisar-video-ia recusa chamada anônima (401)', async () => {
      let status = 0
      try {
        const res = await fetch(`${PB_URL}/backend/v1/analisar-video-ia`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidatoId: 'inexistente' }),
        })
        status = res.status
      } catch {
        /* intentionally ignored */
      }
      expect(status).toBe(401)
    })

    it('[PASS] Endpoint público de vagas /backend/v1/public/vagas funciona sem autenticação (200)', async () => {
      const res = await fetch(`${PB_URL}/backend/v1/public/vagas`)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('items')
      expect(Array.isArray(data.items)).toBe(true)
    })

    it('[PASS] Endpoint público de admissão por token /backend/v1/public/admissao/{token} funciona com token válido', async () => {
      // Juliana Mendes possui token adm-juliana-mendes-2026
      const res = await fetch(`${PB_URL}/backend/v1/public/admissao/adm-juliana-mendes-2026`)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.onboarding).toBeDefined()
      expect(data.onboarding.nome_candidato).toContain('Juliana')
    })

    it('[PASS] Endpoint público de admissão recusa token inválido/inexistente (404)', async () => {
      const res = await fetch(`${PB_URL}/backend/v1/public/admissao/token-falso-inexistente-12345`)
      expect(res.status).toBe(404)
    })

    it('[PASS] Endpoint público do portal do candidato /backend/v1/public/candidato-portal/{token} funciona com token válido', async () => {
      // Lucas Ferreira possui token cand-lucas-ferreira-seed
      const res = await fetch(
        `${PB_URL}/backend/v1/public/candidato-portal/cand-lucas-ferreira-seed`,
      )
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.candidato).toBeDefined()
      expect(data.candidato.nome).toBe('Lucas Ferreira Lima')
    })

    it('[PASS] Endpoint público do portal do candidato recusa token inválido (404)', async () => {
      const res = await fetch(`${PB_URL}/backend/v1/public/candidato-portal/token-falso-portal-999`)
      expect(res.status).toBe(404)
    })
  })
})

import pb from '@/lib/pocketbase/client'
import {
  rotinaIntegracaoService,
  TEMPLATES_INTEGRACAO,
  CriarRotinaIntegracaoInput,
} from '@/services/rotinaIntegracaoService'
import { carregarMeuDia } from '@/services/meuDia'

export async function executarTesteRotinaIntegracaoE2E(): Promise<{
  sucesso: boolean
  rotinaCriadaId: string | null
  itensMeuDiaEncontrados: number
  logs: string[]
}> {
  const logs: string[] = []
  let rotinaCriadaId: string | null = null

  try {
    logs.push('1. Autenticando com credencial de RH (severo.douglas2@gmail.com)...')
    await pb.collection('users').authWithPassword('severo.douglas2@gmail.com', 'Skip@Pass')
    const usuarioLogado = pb.authStore.record
    logs.push(`Autenticado como: ${usuarioLogado?.email} (${usuarioLogado?.id})`)

    logs.push('2. Buscando prestador PJ existente para vínculo (Nexus Cloud)...')
    const prestadores = await pb.collection('prestadores_pj').getFullList({
      filter: 'nome_fantasia ~ "Nexus Cloud" || razao_social ~ "Nexus"',
    })
    const prestadorNexus = prestadores[0]
    logs.push(
      `Prestador encontrado: ${prestadorNexus ? `${prestadorNexus.nome_fantasia} (${prestadorNexus.id})` : 'Nenhum'}`,
    )

    logs.push('3. Instanciando dados de criação da rotina com o Template Tech Sênior 30-60-90...')
    const template = TEMPLATES_INTEGRACAO[0]

    // Criar rotina com início próximo (hoje) para forçar itens no Meu Dia
    const hojeStr = new Date().toISOString().split('T')[0]
    const datasMarcos = rotinaIntegracaoService.calcularDatasMarcos(hojeStr)

    // Ajustar o marco 30 dias para vencer dentro dos próximos 3 dias para disparar a severidade "urgente" no Meu Dia
    const dataVencimentoProxima = new Date()
    dataVencimentoProxima.setDate(dataVencimentoProxima.getDate() + 3)
    const dataVencimentoIso = dataVencimentoProxima.toISOString().split('T')[0]

    const inputRotina: CriarRotinaIntegracaoInput = {
      tipo_integrado: 'PJ',
      nome_completo: '[TESTE-E2E] Engenheiro Cloud Staff',
      documento_identificacao: '33.123.456/0001-99',
      email_contato: 'teste.integracao.cloud@souyess.com.br',
      cargo_funcao: 'Staff DevOps & Cloud Reliability',
      departamento: 'Engenharia de Plataforma',
      gestor_responsavel: usuarioLogado?.id,
      gestor_nome: usuarioLogado?.name || 'Douglas Severo',
      buddy_mentor_nome: 'Marcos Silva (Principal Engineer)',
      prestador_pj: prestadorNexus?.id,
      data_inicio: hojeStr,
      valor_contratado: 26000,
      valor_hora: 162.5,
      horas_semanais: 40,
      duracao_meses: 12,
      prazo_contrato_tipo: 'Determinado',
      template_origem: template.titulo,
      itens_checklist: template.checklistFases.map((it, idx) => ({
        id: `tst-chk-${idx}`,
        fase: it.fase,
        titulo: it.titulo,
        responsavel: it.responsavel,
        concluido: it.fase === 0, // Fase 0 já feita
      })),
      marcos_30_60_90: [
        {
          marco: '30_dias',
          titulo: 'Marco 30 Dias — Aprender e Mapear (Learn)',
          prazo: dataVencimentoIso, // Vencendo em 3 dias -> URGENTE no Meu Dia
          status: 'pendente',
          objetivos: ['Imersão na infraestrutura AWS', 'Primeiro PR de automação Terraform'],
          entregasEsperadas: 'Diagnóstico de clusters EKS e mapa de arquitetura',
          checkInRealizado: false,
          dataCheckIn: null,
          parecerGestor: '',
          notaAvaliacao: null,
        },
        {
          marco: '60_dias',
          titulo: 'Marco 60 Dias — Contribuir e Executar (Execute)',
          prazo: datasMarcos.marco60,
          status: 'pendente',
          objetivos: ['Redução de custos FinOps', 'Deploy de pipeline de observabilidade'],
          entregasEsperadas: 'Métricas Grafana e redução de 10% no consumo',
          checkInRealizado: false,
          dataCheckIn: null,
          parecerGestor: '',
          notaAvaliacao: null,
        },
        {
          marco: '90_dias',
          titulo: 'Marco 90 Dias — Otimizar e Liderar (Scale)',
          prazo: datasMarcos.marco90,
          status: 'pendente',
          objetivos: ['Autonomia plena em incidentes', 'Mentoria para Squads'],
          entregasEsperadas: 'Homologação final da parceria e relatório executivo',
          checkInRealizado: false,
          dataCheckIn: null,
          parecerGestor: '',
          notaAvaliacao: null,
        },
      ],
      observacoes: 'Registro de teste automatizado E2E de rotina de integração.',
    }

    logs.push('4. Persistindo a nova rotina de integração via service...')
    const rotinaCriada = await rotinaIntegracaoService.criar(inputRotina)
    rotinaCriadaId = rotinaCriada.id
    logs.push(
      `Rotina criada com sucesso! ID: ${rotinaCriadaId} | Progresso: ${rotinaCriada.percentual_conclusao}%`,
    )

    logs.push('5. Verificando se os itens da rotina foram computados no "Meu Dia"...')
    const meuDiaDados = await carregarMeuDia(usuarioLogado!)
    logs.push(
      `Meu Dia carregado. Total de ações no radar: ${meuDiaDados.itens.length} (Urgentes: ${meuDiaDados.kpis.urgentesHoje}, Atenção: ${meuDiaDados.kpis.atencaoSemana})`,
    )

    const itensIntegracao = meuDiaDados.itens.filter(
      (it) => it.modulo === 'integracao_rotina' && it.origemRecordId === rotinaCriadaId,
    )
    logs.push(
      `Itens específicos da rotina de teste encontrados no Meu Dia: ${itensIntegracao.length}`,
    )

    for (const it of itensIntegracao) {
      logs.push(
        ` - [${it.severidadeLabel}] ${it.tituloAcao} | Prazo: ${it.dataLimiteLabel} | Destino: ${it.rotaDestino}`,
      )
    }

    if (itensIntegracao.length === 0) {
      throw new Error('O item de check-in não apareceu no Meu Dia como esperado.')
    }

    logs.push('6. Testando alteração de item de checklist (Fase 1 concluída)...')
    const rotinaAposCheck = await rotinaIntegracaoService.alternarItemChecklist(
      rotinaCriadaId,
      'tst-chk-3',
      true,
    )
    logs.push(`Novo percentual após marcar item: ${rotinaAposCheck.percentual_conclusao}%`)

    logs.push('7. Testando registro de check-in do Marco 30 dias...')
    const rotinaAposCheckIn = await rotinaIntegracaoService.registrarCheckInMarco(
      rotinaCriadaId,
      '30_dias',
      {
        parecerGestor: 'Excelente desenvoltura na integração técnica e comunicação transparente.',
        notaAvaliacao: 9.8,
        statusMarco: 'concluido',
      },
    )
    const m30 = rotinaAposCheckIn.marcos_30_60_90.find((m) => m.marco === '30_dias')
    logs.push(
      `Marco 30 dias atualizado: checkInRealizado = ${m30?.checkInRealizado}, nota = ${m30?.notaAvaliacao}`,
    )

    logs.push('8. Testando registro de NPS de Onboarding (10/10)...')
    const rotinaAposNps = await rotinaIntegracaoService.registrarNps(
      rotinaCriadaId,
      10,
      'Processo de integração claro, rápido e muito acolhedor!',
    )
    logs.push(`NPS registrado com sucesso: ${rotinaAposNps.nps_onboarding_score}/10`)

    logs.push('9. Limpando a rotina de teste para manter os dados idênticos aos de demonstração...')
    await rotinaIntegracaoService.excluir(rotinaCriadaId)
    logs.push('Rotina de teste removida com sucesso. Base íntegra!')

    return {
      sucesso: true,
      rotinaCriadaId,
      itensMeuDiaEncontrados: itensIntegracao.length,
      logs,
    }
  } catch (err: unknown) {
    logs.push(`ERRO NO TESTE: ${err instanceof Error ? err.message : String(err)}`)
    if (rotinaCriadaId) {
      try {
        await rotinaIntegracaoService.excluir(rotinaCriadaId)
      } catch {
        /* intentionally ignored */
      }
    }
    return {
      sucesso: false,
      rotinaCriadaId,
      itensMeuDiaEncontrados: 0,
      logs,
    }
  }
}

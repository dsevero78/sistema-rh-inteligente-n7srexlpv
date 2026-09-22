import pb from '@/lib/pocketbase/client'

export interface AnaliseLinguisticaData {
  estrutura_fala?: string
  uso_exemplos_vs_cliches?: string
  justificativa?: string
  trechos_evidencia?: string[]
}

export interface PontosCegosData {
  sintese_inconsciente?: string
  evasivas_ou_insegurancas?: string
  sinais_estresse_tensao?: string
  sugestoes_investigacao_entrevista?: string[]
}

export interface ExpressaoSocioemocionalData {
  regulacao_emocional?: string
  maturidade_autocritica?: string
  empatia_conexao?: string
  congruencia_verbal_nao_verbal?: string
  evidencias_observadas?: string[]
}

export interface VideoAnaliseDimensoes {
  clareza_comunicacao: number
  estrutura_narrativa: number
  energia_postura: number
  aderencia_vaga: number
  indice_naturalidade?: number
  veredito_naturalidade?: string
  red_flags?: string[]
}

export interface AnaliseVideoResponse {
  analiseId: string
  score_geral: number
  clareza_comunicacao: number
  estrutura_narrativa: number
  energia_postura: number
  aderencia_vaga: number
  resumo_executivo: string
  comunicacao_oratoria?: string
  postura_presenca?: string
  dominio_experiencia?: string
  fit_cultural?: string
  pontos_fortes: string[]
  pontos_atencao: string[]
  red_flags: string[]
  recomendacao_geral: string
  versao: number
  analisado_em: string
  // Camadas aprimoradas
  nome_detectado_no_video?: string
  conflito_identidade?: boolean
  detalhes_conflito_identidade?: string
  conflito_confirmado_rh?: boolean
  indice_naturalidade?: number
  veredito_naturalidade?: string
  analise_linguistica?: AnaliseLinguisticaData
  pontos_cegos?: PontosCegosData
  expressao_socioemocional?: ExpressaoSocioemocionalData
}

export interface RespostaAnaliseVideoApi {
  success: boolean
  conflito_bloqueante?: boolean
  conflito_identidade?: boolean
  nome_detectado_no_video?: string
  nome_cadastro?: string
  detalhes_conflito_identidade?: string
  data: AnaliseVideoResponse
}

export type VideoStatus =
  | 'sem_video'
  | 'enviado_aguardando'
  | 'analisando'
  | 'analise_concluida'
  | 'erro_processamento'

export const videoIaService = {
  /**
   * Aciona a análise de IA para o vídeo do candidato (link ou arquivo).
   * Rota customizada protegida por auth: POST /backend/v1/analisar-video-ia
   * Se permitirDivergencia = true, força a continuidade mesmo se houver divergência de nome detectada.
   */
  async dispararAnalise(
    candidatoId: string,
    permitirDivergencia = false,
  ): Promise<RespostaAnaliseVideoApi> {
    const res = await pb.send<RespostaAnaliseVideoApi>('/backend/v1/analisar-video-ia', {
      method: 'POST',
      body: JSON.stringify({ candidatoId, permitirDivergencia }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res?.data) {
      throw new Error('Resposta inválida do serviço de análise de vídeo.')
    }

    return res
  },

  /**
   * Confirma explicitamente a vinculação do vídeo ao candidato caso tenha ocorrido
   * alerta de divergência de nome (evita upload acidental em cadastro errado sem perder a análise).
   */
  async confirmarConflitoIdentidade(candidatoId: string, justificativa?: string) {
    return await pb.send<{ success: boolean; message: string }>(
      '/backend/v1/confirmar-conflito-video',
      {
        method: 'POST',
        body: JSON.stringify({ candidatoId, justificativa }),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )
  },

  /**
   * Obtém a análise mais recente registrada na coleção `analises_video_ia`.
   */
  async obterAnaliseMaisRecente(candidatoId: string) {
    try {
      const records = await pb.collection('analises_video_ia').getList(1, 1, {
        filter: `candidato = "${candidatoId}"`,
        sort: '-data_geracao',
        expand: 'gerado_por,vaga',
      })
      return records.items[0] || null
    } catch (err) {
      console.error('[videoIaService] Erro ao carregar análise de vídeo por -data_geracao:', err)
      // Fallback para ordenação por -id se houver falha de índice/campo
      try {
        const fallbackRecords = await pb.collection('analises_video_ia').getList(1, 1, {
          filter: `candidato = "${candidatoId}"`,
          sort: '-id',
          expand: 'gerado_por,vaga',
        })
        return fallbackRecords.items[0] || null
      } catch (fallbackErr) {
        console.error('[videoIaService] Erro no fallback de análise de vídeo por -id:', fallbackErr)
        return null
      }
    }
  },

  /**
   * Atualiza ou remove link de vídeo do candidato diretamente pelo dossiê.
   * Não envia `video_status` (campo não existe na coleção candidatos).
   */
  async salvarLinkVideo(candidatoId: string, videoLink: string) {
    return await pb.collection('candidatos').update(candidatoId, {
      video_link: videoLink,
    })
  },

  /**
   * Envia o arquivo de vídeo do candidato via FormData.
   * Não envia `video_status` (campo não existe na coleção candidatos; status é derivado no front).
   */
  async uploadArquivoVideo(candidatoId: string, file: File) {
    const formatos = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-matroska',
      'video/ogg',
      'video/x-msvideo',
    ]
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase()
    const extensoes = ['.mp4', '.webm', '.mov', '.mkv', '.ogg', '.avi']

    if (file.type && !formatos.includes(file.type) && !extensoes.includes(ext)) {
      throw new Error(
        'Formato de vídeo incompatível. Utilize arquivos nos formatos MP4, WebM ou MOV.',
      )
    }

    if (file.size > 100 * 1024 * 1024) {
      throw new Error(
        `O arquivo excede o limite máximo permitido de 100MB (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
      )
    }

    const formData = new FormData()
    formData.append('video_apresentacao', file)
    return await pb.collection('candidatos').update(candidatoId, formData)
  },
}

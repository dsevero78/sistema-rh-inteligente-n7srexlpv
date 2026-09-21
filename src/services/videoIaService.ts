import pb from '@/lib/pocketbase/client'

export interface VideoAnaliseDimensoes {
  clareza_comunicacao: number
  estrutura_narrativa: number
  energia_postura: number
  aderencia_vaga: number
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
  pontos_fortes: string[]
  pontos_atencao: string[]
  red_flags: string[]
  recomendacao_geral: string
  versao: number
  analisado_em: string
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
   */
  async dispararAnalise(candidatoId: string): Promise<AnaliseVideoResponse> {
    const res = await pb.send<{ success: boolean; data: AnaliseVideoResponse }>(
      '/backend/v1/analisar-video-ia',
      {
        method: 'POST',
        body: JSON.stringify({ candidatoId }),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    if (!res?.data) {
      throw new Error('Resposta inválida do serviço de análise de vídeo.')
    }

    return res.data
  },

  /**
   * Obtém a análise mais recente registrada na coleção `analises_video_ia`.
   */
  async obterAnaliseMaisRecente(candidatoId: string) {
    try {
      const records = await pb.collection('analises_video_ia').getList(1, 1, {
        filter: `candidato = "${candidatoId}"`,
        sort: '-created',
        expand: 'gerado_por,vaga',
      })
      return records.items[0] || null
    } catch (err) {
      console.warn('Erro ao carregar análise de vídeo:', err)
      return null
    }
  },

  /**
   * Atualiza ou remove vídeo do candidato diretamente pelo dossiê.
   */
  async salvarLinkVideo(candidatoId: string, videoLink: string) {
    return await pb.collection('candidatos').update(candidatoId, {
      video_link: videoLink,
      video_status: videoLink.trim() ? 'enviado_aguardando' : 'sem_video',
    })
  },

  async uploadArquivoVideo(candidatoId: string, file: File) {
    const formData = new FormData()
    formData.append('video_apresentacao', file)
    formData.append('video_status', 'enviado_aguardando')
    return await pb.collection('candidatos').update(candidatoId, formData)
  },
}

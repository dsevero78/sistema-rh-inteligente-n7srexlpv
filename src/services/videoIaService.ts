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

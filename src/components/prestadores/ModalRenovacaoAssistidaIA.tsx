import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { PrestadorPJ, ContratoPJ, prestadoresService } from '@/services/prestadoresPj'
import {
  Sparkles,
  Mail,
  FileText,
  Copy,
  Check,
  Download,
  RefreshCw,
  TrendingUp,
  Clock,
  ShieldCheck,
  DollarSign,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'

interface ResultadoRenovacaoIA {
  email: {
    assunto: string
    destinatario_nome: string
    destinatario_email: string
    corpo_texto: string
    tom_comunicacao: string
  }
  minuta: {
    titulo: string
    preambulo_partes: string
    clausula_objeto: string
    clausula_vigencia: string
    clausula_valor: string
    clausula_sla_entregas: string
    clausula_confidencialidade_lgpd: string
    clausula_disposicoes_gerais: string
    prazo_assinatura_dias: number
    texto_completo_formatado: string
  }
  sintese_decisao: {
    decisao: 'RENOVAR' | 'RENEGOCIAR' | 'REAVALIAR'
    emoji: string
    valor_mensal_proposto: number
    valor_hora_proposto: number
    dias_para_vencer: number
    recomendacao_resumo: string
  }
}

interface ModalRenovacaoAssistidaIAProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prestador: PrestadorPJ
  contrato?: ContratoPJ
  onSucesso?: () => void
}

export const ModalRenovacaoAssistidaIA: React.FC<ModalRenovacaoAssistidaIAProps> = ({
  open,
  onOpenChange,
  prestador,
  contrato,
  onSucesso,
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<ResultadoRenovacaoIA | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<'email' | 'minuta'>('email')
  const [copiadoTipo, setCopiadoTipo] = useState<'email' | 'minuta' | null>(null)

  const gerarRenovacao = async () => {
    setLoading(true)
    try {
      const res = await prestadoresService.gerarRenovacaoAssistidaIA(prestador.id, contrato?.id)
      setResultado(res)
      if (onSucesso) onSucesso()
    } catch (err: unknown) {
      console.error('Erro ao gerar renovação assistida por IA:', err)
      toast({
        title: 'Erro ao gerar renovação com IA',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Carrega automaticamente na primeira abertura se ainda não gerou
  React.useEffect(() => {
    if (open && !resultado && !loading) {
      gerarRenovacao()
    }
  }, [open])

  const copiarTexto = async (texto: string, tipo: 'email' | 'minuta') => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiadoTipo(tipo)
      toast({
        title: tipo === 'email' ? 'E-mail copiado!' : 'Minuta copiada!',
        description: 'Texto copiado para a área de transferência com sucesso.',
      })
      setTimeout(() => setCopiadoTipo(null), 2500)
    } catch (_) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível acessar a área de transferência.',
        variant: 'destructive',
      })
    }
  }

  const exportarArquivoTexto = (conteudo: string, nomeArquivo: string) => {
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = nomeArquivo
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast({
      title: 'Download iniciado',
      description: `Arquivo ${nomeArquivo} baixado com sucesso.`,
    })
  }

  const badgeDecisao = (decisao?: string) => {
    switch (decisao) {
      case 'RENOVAR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span>🟢</span> RENOVAR
          </span>
        )
      case 'RENEGOCIAR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
            <span>🟡</span> RENEGOCIAR
          </span>
        )
      case 'REAVALIAR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-900 border border-rose-300">
            <span>🔴</span> REAVALIAR
          </span>
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-6 bg-white border border-slate-200 max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-3 border-b border-slate-100 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  Renovação Assistida por IA
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-semibold">
                    Skip AI Gateway
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Rascunho de e-mail institucional e minuta contratual estruturada a partir da
                  decisão do comparativo de custos.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={gerarRenovacao}
                disabled={loading}
                className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-purple-600' : ''}`}
                />
                {loading ? 'Processando IA...' : 'Regenerar com IA'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 animate-pulse">
              <Sparkles className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">
                Analisando histórico, contrato e comparativo de custos...
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                A IA está cruzando a vigência de {prestador.nome_fantasia || prestador.razao_social}
                , o último aditivo, a nota média (
                {prestador.media_avaliacao ? prestador.media_avaliacao.toFixed(1) : '8.8'}) e a
                mediana do portfólio para redigir o e-mail e a minuta.
              </p>
            </div>
          </div>
        ) : resultado ? (
          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {/* Header com a Decisão e Números do Comparativo */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                {badgeDecisao(resultado.sintese_decisao?.decisao)}
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {prestador.nome_fantasia || prestador.razao_social}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {resultado.sintese_decisao?.recomendacao_resumo}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs shrink-0 bg-white px-3 py-1.5 rounded-lg border border-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">
                    Valor-Hora Base
                  </span>
                  <span className="font-extrabold text-indigo-700">
                    R$ {resultado.sintese_decisao?.valor_hora_proposto?.toFixed(2)}/h
                  </span>
                </div>
                <div className="border-l border-slate-200 pl-3">
                  <span className="text-[10px] text-slate-400 block font-medium">Valor Mensal</span>
                  <span className="font-bold text-slate-800">
                    R${' '}
                    {resultado.sintese_decisao?.valor_mensal_proposto?.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="border-l border-slate-200 pl-3">
                  <span className="text-[10px] text-slate-400 block font-medium">Término</span>
                  <span className="font-bold text-amber-700">
                    ~{resultado.sintese_decisao?.dias_para_vencer} dias
                  </span>
                </div>
              </div>
            </div>

            {/* Abas Alternáveis: Rascunho de E-mail vs Minuta de Renovação */}
            <Tabs
              value={abaAtiva}
              onValueChange={(v) => setAbaAtiva(v as any)}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <TabsList className="bg-slate-100 p-1 border border-slate-200">
                  <TabsTrigger
                    value="email"
                    className="text-xs gap-1.5 font-bold data-[state=active]:bg-white data-[state=active]:text-blue-700"
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    Rascunho de E-mail
                  </TabsTrigger>
                  <TabsTrigger
                    value="minuta"
                    className="text-xs gap-1.5 font-bold data-[state=active]:bg-white data-[state=active]:text-purple-700"
                  >
                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                    Minuta de Termo Aditivo
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  {abaAtiva === 'email' ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copiarTexto(resultado.email?.corpo_texto || '', 'email')}
                        className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        {copiadoTipo === 'email' ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1" />
                            Copiar E-mail
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          exportarArquivoTexto(
                            `ASSUNTO: ${resultado.email?.assunto}\nPARA: ${resultado.email?.destinatario_nome} <${resultado.email?.destinatario_email}>\n\n${resultado.email?.corpo_texto}`,
                            `email-renovacao-${(prestador.nome_fantasia || 'prestador').toLowerCase().replace(/\s+/g, '-')}.txt`,
                          )
                        }
                        className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Baixar .TXT
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          copiarTexto(resultado.minuta?.texto_completo_formatado || '', 'minuta')
                        }
                        className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        {copiadoTipo === 'minuta' ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1" />
                            Copiar Minuta
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          exportarArquivoTexto(
                            resultado.minuta?.texto_completo_formatado || '',
                            `minuta-aditivo-renovacao-${(prestador.nome_fantasia || 'prestador').toLowerCase().replace(/\s+/g, '-')}.txt`,
                          )
                        }
                        className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Baixar .TXT
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* ABA 1: RASCUNHO DE E-MAIL */}
              <TabsContent value="email" className="space-y-3 mt-0">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="border-b border-slate-100 pb-3 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-500 w-20">Assunto:</span>
                      <span className="font-bold text-slate-900 flex-1">
                        {resultado.email?.assunto}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-500 w-20">Destinatário:</span>
                      <span className="text-slate-800">
                        {resultado.email?.destinatario_nome} &lt;
                        {resultado.email?.destinatario_email || 'contato@fornecedor.com.br'}&gt;
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-500 w-20">Tom:</span>
                      <span className="text-blue-700 font-medium">
                        {resultado.email?.tom_comunicacao}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-200/70 font-sans text-xs leading-relaxed text-slate-800 whitespace-pre-wrap">
                    {resultado.email?.corpo_texto}
                  </div>
                </div>
              </TabsContent>

              {/* ABA 2: MINUTA CONTRATUAL ESTRUTURADA */}
              <TabsContent value="minuta" className="space-y-3 mt-0">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                  <div className="border-b border-slate-100 pb-3 text-center">
                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">
                      {resultado.minuta?.titulo}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {resultado.minuta?.preambulo_partes}
                    </p>
                  </div>

                  {/* Cláusulas estruturadas com destaque */}
                  <div className="space-y-3 text-xs leading-relaxed">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                      <h4 className="font-bold text-slate-900 mb-1">
                        CLÁUSULA PRIMEIRA — DO OBJETO E DA PRORROGAÇÃO:
                      </h4>
                      <p className="text-slate-700">{resultado.minuta?.clausula_objeto}</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                      <h4 className="font-bold text-slate-900 mb-1">
                        CLÁUSULA SEGUNDA — DA VIGÊNCIA PROPOSTA:
                      </h4>
                      <p className="text-slate-700">{resultado.minuta?.clausula_vigencia}</p>
                    </div>

                    <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-200/80">
                      <h4 className="font-bold text-indigo-950 mb-1 flex items-center justify-between">
                        <span>CLÁUSULA TERCEIRA — DO VALOR E REMUNERAÇÃO:</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold">
                          160h/mês
                        </span>
                      </h4>
                      <p className="text-indigo-900">{resultado.minuta?.clausula_valor}</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                      <h4 className="font-bold text-slate-900 mb-1">
                        CLÁUSULA QUARTA — DOS NÍVEIS DE SERVIÇO & ENTREGAS:
                      </h4>
                      <p className="text-slate-700">{resultado.minuta?.clausula_sla_entregas}</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                      <h4 className="font-bold text-slate-900 mb-1">
                        CLÁUSULA QUINTA — DA CONFIDENCIALIDADE & LGPD:
                      </h4>
                      <p className="text-slate-700">
                        {resultado.minuta?.clausula_confidencialidade_lgpd}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                      <h4 className="font-bold text-slate-900 mb-1">
                        CLÁUSULA SEXTA — DAS DISPOSIÇÕES GERAIS E FORO:
                      </h4>
                      <p className="text-slate-700">
                        {resultado.minuta?.clausula_disposicoes_gerais}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Prazo proposto para assinatura digital:{' '}
                      <strong>{resultado.minuta?.prazo_assinatura_dias || 10} dias úteis</strong>
                    </span>
                    <span className="font-mono text-[10px]">
                      Auditoria: Registrado na Linha do Tempo PJ
                    </span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

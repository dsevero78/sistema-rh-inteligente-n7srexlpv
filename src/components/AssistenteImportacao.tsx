import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import {
  processarArquivoPlanilha,
  baixarArquivoCSV,
  type ResultadoParsePlanilha,
} from '@/lib/parserPlanilha'
import {
  CAMPOS_CANDIDATO,
  CAMPOS_VAGA,
  autoMapearColunas,
  validarCandidatosPlanilha,
  validarVagasPlanilha,
  importarCandidatosLote,
  importarVagasLote,
  type MapeamentoColunas,
  type RelatorioValidacao,
  type ResultadoImportacao,
} from '@/services/importacaoService'
import {
  baixarModeloCandidatos,
  baixarModeloVagas,
  MODELO_CANDIDATOS_EXEMPLO,
  MODELO_VAGAS_EXEMPLO,
} from '@/lib/templatesImportacao'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Download,
  Sparkles,
  RefreshCw,
  Check,
  Briefcase,
  Users,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import type { RecordModel } from 'pocketbase'

export type TipoEntidadeImportacao = 'candidatos' | 'vagas'

interface AssistenteImportacaoProps {
  tipoPadrao?: TipoEntidadeImportacao
  onSucesso?: () => void
  onCancelar?: () => void
}

type EtapaWizard = 1 | 2 | 3 | 4 | 5

export default function AssistenteImportacao({
  tipoPadrao = 'candidatos',
  onSucesso,
  onCancelar,
}: AssistenteImportacaoProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tipo, setTipo] = useState<TipoEntidadeImportacao>(tipoPadrao)
  const [etapa, setEtapa] = useState<EtapaWizard>(1)
  const [vagasDisponiveis, setVagasDisponiveis] = useState<RecordModel[]>([])

  // Estado do Arquivo
  const [dadosPlanilha, setDadosPlanilha] = useState<ResultadoParsePlanilha | null>(null)
  const [processandoArquivo, setProcessandoArquivo] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  // Mapeamento e Opções
  const [mapeamento, setMapeamento] = useState<MapeamentoColunas>({})
  const [modoDuplicado, setModoDuplicado] = useState<'ignorar' | 'atualizar'>('atualizar')

  // Validação
  const [validando, setValidando] = useState(false)
  const [relatorioValidacao, setRelatorioValidacao] = useState<RelatorioValidacao | null>(null)
  const [filtroVisualizacao, setFiltroVisualizacao] = useState<
    'todos' | 'erros' | 'avisos' | 'validos'
  >('todos')

  // Importação e Progresso
  const [progressoPorcentagem, setProgressoPorcentagem] = useState(0)
  const [progressoItemAtual, setProgressoItemAtual] = useState(0)
  const [resultadoFinal, setResultadoFinal] = useState<ResultadoImportacao | null>(null)

  // Carregar vagas para associação
  useEffect(() => {
    pb.collection('vagas')
      .getFullList({ sort: '-created' })
      .then((res) => setVagasDisponiveis(res))
      .catch((err) => console.warn('Não foi possível carregar vagas no assistente:', err))
  }, [])

  const camposDefinicao = tipo === 'candidatos' ? CAMPOS_CANDIDATO : CAMPOS_VAGA

  // Carregar arquivo selecionado
  const handleSelecionarArquivo = async (file: File) => {
    setProcessandoArquivo(true)
    try {
      const parsed = await processarArquivoPlanilha(file)
      if (parsed.linhas.length === 0) {
        toast({
          title: 'Planilha sem dados',
          description: 'O arquivo enviado não contém nenhuma linha de dados.',
          variant: 'destructive',
        })
        setProcessandoArquivo(false)
        return
      }

      setDadosPlanilha(parsed)
      // Auto-detectar mapeamento
      const autoMap = autoMapearColunas(parsed.cabecalhos, camposDefinicao)
      setMapeamento(autoMap)
      setEtapa(2)
      toast({
        title: 'Arquivo processado com sucesso!',
        description: `${parsed.linhas.length} linhas identificadas em "${file.name}".`,
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao ler arquivo',
        description: err?.message || 'Verifique se o formato do arquivo é válido (CSV ou XLSX).',
        variant: 'destructive',
      })
    } finally {
      setProcessandoArquivo(false)
    }
  }

  // Usar dados de exemplo rápido (1 clique)
  const handleCarregarExemploRapido = () => {
    const cabecalhos =
      tipo === 'candidatos'
        ? Object.keys(MODELO_CANDIDATOS_EXEMPLO[0])
        : Object.keys(MODELO_VAGAS_EXEMPLO[0])
    const linhas =
      tipo === 'candidatos' ? (MODELO_CANDIDATOS_EXEMPLO as any) : (MODELO_VAGAS_EXEMPLO as any)

    const parsed: ResultadoParsePlanilha = {
      cabecalhos,
      linhas,
      totalLinhas: linhas.length,
      nomeArquivo: `exemplo_demonstracao_${tipo}.csv`,
      tipo: 'csv',
    }

    setDadosPlanilha(parsed)
    const autoMap = autoMapearColunas(cabecalhos, camposDefinicao)
    setMapeamento(autoMap)
    setEtapa(2)
    toast({
      title: 'Exemplo carregado!',
      description: `${linhas.length} registros demonstrativos prontos para simulação.`,
    })
  }

  // Avançar para a Validação (Etapa 3)
  const handleAvancarParaValidacao = async () => {
    if (!dadosPlanilha) return
    setValidando(true)
    try {
      if (tipo === 'candidatos') {
        const rel = await validarCandidatosPlanilha(
          dadosPlanilha.linhas,
          mapeamento,
          vagasDisponiveis,
          modoDuplicado,
        )
        setRelatorioValidacao(rel)
      } else {
        const rel = await validarVagasPlanilha(dadosPlanilha.linhas, mapeamento)
        setRelatorioValidacao(rel)
      }
      setEtapa(3)
    } catch (err: any) {
      toast({
        title: 'Erro na validação',
        description: err?.message || 'Falha ao validar os registros.',
        variant: 'destructive',
      })
    } finally {
      setValidando(false)
    }
  }

  // Executar a Importação real (Etapa 4 -> 5)
  const handleExecutarImportacao = async () => {
    if (!relatorioValidacao) return
    setEtapa(4)
    setProgressoPorcentagem(0)
    setProgressoItemAtual(0)

    try {
      let resultado: ResultadoImportacao

      if (tipo === 'candidatos') {
        resultado = await importarCandidatosLote(
          relatorioValidacao.itens,
          modoDuplicado,
          (prog, atual) => {
            setProgressoPorcentagem(prog)
            setProgressoItemAtual(atual)
          },
        )
      } else {
        resultado = await importarVagasLote(relatorioValidacao.itens, (prog, atual) => {
          setProgressoPorcentagem(prog)
          setProgressoItemAtual(atual)
        })
      }

      setResultadoFinal(resultado)
      setEtapa(5)

      // Disparar evento para atualizar contadores no Layout/Meu Dia
      window.dispatchEvent(new CustomEvent('souyess_meu_dia_updated'))

      toast({
        title: 'Importação finalizada!',
        description: `${resultado.totalCriados} novos registros gravados com sucesso.`,
      })
      if (onSucesso) onSucesso()
    } catch (err: any) {
      toast({
        title: 'Erro durante a importação',
        description: err?.message || 'Ocorreu um erro no processamento do lote.',
        variant: 'destructive',
      })
      setEtapa(3)
    }
  }

  // Baixar relatório com linhas com erros para correção
  const handleBaixarRelatorioErros = () => {
    if (!relatorioValidacao || !dadosPlanilha) return

    const errosAvisos = relatorioValidacao.itens.filter(
      (it) => it.status === 'erro' || it.status === 'aviso',
    )
    if (errosAvisos.length === 0) {
      toast({ title: 'Nenhum erro encontrado para exportar.' })
      return
    }

    const cabecalhos = ['Linha', 'Status', 'Motivos', ...dadosPlanilha.cabecalhos]
    const linhasExportar = errosAvisos.map((it) => {
      const row: Record<string, any> = {
        Linha: it.linhaOriginal,
        Status: it.status.toUpperCase(),
        Motivos: [...it.erros, ...it.avisos].join(' | '),
      }
      dadosPlanilha.cabecalhos.forEach((c) => {
        row[c] = it.dadosOriginais[c] || ''
      })
      return row
    })

    baixarArquivoCSV(`relatorio_erros_${tipo}_souyess.csv`, cabecalhos, linhasExportar)
  }

  // Resetar assistente
  const handleReiniciar = () => {
    setDadosPlanilha(null)
    setMapeamento({})
    setRelatorioValidacao(null)
    setResultadoFinal(null)
    setProgressoPorcentagem(0)
    setEtapa(1)
  }

  // Executar teste E2E com auto-limpeza (Validação de ponta a ponta)
  const [executandoTesteE2E, setExecutandoTesteE2E] = useState(false)
  const handleExecutarTesteE2E = async () => {
    setExecutandoTesteE2E(true)
    try {
      const { executarTesteSimulacaoImportador } = await import('@/lib/testeImportadorE2E')
      const res = await executarTesteSimulacaoImportador()
      if (res.sucesso) {
        toast({
          title: 'Teste E2E aprovado com sucesso!',
          description: `5 candidatos criados com score real, pipeline, timeline e removidos sem deixar lixo.`,
        })
      } else {
        toast({
          title: 'Falha no teste E2E',
          description: res.logs[res.logs.length - 1] || 'Verifique o console.',
          variant: 'destructive',
        })
      }
    } catch (e: any) {
      toast({
        title: 'Erro ao rodar teste E2E',
        description: e?.message || 'Falha na execução',
        variant: 'destructive',
      })
    } finally {
      setExecutandoTesteE2E(false)
    }
  }

  return (
    <div className="w-full mx-auto space-y-6 font-sans">
      {/* Header do Assistente SouYess */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1A2240] p-6 rounded-2xl border border-slate-200/80 dark:border-[#2E3A6E] shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#E9530E]" />
        <div className="pl-2">
          <div className="flex items-center gap-2">
            <span className="font-display text-[11px] uppercase font-bold tracking-widest text-[#E9530E] bg-[#FEF1EA] dark:bg-[#E9530E]/20 px-2.5 py-0.5 rounded-full border border-[#FBDCC9] dark:border-[#E9530E]/30">
              Onboarding de Valor em 10 Minutos
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              · Importador Inteligente
            </span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#212B55] dark:text-[#F7F8FB] tracking-tight mt-1">
            Assistente de Importação em Lote
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Popule o sistema instantaneamente com suas vagas e candidatos reais via planilha (CSV ou
            Excel). Elimine o trabalho manual e veja o pipeline, ranking semântico e Meu Dia
            funcionando agora.
          </p>
        </div>

        {/* Alternador de Tipo (Candidatos vs Vagas) */}
        {etapa === 1 && (
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#11162B] p-1.5 rounded-xl border border-slate-200 dark:border-[#2E3A6E] self-start sm:self-center">
            <Button
              type="button"
              size="sm"
              variant={tipo === 'candidatos' ? 'default' : 'ghost'}
              onClick={() => setTipo('candidatos')}
              className={`text-xs h-8 font-semibold transition-all ${
                tipo === 'candidatos'
                  ? 'bg-[#E9530E] hover:bg-[#C5430A] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Candidatos
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tipo === 'vagas' ? 'default' : 'ghost'}
              onClick={() => setTipo('vagas')}
              className={`text-xs h-8 font-semibold transition-all ${
                tipo === 'vagas'
                  ? 'bg-[#E9530E] hover:bg-[#C5430A] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 mr-1.5" />
              Vagas em Lote
            </Button>
          </div>
        )}
      </div>

      {/* Indicador de Etapas (Wizard Steps) */}
      <div className="bg-white dark:bg-[#1A2240] p-4 rounded-xl border border-slate-200/80 dark:border-[#2E3A6E] shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { num: 1, label: 'Upload' },
            { num: 2, label: 'Mapeamento' },
            { num: 3, label: 'Validação' },
            { num: 4, label: 'Importando' },
            { num: 5, label: 'Concluído' },
          ].map((s) => {
            const isAtual = etapa === s.num
            const isConcluido = etapa > s.num
            return (
              <div
                key={s.num}
                className={`flex items-center gap-2.5 p-2 rounded-lg transition-all ${
                  isAtual
                    ? 'bg-[#FEF1EA] dark:bg-[#E9530E]/15 border border-[#FBDCC9] dark:border-[#E9530E]/30'
                    : isConcluido
                      ? 'bg-slate-50 dark:bg-[#11162B] text-slate-700 dark:text-slate-300'
                      : 'opacity-50 text-slate-400 dark:text-slate-500'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 transition-colors ${
                    isConcluido
                      ? 'bg-emerald-600 text-white'
                      : isAtual
                        ? 'bg-[#E9530E] text-white shadow-xs'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isConcluido ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span
                  className={`text-xs font-semibold truncate ${
                    isAtual
                      ? 'text-[#E9530E] font-bold'
                      : isConcluido
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ETAPA 1: UPLOAD DO ARQUIVO */}
      {/* ========================================================================= */}
      {etapa === 1 && (
        <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240]">
          <CardHeader>
            <CardTitle className="font-display text-lg text-[#212B55] dark:text-[#F7F8FB]">
              1. Envie sua planilha de {tipo === 'candidatos' ? 'Candidatos' : 'Vagas'}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Formatos aceitos: <strong>.CSV</strong>, <strong>.XLSX</strong> ou{' '}
              <strong>.XLS</strong>. Você não precisa se preocupar com os nomes exatos das colunas,
              nós faremos a correspondência no próximo passo.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Zona de Drop & Upload */}
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragOver(false)
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleSelecionarArquivo(e.dataTransfer.files[0])
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                isDragOver
                  ? 'border-[#E9530E] bg-[#FEF1EA] dark:bg-[#E9530E]/10 scale-[1.01]'
                  : 'border-slate-300 dark:border-[#2E3A6E] hover:border-[#E9530E] dark:hover:border-[#E9530E] bg-slate-50/60 dark:bg-[#11162B]/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleSelecionarArquivo(e.target.files[0])
                  }
                }}
              />

              <div className="w-14 h-14 rounded-2xl bg-[#FEF1EA] dark:bg-[#E9530E]/20 text-[#E9530E] flex items-center justify-center shadow-xs mb-3 group-hover:scale-105 transition-transform">
                {processandoArquivo ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-7 h-7" />
                )}
              </div>

              <h4 className="font-display text-base font-bold text-[#212B55] dark:text-[#F7F8FB]">
                {processandoArquivo
                  ? 'Processando estrutura da planilha...'
                  : 'Clique para selecionar ou arraste o arquivo aqui'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                CSV separado por vírgula ou ponto-e-vírgula, ou planilha Excel (XLSX).
              </p>

              <div className="mt-4 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs border-slate-300 dark:border-[#2E3A6E] font-semibold bg-white dark:bg-[#1A2240]"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5 text-[#E9530E]" />
                  Procurar no computador
                </Button>
              </div>
            </div>

            {/* Caixa de Aceleração: Download de Modelos ou Teste com Exemplo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2E3A6E] bg-slate-50/70 dark:bg-[#11162B] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 font-display text-xs font-bold text-[#212B55] dark:text-[#F7F8FB]">
                    <Download className="w-4 h-4 text-[#E9530E]" />
                    Modelos de Planilha Prontos
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Baixe uma planilha modelo padrão já com as colunas certas para preencher.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      tipo === 'candidatos'
                        ? baixarModeloCandidatos(false)
                        : baixarModeloVagas(false)
                    }
                    className="text-xs border-slate-300 dark:border-[#2E3A6E] text-slate-700 dark:text-slate-300"
                  >
                    Modelo Vazio
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      tipo === 'candidatos' ? baixarModeloCandidatos(true) : baixarModeloVagas(true)
                    }
                    className="text-xs border-[#FBDCC9] dark:border-[#E9530E]/30 bg-[#FEF1EA] dark:bg-[#E9530E]/10 text-[#E9530E] hover:bg-[#FBDCC9] font-semibold"
                  >
                    Modelo com Exemplos
                  </Button>
                </div>
              </div>

              {/* Botão de Demonstração em 1 Clique */}
              <div className="p-4 rounded-xl border border-[#FBDCC9] dark:border-[#E9530E]/40 bg-linear-to-br from-[#FEF1EA]/60 to-white dark:from-[#1A2240] dark:to-[#11162B] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 font-display text-xs font-bold text-[#E9530E]">
                    <Sparkles className="w-4 h-4" />
                    Simular em 10 Segundos (Demonstração)
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Não tem uma planilha em mãos agora? Use nosso conjunto de dados de exemplo
                    realista (
                    {tipo === 'candidatos' ? '5 candidatos estratégicos' : '2 vagas estruturadas'}).
                  </p>
                </div>
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCarregarExemploRapido}
                      className="text-xs bg-[#E9530E] hover:bg-[#C5430A] text-white font-bold shadow-xs"
                    >
                      Carregar Dados de Exemplo
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleExecutarTesteE2E}
                      disabled={executandoTesteE2E}
                      className="text-xs border-[#E9530E]/30 text-[#E9530E] hover:bg-[#E9530E]/10"
                      title="Testa a importação completa no banco e limpa automaticamente"
                    >
                      {executandoTesteE2E ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : (
                        <Check className="w-3.5 h-3.5 mr-1" />
                      )}
                      Testar E2E + Auto Limpeza
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          {onCancelar && (
            <CardFooter className="border-t border-slate-100 dark:border-[#2E3A6E] justify-end pt-4">
              <Button type="button" variant="outline" onClick={onCancelar} className="text-xs">
                Voltar
              </Button>
            </CardFooter>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 2: MAPEAMENTO DE COLUNAS */}
      {/* ========================================================================= */}
      {etapa === 2 && dadosPlanilha && (
        <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240]">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="font-display text-lg text-[#212B55] dark:text-[#F7F8FB]">
                  2. Mapeamento de Colunas
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Arquivo: <strong>{dadosPlanilha.nomeArquivo}</strong> ({dadosPlanilha.totalLinhas}{' '}
                  linhas identificadas). O assistente auto-detectou os campos correspondentes
                  abaixo.
                </CardDescription>
              </div>
              <Badge className="bg-[#FEF1EA] dark:bg-[#E9530E]/20 text-[#E9530E] border-[#FBDCC9] dark:border-[#E9530E]/30 text-xs font-mono self-start sm:self-center">
                {Object.values(mapeamento).filter((v) => v && v !== '__ignorar__').length} colunas
                associadas
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Opção de Idempotência (Apenas para Candidatos) */}
            {tipo === 'candidatos' && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-[#2E3A6E] bg-slate-50/60 dark:bg-[#11162B]">
                <Label className="font-display text-xs font-bold text-[#212B55] dark:text-[#F7F8FB] block mb-2">
                  Regra de Duplicidade por E-mail (Idempotência):
                </Label>
                <RadioGroup
                  value={modoDuplicado}
                  onValueChange={(val) => setModoDuplicado(val as any)}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <div className="flex items-start space-x-2 p-2.5 rounded-lg border border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240]">
                    <RadioGroupItem value="atualizar" id="dup-atualizar" className="mt-0.5" />
                    <Label htmlFor="dup-atualizar" className="text-xs cursor-pointer">
                      <strong className="block text-slate-900 dark:text-[#F7F8FB]">
                        Atualizar candidatos existentes
                      </strong>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Se o e-mail já existir no banco, atualiza telefone, cargo, skills e vaga.
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-start space-x-2 p-2.5 rounded-lg border border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240]">
                    <RadioGroupItem value="ignorar" id="dup-ignorar" className="mt-0.5" />
                    <Label htmlFor="dup-ignorar" className="text-xs cursor-pointer">
                      <strong className="block text-slate-900 dark:text-[#F7F8FB]">
                        Ignorar duplicados (não alterar)
                      </strong>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Mantém o registro original intacto e importa apenas os novos cadastros.
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Grid de Campos e Correspondências */}
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2">
                <span className="col-span-5">Campo do Sistema SouYess</span>
                <span className="col-span-7">Coluna na sua Planilha</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-[#2E3A6E] border border-slate-200 dark:border-[#2E3A6E] rounded-xl overflow-hidden bg-white dark:bg-[#1A2240]">
                {camposDefinicao.map((campo) => {
                  const colunaSelecionada = mapeamento[campo.campoBanco] || '__ignorar__'
                  const isMapeado = colunaSelecionada !== '__ignorar__'

                  return (
                    <div
                      key={campo.campoBanco}
                      className="grid grid-cols-12 gap-3 items-center p-3 hover:bg-slate-50/70 dark:hover:bg-[#11162B]/50 transition-colors"
                    >
                      <div className="col-span-5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-900 dark:text-[#F7F8FB]">
                            {campo.label}
                          </span>
                          {campo.obrigatorio && (
                            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-900">
                              Obrigatório
                            </span>
                          )}
                        </div>
                        {campo.dica && (
                          <p className="text-[11px] text-slate-400 dark:text-slate-400 mt-0.5">
                            {campo.dica}
                          </p>
                        )}
                      </div>

                      <div className="col-span-7 flex items-center gap-2">
                        <Select
                          value={colunaSelecionada}
                          onValueChange={(val) =>
                            setMapeamento((prev) => ({ ...prev, [campo.campoBanco]: val }))
                          }
                        >
                          <SelectTrigger
                            className={`text-xs h-9 ${
                              isMapeado
                                ? 'border-[#E9530E]/50 bg-[#FEF1EA]/30 dark:bg-[#E9530E]/10 font-semibold text-slate-900 dark:text-white'
                                : 'text-slate-400 border-slate-200 dark:border-[#2E3A6E]'
                            }`}
                          >
                            <SelectValue placeholder="Selecione a coluna..." />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-[#1A2240] dark:border-[#2E3A6E]">
                            <SelectItem value="__ignorar__" className="text-xs text-slate-400">
                              -- Não mapear este campo --
                            </SelectItem>
                            {dadosPlanilha.cabecalhos.map((cab) => (
                              <SelectItem key={cab} value={cab} className="text-xs">
                                📊 {cab}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {isMapeado && (
                          <div
                            className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0"
                            title="Mapeado com sucesso"
                          >
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t border-slate-100 dark:border-[#2E3A6E] justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => setEtapa(1)} className="text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Trocar Arquivo
            </Button>

            <Button
              type="button"
              disabled={validando}
              onClick={handleAvancarParaValidacao}
              className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-bold shadow-xs px-5"
            >
              {validando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Validando Linhas...
                </>
              ) : (
                <>
                  Pré-visualizar &amp; Validar
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 3: PRÉ-VISUALIZAÇÃO COM VALIDAÇÃO LINHA A LINHA */}
      {/* ========================================================================= */}
      {etapa === 3 && relatorioValidacao && (
        <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240]">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="font-display text-lg text-[#212B55] dark:text-[#F7F8FB]">
                  3. Pré-visualização &amp; Validação Linha a Linha
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Revise os dados antes da gravação definitiva. Erros críticos impedem a importação
                  daquela linha; avisos indicam duplicidades ou campos ajustados automaticamente.
                </CardDescription>
              </div>

              {/* Botão de Exportar Relatório de Erros */}
              {(relatorioValidacao.totalComErros > 0 || relatorioValidacao.totalComAvisos > 0) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBaixarRelatorioErros}
                  className="text-xs border-slate-300 dark:border-[#2E3A6E] font-semibold text-slate-700 dark:text-slate-300"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-[#E9530E]" />
                  Baixar Relatório de Inconsistências
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Cards de Resumo da Validação */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div
                onClick={() => setFiltroVisualizacao('todos')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  filtroVisualizacao === 'todos'
                    ? 'border-[#212B55] bg-slate-50 dark:bg-[#11162B] ring-2 ring-[#212B55]'
                    : 'border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240]'
                }`}
              >
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total de Linhas
                </span>
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-[#F7F8FB] mt-1 block">
                  {relatorioValidacao.itens.length}
                </span>
              </div>

              <div
                onClick={() => setFiltroVisualizacao('validos')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  filtroVisualizacao === 'validos'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 ring-2 ring-emerald-600'
                    : 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Prontos para Gravar
                </div>
                <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1 block">
                  {relatorioValidacao.totalValidos}
                </span>
              </div>

              <div
                onClick={() => setFiltroVisualizacao('avisos')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  filtroVisualizacao === 'avisos'
                    ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/30 ring-2 ring-amber-600'
                    : 'border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Com Avisos / Duplicados
                </div>
                <span className="text-2xl font-bold font-mono text-amber-700 dark:text-amber-300 mt-1 block">
                  {relatorioValidacao.totalComAvisos}
                </span>
              </div>

              <div
                onClick={() => setFiltroVisualizacao('erros')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  filtroVisualizacao === 'erros'
                    ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/30 ring-2 ring-rose-600'
                    : 'border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  Bloqueados por Erro
                </div>
                <span className="text-2xl font-bold font-mono text-rose-700 dark:text-rose-300 mt-1 block">
                  {relatorioValidacao.totalComErros}
                </span>
              </div>
            </div>

            {/* Tabela de Amostra com Validação Visual */}
            <div className="border border-slate-200 dark:border-[#2E3A6E] rounded-xl overflow-hidden bg-white dark:bg-[#1A2240]">
              <div className="max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-[#11162B] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-[#2E3A6E] z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-16">Linha</th>
                      <th className="py-2.5 px-3 w-28">Status</th>
                      <th className="py-2.5 px-3">
                        {tipo === 'candidatos' ? 'Candidato & Contato' : 'Vaga & Departamento'}
                      </th>
                      <th className="py-2.5 px-3">
                        {tipo === 'candidatos'
                          ? 'Vaga Associada / Estágio'
                          : 'Modalidade / Remuneração'}
                      </th>
                      <th className="py-2.5 px-3">Observações / Inconsistências</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#2E3A6E]">
                    {relatorioValidacao.itens
                      .filter((it) => {
                        if (filtroVisualizacao === 'erros') return it.status === 'erro'
                        if (filtroVisualizacao === 'avisos') return it.status === 'aviso'
                        if (filtroVisualizacao === 'validos') return it.status === 'valido'
                        return true
                      })
                      .map((it) => {
                        const m = it.dadosMapeados
                        const isErro = it.status === 'erro'
                        const isAviso = it.status === 'aviso'

                        return (
                          <tr
                            key={it.linhaOriginal}
                            className={`hover:bg-slate-50/70 dark:hover:bg-[#11162B]/50 transition-colors ${
                              isErro
                                ? 'bg-rose-50/40 dark:bg-rose-950/20'
                                : isAviso
                                  ? 'bg-amber-50/40 dark:bg-amber-950/20'
                                  : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono text-slate-500 font-semibold">
                              #{it.linhaOriginal}
                            </td>
                            <td className="py-2.5 px-3">
                              {isErro ? (
                                <Badge className="bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-900 text-[10px] font-bold">
                                  Erro Crítico
                                </Badge>
                              ) : isAviso ? (
                                <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-900 text-[10px] font-bold">
                                  Aviso / Ajustado
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-900 text-[10px] font-bold">
                                  Válido
                                </Badge>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {tipo === 'candidatos' ? (
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-[#F7F8FB] block">
                                    {m.nome || '—'}
                                  </span>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                    {m.email || 'Sem e-mail'} {m.telefone ? `· ${m.telefone}` : ''}
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-[#F7F8FB] block">
                                    {m.titulo || '—'}
                                  </span>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {m.departamento || 'Sem departamento'}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {tipo === 'candidatos' ? (
                                <div>
                                  <span className="font-medium text-slate-700 dark:text-slate-300 block">
                                    {vagasDisponiveis.find((v) => v.id === m.vaga)?.titulo ||
                                      (m.vaga ? 'Vaga Selecionada' : 'Sem vinculação')}
                                  </span>
                                  <span className="text-[10px] font-bold text-[#E9530E] bg-[#FEF1EA] dark:bg-[#E9530E]/20 px-1.5 py-0.2 rounded">
                                    {m.status || 'Triagem'}
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-medium text-slate-700 dark:text-slate-300 block">
                                    {m.modalidade} {m.localizacao ? `(${m.localizacao})` : ''}
                                  </span>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                    {m.faixa_salarial || 'A combinar'}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-[11px]">
                              {it.erros.length > 0 && (
                                <div className="text-rose-600 dark:text-rose-400 font-medium space-y-0.5">
                                  {it.erros.map((e, idx) => (
                                    <div key={idx} className="flex items-center gap-1">
                                      <XCircle className="w-3 h-3 shrink-0" />
                                      <span>{e}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {it.avisos.length > 0 && (
                                <div className="text-amber-700 dark:text-amber-400 font-medium space-y-0.5">
                                  {it.avisos.map((a, idx) => (
                                    <div key={idx} className="flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3 shrink-0" />
                                      <span>{a}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {it.erros.length === 0 && it.avisos.length === 0 && (
                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Tudo certo para gravação
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t border-slate-100 dark:border-[#2E3A6E] justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => setEtapa(2)} className="text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Ajustar Mapeamento
            </Button>

            <Button
              type="button"
              onClick={handleExecutarImportacao}
              disabled={relatorioValidacao.totalValidos + relatorioValidacao.totalComAvisos === 0}
              className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-bold shadow-xs px-6"
            >
              Confirmar e Importar (
              {relatorioValidacao.totalValidos + relatorioValidacao.totalComAvisos} Registros)
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 4: PROCESSAMENTO DA IMPORTAÇÃO (BARRA DE PROGRESSO) */}
      {/* ========================================================================= */}
      {etapa === 4 && (
        <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240] p-8 text-center">
          <div className="max-w-md mx-auto space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-[#FEF1EA] dark:bg-[#E9530E]/20 text-[#E9530E] flex items-center justify-center mx-auto shadow-xs">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>

            <div>
              <h3 className="font-display text-xl font-bold text-[#212B55] dark:text-[#F7F8FB]">
                Importando registros no banco de dados...
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Processando itens validados, sincronizando pipeline e registrando histórico de
                timeline.
              </p>
            </div>

            {/* Barra de Progresso */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">Progresso do Lote</span>
                <span className="text-[#E9530E] font-mono">{progressoPorcentagem}%</span>
              </div>
              <Progress
                value={progressoPorcentagem}
                className="h-2.5 bg-slate-100 dark:bg-[#11162B]"
              />
              <div className="text-[11px] text-slate-400 font-mono">
                Gravando {progressoItemAtual} de {relatorioValidacao?.itens.length || 0}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 5: RESUMO FINAL (SUCCESS STATE) */}
      {/* ========================================================================= */}
      {etapa === 5 && resultadoFinal && (
        <Card className="border-emerald-200 dark:border-emerald-900/60 shadow-xs bg-white dark:bg-[#1A2240] p-6 sm:p-8">
          <div className="max-w-2xl mx-auto space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="font-display text-[11px] uppercase font-bold tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
                Sucesso · Onboarding de Valor Concluído
              </span>
              <h2 className="font-display text-2xl font-bold text-[#212B55] dark:text-[#F7F8FB] mt-2">
                Dados importados com sucesso!
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                O sistema já sincronizou seus dados. Você agora pode visualizar o pipeline em
                Kanban, gerar rankings com IA e acompanhar as tarefas do Meu Dia.
              </p>
            </div>

            {/* Métricas do Resultado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#2E3A6E] bg-slate-50 dark:bg-[#11162B]">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Processados</span>
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-[#F7F8FB] mt-0.5 block">
                  {resultadoFinal.totalProcessados}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                  Novos Criados
                </span>
                <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-0.5 block">
                  {resultadoFinal.totalCriados}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase">
                  Atualizados
                </span>
                <span className="text-2xl font-bold font-mono text-blue-700 dark:text-blue-300 mt-0.5 block">
                  {resultadoFinal.totalAtualizados}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#2E3A6E] bg-slate-50 dark:bg-[#11162B]">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Ignorados/Erros
                </span>
                <span className="text-2xl font-bold font-mono text-slate-600 dark:text-slate-400 mt-0.5 block">
                  {resultadoFinal.totalIgnorados + resultadoFinal.totalErros}
                </span>
              </div>
            </div>

            {/* Ações Seguintes de Valor */}
            <div className="pt-4 border-t border-slate-100 dark:border-[#2E3A6E] flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleReiniciar}
                className="text-xs border-slate-300 dark:border-[#2E3A6E]"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Importar Outra Planilha
              </Button>

              <Button
                type="button"
                onClick={() => navigate(tipo === 'candidatos' ? '/candidatos' : '/vagas')}
                className="bg-[#212B55] hover:bg-[#1A2240] text-white text-xs font-bold"
              >
                Ver {tipo === 'candidatos' ? 'Candidatos Cadastrados' : 'Vagas Cadastradas'}
              </Button>

              <Button
                type="button"
                onClick={() => navigate('/meu-dia')}
                className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-bold shadow-xs px-5"
              >
                Ir para o Meu Dia
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

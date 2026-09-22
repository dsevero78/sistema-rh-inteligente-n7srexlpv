import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Plus,
  FileText,
  DollarSign,
  Send,
  Eye,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  horasService,
  type ApontamentoHora,
  type FechamentoCompetencia,
} from '@/services/horasService'
import { fechamentoNfService, type NotaFiscalLoteItem } from '@/services/fechamentoNfService'
import type { PessoaUnificada } from '@/services/pessoasService'
import { DocumentViewerModal } from '@/components/prestadores/DocumentViewerModal'

interface AbaHorasPessoaProps {
  pessoa: PessoaUnificada
  onAtualizar?: () => void
}

export function AbaHorasPessoa({ pessoa, onAtualizar }: AbaHorasPessoaProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const isGestor = user?.cargo_funcao === 'Gestor Contratante'
  const isRhOuAdmin = !isGestor

  const [loading, setLoading] = useState(true)
  const [fechamentos, setFechamentos] = useState<FechamentoCompetencia[]>([])
  const [nfs, setNfs] = useState<NotaFiscalLoteItem[]>([])
  const [apontamentosRecentes, setApontamentosRecentes] = useState<ApontamentoHora[]>([])

  // Modal para lançar horas nesta pessoa
  const [modalOpen, setModalOpen] = useState(false)
  const [competenciaInput, setCompetenciaInput] = useState('2026-09')
  const [dataInput, setDataInput] = useState(new Date().toISOString().substring(0, 10))
  const [horasInput, setHorasInput] = useState<number>(40)
  const [tipoInput, setTipoInput] = useState<'Normal' | 'Extra' | 'Sobreaviso'>('Normal')
  const [descInput, setDescInput] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [enviandoRh, setEnviandoRh] = useState(false)

  // Visualizador de arquivo da NF
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerUrl, setViewerUrl] = useState('')
  const [viewerTitle, setViewerTitle] = useState('')

  const carregarHistorico = async () => {
    setLoading(true)
    try {
      const [fechs, nfsList, apSetembro] = await Promise.all([
        horasService.listarFechamentosPorPessoa(pessoa.id),
        fechamentoNfService.listarNfsPorPessoa(pessoa.id),
        horasService.listarApontamentosPorPessoaECompetencia(pessoa.id, '2026-09'),
      ])
      setFechamentos(fechs)
      setNfs(nfsList)
      setApontamentosRecentes(apSetembro)
    } catch (err) {
      console.error('Erro ao carregar horas da pessoa:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (pessoa?.id) {
      carregarHistorico()
    }
  }, [pessoa?.id])

  const handleSalvarApontamento = async () => {
    if (horasInput <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Informe um número de horas maior que zero.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      await horasService.criarApontamento({
        pessoa: pessoa.id,
        competencia: competenciaInput,
        data: dataInput,
        horas: Number(horasInput),
        tipo: tipoInput,
        descricao: descInput.trim() || undefined,
        status: 'Aprovado',
        vinculo_referencia: pessoa.cpf_cnpj || undefined,
        criado_por: user?.name
          ? `${user.name} (${isGestor ? 'Gestor' : 'RH'})`
          : 'Gestor Contratante',
      })

      // Recalcular fechamento em aberto
      const apList = await horasService.listarApontamentosPorPessoaECompetencia(
        pessoa.id,
        competenciaInput,
      )
      const totalH = apList.reduce((acc, a) => acc + (a.horas || 0), 0)
      const vHora =
        pessoa.valor_hora || (pessoa.valor_contratado ? pessoa.valor_contratado / 160 : 100)

      await horasService.upsertFechamento({
        pessoa: pessoa.id,
        competencia: competenciaInput,
        total_horas: totalH,
        horas_normais: totalH,
        horas_base_contrato: pessoa.horas_mensais_base || 160,
        valor_hora_congelado: vHora,
        valor_total_calculado: totalH * vHora,
        status_ciclo: 'Em apontamento',
        gestor_nome: pessoa.gestor_nome || user?.name || undefined,
        gestor_validador: pessoa.gestor_responsavel || user?.id || undefined,
        prestador: pessoa.prestador_origem || undefined,
      })

      toast({
        title: 'Horas apontadas!',
        description: `${horasInput}h registradas para a competência ${competenciaInput}.`,
      })

      setModalOpen(false)
      setDescInput('')
      setHorasInput(40)
      await carregarHistorico()
      if (onAtualizar) onAtualizar()
    } catch (err: any) {
      toast({
        title: 'Erro ao apontar horas',
        description: err?.message || 'Falha na persistência.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleSubmeterParaRh = async (fechId: string) => {
    setEnviandoRh(true)
    try {
      const autor = user?.name || pessoa.gestor_nome || 'Gestor Contratante'
      await horasService.enviarParaValidacaoRh(fechId, autor)
      toast({
        title: 'Enviado para o RH',
        description: 'Fechamento da competência submetido para validação do RH.',
      })
      await carregarHistorico()
      if (onAtualizar) onAtualizar()
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar',
        description: err?.message || 'Falha ao submeter fechamento ao RH.',
        variant: 'destructive',
      })
    } finally {
      setEnviandoRh(false)
    }
  }

  // Mapa de NFs por competência
  const nfPorCompetencia = new Map<string, NotaFiscalLoteItem>()
  nfs.forEach((n) => nfPorCompetencia.set(n.competencia, n))

  return (
    <div className="space-y-6">
      {/* 1. Header do Bloco com Atalho para Horas & Competências */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-xl p-4 shadow-xs">
        <div>
          <h3 className="font-bold text-base text-[#212B55] dark:text-[#F7F8FB] font-display flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#E9530E]" />
            Apontamento de Horas & Fechamento de Competência
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Base contratada:{' '}
            <strong className="font-mono text-foreground">
              {pessoa.horas_mensais_base || 160}h/mês
            </strong>{' '}
            · Valor/hora acordado:{' '}
            <strong className="font-mono text-emerald-600 dark:text-emerald-400">
              R$ {pessoa.valor_hora?.toFixed(2)}/h
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="text-xs font-bold bg-[#E9530E] hover:bg-[#C5430A] text-white gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            {isGestor ? 'Lançar Horas' : 'Lançar Horas (Apoio RH)'}
          </Button>

          <Button asChild size="sm" variant="outline" className="text-xs font-semibold gap-1.5">
            <Link to={`/horas-competencias?comp=2026-09`}>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              Módulo Horas & Competências
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Histórico de Competências da Pessoa */}
      <Card className="bg-card border-border/80">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60">
          <CardTitle className="text-sm font-bold font-display text-[#212B55] dark:text-[#F7F8FB]">
            Ciclos de Competência e Fechamento
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Fluxo oficial: Gestor aponta horas → Aguardando validação do RH → Validado → NF
            solicitada → Recebida → Fechado.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Carregando histórico de horas e fechamentos...
            </div>
          ) : fechamentos.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Nenhuma competência registrada para este prestador ainda. Clique em "Lançar Horas"
              acima para iniciar o primeiro ciclo.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {fechamentos.map((f) => {
                const nf = nfPorCompetencia.get(f.competencia)

                return (
                  <div
                    key={f.id}
                    className="p-4 sm:p-5 hover:bg-muted/20 transition-colors space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-bold text-sm text-[#212B55] dark:text-[#F7F8FB]">
                          Competência {f.competencia}
                        </span>

                        <Badge
                          className={`text-xs font-bold font-sans ${
                            f.status_ciclo === 'Fechado'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                              : f.status_ciclo === 'Validado'
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300'
                                : f.status_ciclo === 'Aguardando validação do RH'
                                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                  : f.status_ciclo === 'Devolvido para ajustes'
                                    ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300'
                                    : f.status_ciclo === 'NF solicitada'
                                      ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                                      : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}
                        >
                          {f.status_ciclo}
                        </Badge>

                        {(f.status_ciclo === 'Em apontamento' ||
                          f.status_ciclo === 'Devolvido para ajustes') && (
                          <Button
                            size="sm"
                            onClick={() => handleSubmeterParaRh(f.id)}
                            disabled={enviandoRh}
                            className="h-6 text-[10px] bg-[#212B55] hover:bg-[#11162B] text-white px-2 font-semibold gap-1"
                          >
                            <Send className="w-3 h-3" />
                            {f.status_ciclo === 'Devolvido para ajustes'
                              ? 'Reenviar ao RH'
                              : 'Concluir e Enviar ao RH'}
                          </Button>
                        )}

                        {nf && (
                          <Badge
                            variant="outline"
                            className={`text-xs font-bold font-mono ${
                              nf.status === 'Conciliada'
                                ? 'text-emerald-700 border-emerald-400 bg-emerald-50'
                                : nf.status === 'Recebida'
                                  ? 'text-blue-700 border-blue-400 bg-blue-50'
                                  : nf.status === 'Em atraso'
                                    ? 'text-red-700 border-red-400 bg-red-50'
                                    : 'text-amber-700 border-amber-400 bg-amber-50'
                            }`}
                          >
                            NF: {nf.status} {nf.numero_nf ? `(${nf.numero_nf})` : ''}
                          </Badge>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">Total Calculado</span>
                        <span className="text-base font-black font-mono text-[#212B55] dark:text-[#F7F8FB] tabular-nums">
                          R${' '}
                          {(Number(f.valor_total_calculado) || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-sans bg-muted/30 p-2.5 rounded-lg border border-border/40">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                          Horas Totais
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          {Number(f.total_horas || 0).toFixed(1)}h
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Normais: {f.horas_normais || f.total_horas || 0}h | Extras:{' '}
                          {f.horas_extras || 0}h
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                          Valor/Hora Congelado
                        </span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          R$ {Number(f.valor_hora_congelado || 0).toFixed(2)}/h
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                          Validação pelo RH
                        </span>
                        <span className="font-semibold text-foreground truncate block">
                          {f.status_ciclo === 'Validado' || f.status_ciclo === 'Fechado'
                            ? 'Aprovado pelo RH'
                            : f.status_ciclo === 'Devolvido para ajustes'
                              ? 'Devolvido p/ Ajustes'
                              : f.status_ciclo === 'Aguardando validação do RH'
                                ? 'Em análise no RH'
                                : 'Em apontamento'}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          {f.data_validacao
                            ? new Date(f.data_validacao).toLocaleDateString('pt-BR')
                            : 'Aguardando validação'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                          Documento Fiscal
                        </span>
                        {nf?.arquivo_nf ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const url = fechamentoNfService.obterUrlArquivoNf(nf, nf.arquivo_nf)
                              setViewerUrl(url)
                              setViewerTitle(`Nota Fiscal ${nf.numero_nf || f.competencia}`)
                              setViewerOpen(true)
                            }}
                            className="h-6 px-1.5 text-xs text-blue-600 hover:text-blue-800 gap-1 font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Visualizar NF
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            {nf ? `Status: ${nf.status}` : 'Não emitida'}
                          </span>
                        )}
                      </div>
                    </div>

                    {f.parecer_gestor && (
                      <div
                        className={`text-xs p-2 rounded border flex items-start gap-2 ${
                          f.status_ciclo === 'Devolvido para ajustes'
                            ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300'
                            : 'bg-muted/20 text-muted-foreground border-border/40'
                        }`}
                      >
                        <ShieldCheck
                          className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                            f.status_ciclo === 'Devolvido para ajustes'
                              ? 'text-red-600'
                              : 'text-indigo-600'
                          }`}
                        />
                        <div>
                          <strong className="text-foreground">
                            {f.status_ciclo === 'Devolvido para ajustes'
                              ? 'Observação do RH: '
                              : 'Parecer do RH: '}
                          </strong>
                          <span>"{f.parecer_gestor}"</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Lista de Apontamentos da Competência Atual (2026-09) */}
      <Card className="bg-card border-border/80">
        <CardHeader className="p-4 sm:p-5 border-b border-border/60">
          <CardTitle className="text-sm font-bold font-display text-[#212B55] dark:text-[#F7F8FB]">
            Apontamentos Detalhados (Competência Atual: 2026-09)
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Lançamentos de horas da sprint com data, quantidade, modalidade e escopo.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {apontamentosRecentes.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhum apontamento individual registrado em setembro/2026.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {apontamentosRecentes.map((ap) => (
                <div
                  key={ap.id}
                  className="p-3.5 px-5 flex items-center justify-between text-xs hover:bg-muted/15"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground">
                        {new Date(ap.data).toLocaleDateString('pt-BR')}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {ap.tipo}
                      </Badge>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                        {ap.status}
                      </Badge>
                    </div>
                    {ap.descricao && (
                      <p className="text-muted-foreground text-xs">{ap.descricao}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-base font-bold font-mono text-[#212B55] dark:text-[#F7F8FB]">
                      {ap.horas || 0}h
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      R$ {Number((ap.horas || 0) * (pessoa.valor_hora || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Lançar Horas */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lançar Horas para {pessoa.nome}</DialogTitle>
            <DialogDescription>
              Apontamento de horas para fechamento da competência em horas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Competência (AAAA-MM)</Label>
                <Select value={competenciaInput} onValueChange={setCompetenciaInput}>
                  <SelectTrigger className="text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026-09" className="text-xs font-mono">
                      2026-09 (Atual)
                    </SelectItem>
                    <SelectItem value="2026-08" className="text-xs font-mono">
                      2026-08
                    </SelectItem>
                    <SelectItem value="2026-07" className="text-xs font-mono">
                      2026-07
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data</Label>
                <Input
                  type="date"
                  value={dataInput}
                  onChange={(e) => setDataInput(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Horas</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={horasInput}
                  onChange={(e) => setHorasInput(Number(e.target.value))}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo</Label>
                <Select value={tipoInput} onValueChange={(val: any) => setTipoInput(val)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal" className="text-xs">
                      Normal (Base 160h)
                    </SelectItem>
                    <SelectItem value="Extra" className="text-xs">
                      Extra
                    </SelectItem>
                    <SelectItem value="Sobreaviso" className="text-xs">
                      Sobreaviso
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição / Escopo Entregue</Label>
              <Textarea
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                placeholder="Ex: Entrega de sprint, arquitetura e revisão de código..."
                className="text-xs h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvarApontamento}
              disabled={salvando}
              className="bg-[#E9530E] hover:bg-[#C5430A] text-white font-bold"
            >
              {salvando ? 'Salvando...' : 'Gravar Apontamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visualizador de NF */}
      <DocumentViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        url={viewerUrl}
        title={viewerTitle}
      />
    </div>
  )
}

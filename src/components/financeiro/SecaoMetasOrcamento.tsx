import { useState } from 'react'
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Building2,
  ShieldAlert,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  metasOrcamentoService,
  type MetaDepartamentoConsolidada,
} from '@/services/metasOrcamentoService'

interface SecaoMetasOrcamentoProps {
  metas: MetaDepartamentoConsolidada[]
  horizonteMeses: number
  departamentosSugeridos: string[]
  onAtualizar: () => Promise<void>
}

export function SecaoMetasOrcamento({
  metas,
  horizonteMeses,
  departamentosSugeridos,
  onAtualizar,
}: SecaoMetasOrcamentoProps) {
  const { toast } = useToast()

  // Modal Criar/Editar Meta
  const [modalAberto, setModalAberto] = useState(false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [checandoAlertas, setChecandoAlertas] = useState(false)
  const [erroConsultaAlertas, setErroConsultaAlertas] = useState<string | null>(null)
  const [ultimoResultadoAlertas, setUltimoResultadoAlertas] = useState(() =>
    metasOrcamentoService.getUltimoResultadoAlertas(),
  )

  // Estado do formulário
  const [metaEmEdicaoId, setMetaEmEdicaoId] = useState<string | null>(null)
  const [formDepto, setFormDepto] = useState('')
  const [formDeptoCustom, setFormDeptoCustom] = useState('')
  const [formLimite, setFormLimite] = useState('')
  const [formAtivo, setFormAtivo] = useState(true)
  const [metaParaExcluir, setMetaParaExcluir] = useState<MetaDepartamentoConsolidada | null>(null)

  const formatarMoeda = (val: number) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  const abrirModalNovaMeta = () => {
    setMetaEmEdicaoId(null)
    setFormDepto(departamentosSugeridos[0] || 'Tecnologia')
    setFormDeptoCustom('')
    setFormLimite('25000')
    setFormAtivo(true)
    setModalAberto(true)
  }

  const abrirModalEditarMeta = (m: MetaDepartamentoConsolidada) => {
    setMetaEmEdicaoId(m.id || null)
    if (departamentosSugeridos.includes(m.departamento)) {
      setFormDepto(m.departamento)
      setFormDeptoCustom('')
    } else {
      setFormDepto('outro')
      setFormDeptoCustom(m.departamento)
    }
    setFormLimite(String(m.limiteMensal || ''))
    setFormAtivo(m.ativo)
    setModalAberto(true)
  }

  const abrirModalConfirmarExclusao = (m: MetaDepartamentoConsolidada) => {
    setMetaParaExcluir(m)
    setModalExcluirAberto(true)
  }

  const handleSalvarMeta = async (e: React.FormEvent) => {
    e.preventDefault()
    const nomeFinal = formDepto === 'outro' ? formDeptoCustom.trim() : formDepto.trim()
    const limiteNum = Number(formLimite.replace(/\D/g, '')) || Number(formLimite) || 0

    if (!nomeFinal) {
      toast({
        title: 'Nome do departamento obrigatório',
        description: 'Selecione ou digite um departamento válido.',
        variant: 'destructive',
      })
      return
    }

    if (limiteNum <= 0) {
      toast({
        title: 'Limite mensal inválido',
        description: 'Informe um valor limite mensal maior que zero.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      if (metaEmEdicaoId) {
        await metasOrcamentoService.atualizar(metaEmEdicaoId, {
          departamento: nomeFinal,
          limite_mensal: limiteNum,
          ativo: formAtivo,
        })
        toast({
          title: 'Meta orçamentária atualizada',
          description: `Limite mensal de ${formatarMoeda(limiteNum)} definido para ${nomeFinal}.`,
        })
      } else {
        await metasOrcamentoService.criar({
          departamento: nomeFinal,
          limite_mensal: limiteNum,
          ativo: formAtivo,
        })
        toast({
          title: 'Meta orçamentária criada',
          description: `Novo teto de ${formatarMoeda(limiteNum)} cadastrado para ${nomeFinal}.`,
        })
      }

      setModalAberto(false)
      await onAtualizar()
    } catch (err: unknown) {
      console.error('Falha ao salvar meta:', err)
      toast({
        title: 'Erro ao salvar meta',
        description: err instanceof Error ? err.message : 'Verifique se o departamento já existe.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluirMeta = async () => {
    if (!metaParaExcluir || !metaParaExcluir.id) return
    setExcluindo(true)
    try {
      await metasOrcamentoService.excluir(metaParaExcluir.id)
      toast({
        title: 'Meta removida',
        description: `O controle de teto de ${metaParaExcluir.departamento} foi excluído.`,
      })
      setModalExcluirAberto(false)
      setMetaParaExcluir(null)
      await onAtualizar()
    } catch (err: unknown) {
      toast({
        title: 'Falha ao excluir meta',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setExcluindo(false)
    }
  }

  const handleVerificarAlertasSino = async () => {
    setChecandoAlertas(true)
    setErroConsultaAlertas(null)
    try {
      const res = await metasOrcamentoService.checarAlertas()
      setUltimoResultadoAlertas(res)
      if (res.alertas_gerados > 0) {
        toast({
          title: `${res.alertas_gerados} novo(s) alerta(s) emitido(s)`,
          description: 'Notificações geradas no sino para departamentos estourados ou em atenção.',
        })
      } else {
        toast({
          title: 'Varredura concluída',
          description: 'Nenhum novo alerta pendente de registro para o mês corrente.',
        })
      }
      await onAtualizar()
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Serviço de verificação de alertas temporariamente indisponível.'
      setErroConsultaAlertas(msg)
      toast({
        title: 'Falha na checagem de alertas',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setChecandoAlertas(false)
    }
  }

  // Formatação amigável da data da última verificação válida
  const formatarDataChecagem = (iso?: string) => {
    if (!iso) return ''
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (_) {
      return iso
    }
  }

  // Departamentos estourados e em atenção para destaques
  const estourados = metas.filter((m) => m.ativo && m.limiteMensal > 0 && m.status === 'estourado')

  return (
    <div className="space-y-4">
      {/* Banner de Erro: Consulta de Alertas Indisponível */}
      {erroConsultaAlertas && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-4 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Consulta de Alertas Indisponível
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Não foi possível checar os alertas orçamentários em tempo real no servidor (
                  {erroConsultaAlertas}).
                  {ultimoResultadoAlertas?.verificado_em && (
                    <span className="block mt-1 text-[11px] text-amber-900/80 font-medium">
                      Exibindo último resultado verificado em:{' '}
                      <strong className="underline">
                        {formatarDataChecagem(ultimoResultadoAlertas.verificado_em)}
                      </strong>{' '}
                      (dados desatualizados mantidos com sua data original).
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleVerificarAlertasSino}
              disabled={checandoAlertas}
              className="h-8 gap-1.5 text-xs text-amber-900 border-amber-300 hover:bg-amber-100 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checandoAlertas ? 'animate-spin' : ''}`} />
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {/* Banner de Status Válido Anterior caso não haja erro atual */}
      {!erroConsultaAlertas && ultimoResultadoAlertas?.verificado_em && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Última checagem de metas executada em:{' '}
              <strong className="text-slate-800">
                {formatarDataChecagem(ultimoResultadoAlertas.verificado_em)}
              </strong>
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {ultimoResultadoAlertas.alertas_gerados > 0
              ? `${ultimoResultadoAlertas.alertas_gerados} alerta(s) emitido(s)`
              : 'Sem alertas pendentes no momento da checagem'}
          </span>
        </div>
      )}

      {/* Banner de Destaque se houver departamentos estourados */}
      {estourados.length > 0 && (
        <div className="bg-red-50/90 border border-red-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-100 text-red-700 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider">
                  Estouro Crítico de Orçamento Departamental
                </h4>
                <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                  {estourados.length} departamento(s) acima de 100%
                </Badge>
              </div>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">
                A projeção financeira consolidada aponta comprometimento superior ao limite mensal
                fixado pelo RH:{' '}
                {estourados.map((d, i) => (
                  <span key={d.departamento} className="font-bold">
                    {d.departamento} ({d.percentualUsoProjecao}% do limite de{' '}
                    {formatarMoeda(d.limiteMensal)}){i < estourados.length - 1 ? ', ' : '.'}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Card Principal: Metas por Departamento */}
      <Card className="border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-blue-100 text-blue-700">
                  <Target className="w-4 h-4" />
                </span>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Metas de Orçamento por Departamento
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-semibold bg-slate-200/80 text-slate-700"
                >
                  Horizonte: {horizonteMeses} meses
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Limites mensais estabelecidos pelo RH com monitoramento do mês atual e projeção
                média no horizonte selecionado.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleVerificarAlertasSino}
                disabled={checandoAlertas}
                className="h-8 gap-1.5 text-xs text-slate-700 hover:text-slate-900 border-slate-200"
                title="Executar verificação de limites e enviar alertas para o sino"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                {checandoAlertas ? 'Checando...' : 'Verificar Alertas'}
              </Button>

              <Button
                size="sm"
                onClick={abrirModalNovaMeta}
                className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Meta
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Tabela de Metas Departamentais */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="p-3.5 pl-5">Departamento</th>
                <th className="p-3.5">Limite Mensal</th>
                <th className="p-3.5">Gasto Atual (Mês)</th>
                <th className="p-3.5">Projeção Média ({horizonteMeses}m)</th>
                <th className="p-3.5 min-w-[180px]">Utilização do Teto</th>
                <th className="p-3.5">Status (Semáforo)</th>
                <th className="p-3.5 pr-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {metas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                    Nenhuma meta de orçamento departamental configurada. Clique em "Nova Meta" para
                    definir tetos de gastos.
                  </td>
                </tr>
              ) : (
                metas.map((m) => {
                  const pctProjecao = m.percentualUsoProjecao
                  const isEstourado = m.status === 'estourado'
                  const isAtencao = m.status === 'atencao'

                  // Cores da barra de progresso
                  let barColorClass = 'bg-emerald-500'
                  let badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  let statusTexto = 'Dentro do orçamento'

                  if (isEstourado) {
                    barColorClass = 'bg-red-500'
                    badgeClass = 'bg-red-100 text-red-800 border-red-300'
                    statusTexto = 'Estourado (>100%)'
                  } else if (isAtencao) {
                    barColorClass = 'bg-amber-500'
                    badgeClass = 'bg-amber-100 text-amber-800 border-amber-300'
                    statusTexto = 'Em atenção (≥90%)'
                  }

                  return (
                    <tr key={m.departamento} className="hover:bg-slate-50/70 transition-colors">
                      {/* Departamento */}
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-2">
                          <span className="p-1 rounded bg-slate-100 text-slate-600">
                            <Building2 className="w-3.5 h-3.5" />
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{m.departamento}</div>
                            <div className="text-[10px] text-slate-400">
                              {m.ativo ? 'Meta ativa' : 'Meta desativada'} •{' '}
                              {m.prestadoresAssociados.length} PJ(s), {m.vagasAssociadas.length}{' '}
                              vaga(s)
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Limite Mensal */}
                      <td className="p-3.5">
                        {m.limiteMensal > 0 ? (
                          <div>
                            <div className="font-extrabold text-slate-900">
                              {formatarMoeda(m.limiteMensal)}
                            </div>
                            <span className="text-[10px] text-slate-400">teto mensal</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Não definido</span>
                        )}
                      </td>

                      {/* Gasto Atual (Mês Corrente) */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">
                          {formatarMoeda(m.gastoAtualMes)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          PJ: {formatarMoeda(m.custoPj)} + Folha: {formatarMoeda(m.custoFolha)}
                        </span>
                      </td>

                      {/* Projeção Média Mensal */}
                      <td className="p-3.5">
                        <div className="font-extrabold text-indigo-700">
                          {formatarMoeda(m.projecaoMediaMensal)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          média em {horizonteMeses} meses
                        </span>
                      </td>

                      {/* Barra de Progresso e % de Uso */}
                      <td className="p-3.5">
                        {m.limiteMensal > 0 ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-slate-700">
                                {pctProjecao}% do limite
                              </span>
                              {pctProjecao > 100 && (
                                <span className="font-bold text-red-600 text-[10px]">
                                  +{formatarMoeda(m.projecaoMediaMensal - m.limiteMensal)}
                                </span>
                              )}
                            </div>
                            {/* Barra com progresso até 100% visual e marcador */}
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
                                style={{ width: `${Math.min(pctProjecao, 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Sem limite cadastrado
                          </span>
                        )}
                      </td>

                      {/* Semáforo de Status */}
                      <td className="p-3.5">
                        {m.limiteMensal > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold py-0.5 px-2 flex items-center gap-1 border ${badgeClass}`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isEstourado
                                    ? 'bg-red-600 animate-pulse'
                                    : isAtencao
                                      ? 'bg-amber-600'
                                      : 'bg-emerald-600'
                                }`}
                              />
                              {statusTexto}
                            </Badge>
                          </div>
                        ) : (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-xs text-blue-600"
                            onClick={() => abrirModalEditarMeta(m)}
                          >
                            + Definir meta
                          </Button>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {m.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => abrirModalEditarMeta(m)}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                                title="Editar meta"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => abrirModalConfirmarExclusao(m)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                                title="Excluir meta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => abrirModalEditarMeta(m)}
                              className="h-7 text-[11px] text-blue-700 border-blue-200 hover:bg-blue-50"
                            >
                              Criar Meta
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Criar/Editar Meta */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Target className="w-5 h-5 text-blue-600" />
              {metaEmEdicaoId ? 'Editar Meta de Orçamento' : 'Nova Meta de Orçamento'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Defina o teto mensal máximo de despesas para o departamento. O sistema alertará quando
              a projeção atingir 90% ou ultrapassar 100%.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarMeta} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="meta-depto" className="text-xs font-semibold text-slate-700">
                Departamento
              </Label>
              <Select value={formDepto} onValueChange={setFormDepto}>
                <SelectTrigger id="meta-depto" className="text-xs">
                  <SelectValue placeholder="Selecione o departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departamentosSugeridos.map((dep) => (
                    <SelectItem key={dep} value={dep} className="text-xs">
                      {dep}
                    </SelectItem>
                  ))}
                  <SelectItem value="outro" className="text-xs">
                    Outro departamento (digitar)...
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formDepto === 'outro' && (
              <div className="space-y-1.5">
                <Label htmlFor="meta-depto-custom" className="text-xs font-semibold text-slate-700">
                  Nome do departamento
                </Label>
                <Input
                  id="meta-depto-custom"
                  value={formDeptoCustom}
                  onChange={(e) => setFormDeptoCustom(e.target.value)}
                  placeholder="Ex: Comercial, Financeiro, Operações"
                  className="text-xs"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="meta-limite" className="text-xs font-semibold text-slate-700">
                Limite Mensal de Orçamento (R$)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">
                  R$
                </span>
                <Input
                  id="meta-limite"
                  type="number"
                  step="500"
                  min="1000"
                  value={formLimite}
                  onChange={(e) => setFormLimite(e.target.value)}
                  placeholder="Ex: 35000"
                  className="pl-9 text-xs font-bold"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Teto mensal que abrange prestadores de serviços PJ contratados e folha de novas
                contratações do setor.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="space-y-0.5">
                <Label htmlFor="meta-ativo" className="text-xs font-semibold text-slate-800">
                  Monitoramento e Alertas Ativos
                </Label>
                <p className="text-[11px] text-slate-500">
                  Emitir notificações automáticas quando a projeção ultrapassar os limiares.
                </p>
              </div>
              <Switch id="meta-ativo" checked={formAtivo} onCheckedChange={setFormAtivo} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalAberto(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={salvando}
              >
                {salvando ? 'Salvando...' : metaEmEdicaoId ? 'Salvar Alterações' : 'Criar Meta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Exclusão */}
      <Dialog open={modalExcluirAberto} onOpenChange={setModalExcluirAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900">Remover Meta de Orçamento</DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Tem certeza que deseja remover o limite de orçamento de{' '}
              <strong className="text-slate-900">{metaParaExcluir?.departamento}</strong>? Os
              alertas automáticos desse setor serão interrompidos.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setModalExcluirAberto(false)}
              disabled={excluindo}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluirMeta} disabled={excluindo}>
              {excluindo ? 'Excluindo...' : 'Sim, remover meta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

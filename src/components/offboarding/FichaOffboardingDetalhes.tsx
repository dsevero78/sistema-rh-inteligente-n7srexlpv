import { useState } from 'react'
import {
  OffboardingRegistro,
  ItemChecklistOffboarding,
  CalculoRescisorioClt,
  CalculoRescisorioPj,
  offboardingService,
} from '@/services/offboardingService'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  Laptop,
  KeyRound,
  ShieldCheck,
  Building2,
  Calendar,
  User,
  ArrowRight,
  Upload,
} from 'lucide-react'

interface FichaOffboardingDetalhesProps {
  offboarding: OffboardingRegistro
  onAtualizado: () => void
  onVoltar?: () => void
}

export function FichaOffboardingDetalhes({
  offboarding,
  onAtualizado,
  onVoltar,
}: FichaOffboardingDetalhesProps) {
  const { toast } = useToast()
  const [salvandoItem, setSalvandoItem] = useState<string | null>(null)
  const [modalConcluirAberto, setModalConcluirAberto] = useState(false)
  const [nomeConclusao, setNomeConclusao] = useState('Gente & Gestão (RH)')
  const [obsConclusao, setObsConclusao] = useState('')
  const [concluindoFormal, setConcluindoFormal] = useState(false)
  const [uploadingTermo, setUploadingTermo] = useState(false)

  const cltCalc =
    offboarding.modalidade === 'CLT'
      ? (offboarding.calculo_rescisorio as CalculoRescisorioClt)
      : null
  const pjCalc =
    offboarding.modalidade === 'PJ' ? (offboarding.calculo_rescisorio as CalculoRescisorioPj) : null

  const itensConcluidos = offboarding.itens_checklist.filter((i) => i.concluido).length
  const totalItens = offboarding.itens_checklist.length
  const progressoPercent = totalItens > 0 ? Math.round((itensConcluidos / totalItens) * 100) : 0

  const handleAlternarCheck = async (item: ItemChecklistOffboarding) => {
    try {
      setSalvandoItem(item.id)
      await offboardingService.alternarItemChecklist(offboarding.id, item.id, !item.concluido)
      toast({
        title: !item.concluido ? 'Etapa marcada como concluída' : 'Etapa reaberta',
        description: item.titulo,
      })
      onAtualizado()
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar etapa',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoItem(null)
    }
  }

  const handleConcluirFormalmente = async () => {
    try {
      setConcluindoFormal(true)
      await offboardingService.concluirFormalmente(offboarding.id, nomeConclusao, obsConclusao)
      toast({
        title: 'Desligamento homologado e encerrado',
        description: 'Vínculo marcado como Encerrado na base e benefícios futuros bloqueados.',
      })
      setModalConcluirAberto(false)
      onAtualizado()
    } catch (err: any) {
      toast({
        title: 'Erro ao concluir offboarding',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setConcluindoFormal(false)
    }
  }

  const handleUploadTermo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingTermo(true)
      await offboardingService.anexarTermoRescisao(offboarding.id, file)
      toast({
        title: 'Termo anexado ao cofre com sucesso',
        description: file.name,
      })
      onAtualizado()
    } catch (err: any) {
      toast({
        title: 'Erro no upload do termo',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setUploadingTermo(false)
    }
  }

  const formatarMoeda = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const formatarData = (d?: string) => {
    if (!d) return '-'
    const date = new Date(d)
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {onVoltar && (
              <Button variant="ghost" size="sm" onClick={onVoltar} className="h-7 text-xs">
                ← Voltar à lista
              </Button>
            )}
            <Badge
              variant="outline"
              className={
                offboarding.modalidade === 'CLT'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                  : 'bg-purple-50 text-purple-700 border-purple-200 font-semibold'
              }
            >
              {offboarding.modalidade}
            </Badge>
            <Badge
              className={
                offboarding.status === 'Concluído'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 text-white'
              }
            >
              {offboarding.status}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              ID: {offboarding.id.slice(0, 8)}
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {offboarding.expand?.pessoa?.nome || 'Colaborador / Prestador'}
          </h2>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
            <span className="flex items-center gap-1 font-medium">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {offboarding.empresa_nome || 'Empresa do Grupo'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Aviso: <strong>{formatarData(offboarding.data_aviso)}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-red-500" />
              Último dia:{' '}
              <strong className="text-red-700">
                {formatarData(offboarding.data_desligamento)}
              </strong>
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Resp.: {offboarding.responsavel_nome || 'RH'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {offboarding.status !== 'Concluído' && (
            <Button
              variant="default"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={() => setModalConcluirAberto(true)}
            >
              <CheckCircle2 className="w-4 h-4" />
              Concluir & Homologar Desligamento
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Progresso do Checklist */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-semibold text-slate-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Progresso do Checklist de Desligamento
            </span>
            <span className="text-xs font-bold text-slate-600">
              {itensConcluidos} de {totalItens} etapas ({progressoPercent}%)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-300 ${
                progressoPercent === 100 ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${progressoPercent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Checklist Operacional Detalhado */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Checklist de Desligamento & Obrigações</CardTitle>
                  <CardDescription>
                    Marque as etapas operacionais à medida que forem homologadas pelas áreas
                    responsáveis (RH, TI, DP, Financeiro, Jurídico).
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="font-medium">
                  {offboarding.tipo_desligamento}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {offboarding.itens_checklist.map((item, idx) => {
                const getIconeCategoria = (cat: string) => {
                  switch (cat) {
                    case 'patrimonio':
                      return <Laptop className="w-4 h-4 text-amber-600" />
                    case 'seguranca':
                      return <KeyRound className="w-4 h-4 text-purple-600" />
                    case 'dp':
                    case 'juridico':
                      return <ShieldCheck className="w-4 h-4 text-blue-600" />
                    case 'financeiro':
                      return <DollarSign className="w-4 h-4 text-emerald-600" />
                    default:
                      return <FileText className="w-4 h-4 text-slate-600" />
                  }
                }

                return (
                  <div
                    key={item.id || idx}
                    className={`p-4 rounded-lg border transition-all ${
                      item.concluido
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="pt-0.5">
                        <Checkbox
                          checked={item.concluido}
                          disabled={salvandoItem === item.id || offboarding.status === 'Concluído'}
                          onCheckedChange={() => handleAlternarCheck(item)}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="p-1 bg-slate-100 rounded">
                              {getIconeCategoria(item.categoria)}
                            </span>
                            <span
                              className={`text-sm font-semibold ${
                                item.concluido ? 'line-through text-slate-500' : 'text-slate-800'
                              }`}
                            >
                              {item.titulo}
                            </span>
                          </div>

                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {item.responsavel}
                          </Badge>
                        </div>

                        {item.observacao && (
                          <p className="text-xs text-slate-600 pl-7">{item.observacao}</p>
                        )}

                        {item.concluido && item.dataConclusao && (
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 pl-7 pt-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              Concluído em: {new Date(item.dataConclusao).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Anexos e Cofre de Documentos da Rescisão */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Cofre de Documentos do Offboarding
              </CardTitle>
              <CardDescription>
                Termo de rescisão (TRCT), distrato PJ assinado ou recibos de devolução.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {offboarding.termo_rescisao_arquivo ? (
                <div className="flex items-center justify-between p-3 bg-slate-50 border rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span className="font-medium text-slate-800">
                      Termo de Desligamento / Rescisão Anexado
                    </span>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                    Válido no Cofre
                  </Badge>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-2 border-dashed border-slate-200 rounded-lg gap-3 text-center sm:text-left">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      Nenhum termo formal anexado ainda
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Anexe a via digitalizada ou assinada pelo colaborador/prestador.
                    </p>
                  </div>

                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      disabled={uploadingTermo}
                      onChange={handleUploadTermo}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 pointer-events-none"
                      disabled={uploadingTermo}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingTermo ? 'Enviando...' : 'Anexar Documento'}
                    </Button>
                  </label>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna 3: Memória de Cálculo Rescisório (Financeiro) */}
        <div className="space-y-4">
          <Card className="border-t-4 border-t-emerald-600">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Memória de Cálculo Financeiro
                </CardTitle>
                <Badge variant="outline" className="font-semibold text-xs">
                  {offboarding.modalidade}
                </Badge>
              </div>
              <CardDescription>
                Discriminação das verbas rescisórias ou pendências da prestação.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Cálculo CLT */}
              {cltCalc && (
                <div className="space-y-3 text-sm">
                  <div className="bg-slate-50 p-3 rounded-lg space-y-1.5 border">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Salário Base de Cálculo:</span>
                      <strong className="text-slate-800">
                        {formatarMoeda(cltCalc.salarioBase)}
                      </strong>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Tipo de Desligamento:</span>
                      <strong className="text-slate-800">{cltCalc.tipoDesligamento}</strong>
                    </div>
                  </div>

                  {/* Itens Proventos */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">
                        Saldo de Salário ({cltCalc.saldoSalarioDias} dias):
                      </span>
                      <span className="font-medium text-slate-900">
                        {formatarMoeda(cltCalc.saldoSalarioValor)}
                      </span>
                    </div>

                    {cltCalc.avisoPrevioValor > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">
                          Aviso Prévio Indenizado ({cltCalc.avisoPrevioDias} dias):
                        </span>
                        <span className="font-medium text-slate-900">
                          {formatarMoeda(cltCalc.avisoPrevioValor)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">
                        13º Salário Proporcional ({cltCalc.decimoTerceiroProporcionalMeses}/12):
                      </span>
                      <span className="font-medium text-slate-900">
                        {formatarMoeda(cltCalc.decimoTerceiroProporcionalValor)}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">
                        Férias Proporcionais ({cltCalc.feriasProporcionaisMeses}/12):
                      </span>
                      <span className="font-medium text-slate-900">
                        {formatarMoeda(cltCalc.feriasProporcionaisValor)}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">1/3 Constitucional de Férias:</span>
                      <span className="font-medium text-slate-900">
                        {formatarMoeda(cltCalc.tercoConstitucionalFerias)}
                      </span>
                    </div>

                    {cltCalc.multaFgtsValor > 0 && (
                      <div className="flex justify-between text-xs bg-amber-50 p-1.5 rounded">
                        <span className="text-amber-800">
                          Multa Rescisória FGTS ({cltCalc.multaFgtsPercentual}%):
                        </span>
                        <span className="font-semibold text-amber-900">
                          {formatarMoeda(cltCalc.multaFgtsValor)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Descontos se houver */}
                  {cltCalc.totalDescontos > 0 && (
                    <div className="border-t pt-2 space-y-1">
                      <div className="flex justify-between text-xs text-red-600">
                        <span>Desconto Aviso Prévio não cumprido:</span>
                        <span>-{formatarMoeda(cltCalc.avisoPrevioDesconto)}</span>
                      </div>
                    </div>
                  )}

                  <div className="border-t-2 pt-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase font-bold text-slate-500">
                        Líquido Rescisório
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        {cltCalc.saqueFgtsHabilitado
                          ? 'Com saque de FGTS liberado'
                          : 'Sem liberação de chave FGTS'}
                      </p>
                    </div>
                    <span className="text-xl font-bold text-emerald-700">
                      {formatarMoeda(cltCalc.totalLiquidoRescisao)}
                    </span>
                  </div>
                </div>
              )}

              {/* Cálculo PJ */}
              {pjCalc && (
                <div className="space-y-3 text-sm">
                  <div className="bg-slate-50 p-3 rounded-lg space-y-1 border">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Valor Mensal Contratado:</span>
                      <strong className="text-slate-800">
                        {formatarMoeda(pjCalc.valorContratadoMensal)}
                      </strong>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Detalhamento de Pendências PJ:
                    </span>
                    {pjCalc.detalhes?.map((item, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded border border-slate-200 text-xs space-y-1 bg-white"
                      >
                        <div className="flex justify-between">
                          <span className="font-medium text-slate-800">{item.descricao}</span>
                          <span className="font-bold text-slate-900">
                            {formatarMoeda(item.valor)}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          Status: {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="border-t-2 pt-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs uppercase font-bold text-slate-500">
                        Total Geral Pendente
                      </span>
                      <p className="text-[10px] text-muted-foreground">Fechamentos + NFs a pagar</p>
                    </div>
                    <span className="text-xl font-bold text-purple-700">
                      {formatarMoeda(pjCalc.totalGeralDevido)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card de Informações da Homologação */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Status & Auditoria</CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2 text-slate-600">
              <div className="flex justify-between py-1 border-b">
                <span>Criado em:</span>
                <strong>{new Date(offboarding.created).toLocaleDateString('pt-BR')}</strong>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span>Última atualização:</span>
                <strong>{new Date(offboarding.updated).toLocaleDateString('pt-BR')}</strong>
              </div>
              {offboarding.data_conclusao && (
                <div className="flex justify-between py-1 border-b text-emerald-700 font-semibold">
                  <span>Concluído em:</span>
                  <span>{new Date(offboarding.data_conclusao).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
              {offboarding.concluido_por && (
                <div className="flex justify-between py-1">
                  <span>Homologado por:</span>
                  <strong>{offboarding.concluido_por}</strong>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Conclusão Formal do Desligamento */}
      <Dialog open={modalConcluirAberto} onOpenChange={setModalConcluirAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
              Homologar e Concluir Offboarding
            </DialogTitle>
            <DialogDescription>
              Esta ação formaliza o encerramento do contrato/vínculo. A pessoa permanecerá na base
              com histórico vitalício e status "Encerrado".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-1">
              <p className="font-semibold">Efeitos automáticos da conclusão:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-800">
                <li>Vínculo marcado como "Encerrado"</li>
                <li>Benefícios futuros cancelados na data do desligamento</li>
                <li>Bloqueio de novas programações de férias ou descanso PJ</li>
                <li>Baixa do valor comprometido no módulo Financeiro da BU</li>
              </ul>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Responsável pela Homologação
              </label>
              <Input
                type="text"
                className="mt-1"
                value={nomeConclusao}
                onChange={(e) => setNomeConclusao(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Parecer / Observações Finais de Encerramento
              </label>
              <Textarea
                className="mt-1 resize-none"
                rows={3}
                placeholder="Ex.: Todas as pendências sanadas, TRCT assinada e equipamentos recebidos."
                value={obsConclusao}
                onChange={(e) => setObsConclusao(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={concluindoFormal}
              onClick={() => setModalConcluirAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              disabled={concluindoFormal}
              onClick={handleConcluirFormalmente}
            >
              <CheckCircle2 className="w-4 h-4" />
              {concluindoFormal ? 'Homologando...' : 'Confirmar Homologação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  FileText,
  History,
  FileSignature,
  Send,
  Lock,
  UserCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Plus,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  contratosService,
  ContratoUnificado,
  VersaoContrato,
  AssinaturaContrato,
} from '@/services/contratosService'
import { ModalAssinaturaInterna } from './ModalAssinaturaInterna'
import { useAuth } from '@/contexts/AuthContext'

interface ModalDetalhesContratoVersionadoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contrato: ContratoUnificado
  onAtualizar: () => void
}

export const ModalDetalhesContratoVersionado: React.FC<ModalDetalhesContratoVersionadoProps> = ({
  open,
  onOpenChange,
  contrato,
  onAtualizar,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [versoes, setVersoes] = useState<VersaoContrato[]>([])
  const [assinaturas, setAssinaturas] = useState<AssinaturaContrato[]>([])
  const [versaoAtiva, setVersaoAtiva] = useState<VersaoContrato | null>(null)
  const [carregando, setCarregando] = useState(false)

  // Submodais
  const [modalAssinaturaOpen, setModalAssinaturaOpen] = useState(false)
  const [assinaturaSelecionada, setAssinaturaSelecionada] = useState<AssinaturaContrato | null>(
    null,
  )

  // Modo de Nova Versão
  const [modoNovaVersao, setModoNovaVersao] = useState(false)
  const [textoEditado, setTextoEditado] = useState('')
  const [rotuloNovaVersao, setRotuloNovaVersao] = useState('')
  const [motivoRevisao, setMotivoRevisao] = useState('')
  const [novoValorMensal, setNovoValorMensal] = useState<number | undefined>(contrato.valor_mensal)
  const [salvandoVersao, setSalvandoVersao] = useState(false)

  const carregarHistorico = async () => {
    setCarregando(true)
    try {
      const [vList, aList] = await Promise.all([
        contratosService.listarVersoes(contrato.id),
        contratosService.listarAssinaturas(contrato.id),
      ])
      setVersoes(vList)
      setAssinaturas(aList)
      if (vList.length > 0) {
        setVersaoAtiva(vList[0])
        setTextoEditado(vList[0].conteudo_texto)
      }
    } catch {
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar as versões do contrato.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  React.useEffect(() => {
    if (open) {
      carregarHistorico()
      setModoNovaVersao(false)
    }
  }, [open, contrato.id])

  const handleEnviarAssinatura = async () => {
    if (!versaoAtiva) return
    setCarregando(true)
    try {
      const ok = await contratosService.enviarParaAssinatura(contrato.id, versaoAtiva.id)
      if (ok) {
        toast({
          title: 'Enviado para Assinatura!',
          description:
            'O contrato agora está no status "Em assinatura" e os signatários podem firmar seus aceites.',
        })
        await carregarHistorico()
        onAtualizar()
      }
    } catch {
      toast({
        title: 'Erro no envio',
        description: 'Não foi possível alterar o status do contrato para assinatura.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  const handleSalvarNovaVersao = async () => {
    if (!rotuloNovaVersao.trim() || !motivoRevisao.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o rótulo da versão (ex: v2.0 - Reajuste) e o motivo da mudança.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoVersao(true)
    try {
      const nv = await contratosService.criarNovaVersao({
        contratoId: contrato.id,
        conteudoTexto: textoEditado,
        rotuloVersao: rotuloNovaVersao,
        resumoMudancas: motivoRevisao,
        autorNome: user?.name || 'Douglas Severo',
        autorId: user?.id,
        atualizarParametrosContrato: {
          valorMensal: novoValorMensal,
        },
      })

      if (nv) {
        toast({
          title: 'Nova Versão Criada!',
          description: `Versão ${nv.rotulo_versao} registrada com sucesso na trilha de auditoria.`,
        })
        setModoNovaVersao(false)
        await carregarHistorico()
        onAtualizar()
      }
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Falha ao gravar nova versão.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoVersao(false)
    }
  }

  const assinaturasDestaVersao = versaoAtiva
    ? assinaturas.filter((a) => a.versao === versaoAtiva.id)
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <FileSignature className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold font-display text-[#212B55] dark:text-[#F7F8FB] flex items-center gap-2">
                  {contrato.titulo}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Código: <span className="font-mono font-bold">{contrato.codigo_contrato}</span> ·
                  Modalidade: {contrato.modalidade} · Versão Atual: v{contrato.versao_atual || 1}.0
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                className={`text-xs font-semibold ${
                  contrato.status === 'Vigente'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                    : contrato.status === 'Vencendo'
                      ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                      : contrato.status === 'Em assinatura'
                        ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-700'
                }`}
              >
                {contrato.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {carregando ? (
          <div className="py-12 text-center text-xs text-muted-foreground font-sans">
            Carregando histórico e versões auditadas...
          </div>
        ) : (
          <div className="space-y-4 py-1 text-xs font-sans">
            {/* Seletor de Versões em Pills */}
            <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-foreground flex items-center gap-1 mr-1">
                  <History className="w-3.5 h-3.5 text-muted-foreground" />
                  Versões:
                </span>
                {versoes.map((v) => {
                  const isActive = versaoAtiva?.id === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setVersaoAtiva(v)
                        setTextoEditado(v.conteudo_texto)
                        setModoNovaVersao(false)
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        isActive
                          ? 'bg-[#212B55] text-white border-[#212B55] shadow-xs'
                          : 'bg-card text-muted-foreground border-border hover:text-foreground'
                      }`}
                    >
                      {v.rotulo_versao}
                      <span className="ml-1 text-[10px] opacity-75 font-mono">
                        ({v.status_versao})
                      </span>
                    </button>
                  )
                })}
              </div>

              {!modoNovaVersao && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setModoNovaVersao(true)
                    const prox = (versoes[0]?.numero_versao || 1) + 1
                    setRotuloNovaVersao(`v${prox}.0 — Revisão Contratual`)
                    setMotivoRevisao('')
                  }}
                  className="h-7 text-xs border-[#E9530E]/30 text-[#E9530E] hover:bg-[#FEF1EA] font-semibold gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Criar Nova Versão (v{(versoes[0]?.numero_versao || 1) + 1}.0)
                </Button>
              )}
            </div>

            {/* Painel do Modo de Criação de Nova Versão */}
            {modoNovaVersao ? (
              <div className="p-4 bg-muted/40 rounded-xl border border-[#E9530E]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-[#212B55] dark:text-[#F7F8FB] font-display flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#E9530E]" />
                    Criando Nova Versão do Contrato
                  </h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setModoNovaVersao(false)}
                    className="h-6 text-xs text-muted-foreground"
                  >
                    Cancelar
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Rótulo da Nova Versão</Label>
                    <Input
                      value={rotuloNovaVersao}
                      onChange={(e) => setRotuloNovaVersao(e.target.value)}
                      className="h-8 text-xs font-medium"
                      placeholder="Ex: v2.0 — Reajuste Anual e Escopo"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">
                      Novo Valor Mensal (Opcional)
                    </Label>
                    <Input
                      type="number"
                      value={novoValorMensal || ''}
                      onChange={(e) => setNovoValorMensal(Number(e.target.value))}
                      className="h-8 text-xs font-mono"
                      placeholder="R$"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px] font-semibold">
                      Motivo da Alteração / Justificativa
                    </Label>
                    <Input
                      value={motivoRevisao}
                      onChange={(e) => setMotivoRevisao(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="Descreva o que motivou a nova versão (ex: renovação por 12 meses, aumento de honorários)"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px] font-semibold">Texto Integral da Minuta</Label>
                    <Textarea
                      value={textoEditado}
                      onChange={(e) => setTextoEditado(e.target.value)}
                      rows={12}
                      className="text-xs font-mono resize-y"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setModoNovaVersao(false)}
                    disabled={salvandoVersao}
                    className="text-xs"
                  >
                    Voltar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSalvarNovaVersao}
                    disabled={salvandoVersao}
                    className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-semibold gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {salvandoVersao ? 'Gravando Versão...' : 'Salvar Nova Versão Imutável'}
                  </Button>
                </div>
              </div>
            ) : (
              /* Visualização da Versão Selecionada */
              versaoAtiva && (
                <div className="space-y-4">
                  {/* Cabeçalho de Metadados da Versão */}
                  <div className="p-3.5 bg-card rounded-xl border border-border space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm font-display text-[#212B55] dark:text-[#F7F8FB]">
                          {versaoAtiva.rotulo_versao}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {versaoAtiva.status_versao}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        {versaoAtiva.status_versao === 'Minuta' && (
                          <Button
                            size="sm"
                            onClick={handleEnviarAssinatura}
                            className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1"
                          >
                            <Send className="w-3 h-3" />
                            Enviar para Assinatura
                          </Button>
                        )}
                        {(versaoAtiva.status_versao === 'Aguardando Assinaturas' ||
                          versaoAtiva.status_versao === 'Minuta') && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setAssinaturaSelecionada(null)
                              setModalAssinaturaOpen(true)
                            }}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
                          >
                            <FileSignature className="w-3 h-3" />
                            Assinar Agora
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Resumo das mudanças:
                      </span>{' '}
                      {versaoAtiva.resumo_mudancas || 'Sem alterações registradas.'}
                    </p>

                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-mono flex-wrap">
                      <span>Autor: {versaoAtiva.criado_por_nome || 'RH / SouYess'}</span>
                      <span>
                        Criada em: {new Date(versaoAtiva.created).toLocaleString('pt-BR')}
                      </span>
                      {versaoAtiva.hash_conteudo && (
                        <span className="truncate max-w-xs">
                          SHA-256: {versaoAtiva.hash_conteudo.substring(0, 20)}...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Trilha de Assinaturas Desta Versão */}
                  <div className="p-3.5 bg-card rounded-xl border border-border space-y-2">
                    <h4 className="font-bold text-xs text-[#212B55] dark:text-[#F7F8FB] font-display flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Trilha de Assinaturas e Auditoria Interna ({assinaturasDestaVersao.length})
                    </h4>

                    {assinaturasDestaVersao.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">
                        Nenhum signatário vinculado a esta versão ainda.
                      </p>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {assinaturasDestaVersao.map((ass) => {
                          const isAssinado = ass.status_assinatura === 'Assinado'
                          return (
                            <div
                              key={ass.id}
                              className="py-2 flex items-center justify-between flex-wrap gap-2 text-[11px]"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-[#212B55] dark:text-[#F7F8FB]">
                                    {ass.nome_signatario}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1 py-0 font-medium"
                                  >
                                    {ass.papel_signatario}
                                  </Badge>
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  {ass.email_signatario} ·{' '}
                                  {ass.documento_identificacao || 'Doc não informado'}
                                </div>
                                {isAssinado && ass.manifestacao_aceite && (
                                  <p className="text-[10px] text-muted-foreground italic max-w-xl">
                                    "{ass.manifestacao_aceite}"
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-right">
                                {isAssinado ? (
                                  <div>
                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                                      Assinado
                                    </Badge>
                                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                      {ass.data_assinatura
                                        ? new Date(ass.data_assinatura).toLocaleString('pt-BR')
                                        : '—'}
                                    </div>
                                    {ass.ip_assinatura && (
                                      <div className="text-[9px] text-muted-foreground font-mono">
                                        IP: {ass.ip_assinatura}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <Badge
                                      variant="outline"
                                      className="text-amber-700 border-amber-300 bg-amber-50 text-[10px]"
                                    >
                                      Pendente
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setAssinaturaSelecionada(ass)
                                        setModalAssinaturaOpen(true)
                                      }}
                                      className="h-6 text-[10px] font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                    >
                                      Registrar Aceite
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Conteúdo do Contrato (Visualizador de Texto) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Texto Integral do Contrato</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Imutável após assinatura
                      </span>
                    </Label>
                    <div className="p-4 bg-muted/20 border border-border rounded-xl font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto text-slate-800 dark:text-slate-200">
                      {versaoAtiva.conteudo_texto}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Submodal de Assinatura */}
      {versaoAtiva && (
        <ModalAssinaturaInterna
          open={modalAssinaturaOpen}
          onOpenChange={setModalAssinaturaOpen}
          contrato={contrato}
          versao={versaoAtiva}
          assinaturaPendente={assinaturaSelecionada}
          onSuccess={async () => {
            await carregarHistorico()
            onAtualizar()
          }}
        />
      )}
    </Dialog>
  )
}
export default ModalDetalhesContratoVersionado

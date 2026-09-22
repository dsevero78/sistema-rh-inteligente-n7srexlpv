import React, { useState, useEffect } from 'react'
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
  Sparkles,
  Plus,
  Scale,
  Calendar,
  Building2,
  DollarSign,
  CheckCircle2,
  Layers,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  contratosService,
  type CriarContratoInput,
  type ModalidadeContrato,
} from '@/services/contratosService'
import { modelosContratoService } from '@/services/modelosContratoService'
import { type TemplateContrato } from '@/services/templatesContrato'
import { type PessoaUnificada } from '@/services/pessoasService'
import { empresasService, type Empresa, type Area } from '@/services/empresasService'
import { useAuth } from '@/contexts/AuthContext'

interface ModalNovoContratoTemplateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pessoa: PessoaUnificada
  onSuccess: () => void
  onAbrirGerenciadorModelos?: () => void
}

export const ModalNovoContratoTemplate: React.FC<ModalNovoContratoTemplateProps> = ({
  open,
  onOpenChange,
  pessoa,
  onSuccess,
  onAbrirGerenciadorModelos,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [templates, setTemplates] = useState<TemplateContrato[]>(() => {
    return contratosService.getTemplates()
  })
  const [carregandoTemplates, setCarregandoTemplates] = useState(false)

  // Filtra templates compatíveis com a modalidade da pessoa por padrão
  const [modalidade, setModalidade] = useState<ModalidadeContrato>(
    pessoa.modalidade === 'CLT' ? 'CLT' : 'PJ',
  )

  const templatesFiltrados = templates.filter(
    (t) => t && t.modalidade === modalidade && t.ativo !== false,
  )

  const [templateSelecionadoId, setTemplateSelecionadoId] = useState<string>('')

  const templateAtual =
    templates.find((t) => t && t.id === templateSelecionadoId) ||
    templatesFiltrados[0] ||
    templates[0] ||
    null

  useEffect(() => {
    if (open) {
      const carregar = async () => {
        setCarregandoTemplates(true)
        try {
          const lista = await modelosContratoService.listarTodos(true)
          const modelosValidos = lista && lista.length > 0 ? lista : contratosService.getTemplates()
          setTemplates(modelosValidos)
          const comp = modelosValidos.filter(
            (t) => t && t.modalidade === (pessoa.modalidade === 'CLT' ? 'CLT' : 'PJ'),
          )
          const escolhido = comp[0] || modelosValidos[0]
          if (escolhido) {
            setTemplateSelecionadoId(escolhido.id)
            setTitulo(
              (prev) =>
                prev ||
                escolhido.titulo ||
                `Contrato de ${pessoa.modalidade === 'CLT' ? 'Trabalho' : 'Prestação de Serviços'} — ${pessoa.nome || ''}`,
            )
            setPrazoTipo(
              (prev) => prev || pessoa.prazo_tipo || escolhido.prazoTipoSugerido || 'Determinado',
            )
          } else {
            setTemplateSelecionadoId('')
          }
        } catch {
          const fallback = contratosService.getTemplates()
          setTemplates(fallback)
          const comp = fallback.filter(
            (t) => t && t.modalidade === (pessoa.modalidade === 'CLT' ? 'CLT' : 'PJ'),
          )
          const escolhido = comp[0] || fallback[0]
          if (escolhido) {
            setTemplateSelecionadoId(escolhido.id)
            setTitulo(
              (prev) =>
                prev ||
                escolhido.titulo ||
                `Contrato de ${pessoa.modalidade === 'CLT' ? 'Trabalho' : 'Prestação de Serviços'} — ${pessoa.nome || ''}`,
            )
            setPrazoTipo(
              (prev) => prev || pessoa.prazo_tipo || escolhido.prazoTipoSugerido || 'Determinado',
            )
          } else {
            setTemplateSelecionadoId('')
          }
        } finally {
          setCarregandoTemplates(false)
        }
      }
      carregar()
    }
  }, [open, pessoa.id, pessoa.modalidade, pessoa.prazo_tipo, pessoa.nome])

  const [titulo, setTitulo] = useState(
    templateAtual?.titulo ||
      `Contrato de ${pessoa.modalidade === 'CLT' ? 'Trabalho' : 'Prestação de Serviços'} — ${pessoa.nome || ''}`,
  )
  const [dataInicio, setDataInicio] = useState(
    pessoa.data_inicio ? pessoa.data_inicio.split('T')[0] : new Date().toISOString().split('T')[0],
  )
  const [dataFim, setDataFim] = useState(pessoa.data_fim ? pessoa.data_fim.split('T')[0] : '')
  const [valorMensal, setValorMensal] = useState<number>(pessoa.valor_contratado || 0)
  const [horasBase, setHorasBase] = useState<number>(pessoa.horas_mensais_base || 160)
  const [prazoTipo, setPrazoTipo] = useState<string>(
    pessoa.prazo_tipo || templateAtual?.prazoTipoSugerido || 'Determinado',
  )
  const [clausulasEspeciais, setClausulasEspeciais] = useState(pessoa.observacoes || '')
  const [resumoMudancas, setResumoMudancas] = useState(
    'Emissão inicial v1.0 gerada via SouYess People Hub.',
  )
  const [carregando, setCarregando] = useState(false)

  // Seleção de Empresa e Área para o contrato gerado
  const [empresasCadastradas, setEmpresasCadastradas] = useState<Empresa[]>([])
  const [areasCadastradas, setAreasCadastradas] = useState<Area[]>([])
  const [empresaContratoId, setEmpresaContratoId] = useState<string>(pessoa.empresa || '')
  const [areaContratoId, setAreaContratoId] = useState<string>(pessoa.area || '')

  useEffect(() => {
    if (open) {
      empresasService.listarEmpresas().then((list) => {
        setEmpresasCadastradas(list)
        if (!empresaContratoId && pessoa.empresa) {
          setEmpresaContratoId(pessoa.empresa)
        } else if (!empresaContratoId && list.length > 0) {
          setEmpresaContratoId(list[0].id)
        }
      })
      empresasService.listarAreas().then(setAreasCadastradas)
    }
  }, [open, pessoa.empresa])

  // Ao mudar de modalidade, atualiza o template padrão
  const handleTrocaModalidade = (novaMod: ModalidadeContrato) => {
    setModalidade(novaMod)
    const novos = templates.filter((t) => t && t.modalidade === novaMod && t.ativo !== false)
    if (novos.length > 0) {
      setTemplateSelecionadoId(novos[0].id)
      setTitulo(
        novos[0].titulo ||
          `Contrato de ${novaMod === 'CLT' ? 'Trabalho' : 'Prestação de Serviços'} — ${pessoa.nome || ''}`,
      )
      setPrazoTipo(novos[0].prazoTipoSugerido || 'Determinado')
    } else {
      setTemplateSelecionadoId('')
    }
  }

  const handleTrocaTemplate = (tempId: string) => {
    setTemplateSelecionadoId(tempId)
    const t = templates.find((item) => item && item.id === tempId)
    if (t?.titulo) {
      setTitulo(t.titulo)
      setPrazoTipo(t.prazoTipoSugerido || 'Determinado')
    }
  }

  const handleGerarContrato = async () => {
    if (!templateAtual || !templateAtual.id) {
      toast({
        title: 'Modelo não selecionado',
        description:
          'Selecione um modelo contratual ativo para prosseguir com a emissão da minuta.',
        variant: 'destructive',
      })
      return
    }

    if (!titulo.trim() || !dataInicio) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o título do contrato e a data de início da vigência.',
        variant: 'destructive',
      })
      return
    }
    setCarregando(true)
    try {
      const res = await contratosService.criarContratoDoTemplate({
        pessoaId: pessoa.id,
        prestadorPjId: pessoa.prestador_origem,
        templateId: templateSelecionadoId,
        titulo,
        modalidade,
        dataInicio: new Date(dataInicio).toISOString(),
        dataFim: dataFim ? new Date(dataFim).toISOString() : undefined,
        valorMensal: Number(valorMensal) || 0,
        horasMensaisBase: Number(horasBase) || 160,
        prazoTipo,
        empresaId: empresaContratoId || pessoa.empresa || undefined,
        areaId: areaContratoId || pessoa.area || undefined,
        departamento: pessoa.departamento,
        centroCusto: pessoa.centro_custo,
        cargoFuncao: pessoa.cargo_funcao,
        gestorNome: pessoa.gestor_nome || user?.name || 'Douglas Severo',
        gestorResponsavelId: pessoa.gestor_responsavel || user?.id,
        clausulasEspeciais,
        resumoMudancas,
        autorNome: user?.name || 'RH / People',
        autorId: user?.id,
      })

      if (res) {
        toast({
          title: 'Contrato Gerado com Sucesso!',
          description: `Versão inicial v1.0 criada com código ${res.contrato.codigo_contrato}.`,
        })
        onSuccess()
        onOpenChange(false)
      } else {
        throw new Error('Falha ao gerar contrato')
      }
    } catch {
      toast({
        title: 'Erro na geração',
        description: 'Não foi possível gerar o contrato a partir do modelo selecionado.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E9530E]/10 text-[#E9530E] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <DialogTitle className="text-lg font-bold font-display text-[#212B55] dark:text-[#F7F8FB]">
                  Gerar Contrato a partir de Modelo
                </DialogTitle>
                {onAbrirGerenciadorModelos && (
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={onAbrirGerenciadorModelos}
                    className="h-7 text-xs border-[#E9530E]/30 text-[#E9530E] hover:bg-[#FEF1EA] gap-1 font-semibold"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Gerenciar Biblioteca
                  </Button>
                )}
              </div>
              <DialogDescription className="text-xs">
                Selecione qual modelo melhor se adequa para {pessoa.nome} ({modalidade}) ou adicione
                novos modelos à sua biblioteca.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs font-sans">
          {/* Seletor de Modalidade PJ / CLT */}
          <div className="flex items-center gap-2 p-1 bg-muted/60 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => handleTrocaModalidade('PJ')}
              className={`px-3 py-1.5 rounded-md font-bold text-xs transition-colors ${
                modalidade === 'PJ'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Modelos PJ (Prestação de Serviços)
            </button>
            <button
              type="button"
              onClick={() => handleTrocaModalidade('CLT')}
              className={`px-3 py-1.5 rounded-md font-bold text-xs transition-colors ${
                modalidade === 'CLT'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Modelos CLT (Experiência & Trabalho)
            </button>
          </div>

          {/* Cards de Modelos Disponíveis */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold text-foreground">
                  Selecione o Modelo Contratual ({templatesFiltrados.length} disponível(is))
                </Label>
                {(!templateAtual || templatesFiltrados.length === 0) && (
                  <Badge
                    variant="outline"
                    className="text-[10px] text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40"
                  >
                    Modelo não encontrado
                  </Badge>
                )}
              </div>
              {onAbrirGerenciadorModelos && (
                <button
                  type="button"
                  onClick={onAbrirGerenciadorModelos}
                  className="text-[11px] text-[#E9530E] hover:underline font-semibold"
                >
                  + Inserir novo modelo próprio
                </button>
              )}
            </div>

            {carregandoTemplates ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Carregando modelos disponíveis...
              </div>
            ) : templatesFiltrados.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/40 dark:bg-amber-950/20 text-center text-xs text-amber-800 dark:text-amber-200 space-y-2">
                <p className="font-medium">
                  Nenhum modelo ativo encontrado para a modalidade {modalidade}.
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Abra a biblioteca de modelos para ativar ou cadastrar minutas contratuais.
                </p>
                {onAbrirGerenciadorModelos && (
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={onAbrirGerenciadorModelos}
                    className="h-7 text-xs border-amber-400"
                  >
                    Abrir gerenciador de modelos
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {templatesFiltrados.map((temp) => {
                  const isSelected = temp?.id === (templateSelecionadoId || templateAtual?.id)
                  return (
                    <div
                      key={temp?.id || Math.random().toString()}
                      onClick={() => temp?.id && handleTrocaTemplate(temp.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#E9530E] bg-[#FEF1EA]/60 dark:bg-[#212B55] ring-1 ring-[#E9530E]'
                          : 'border-border/80 bg-card hover:border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-[#212B55] dark:text-[#F7F8FB] line-clamp-1">
                          {temp?.titulo || 'Modelo de Minuta'}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#E9530E] shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {temp?.descricaoBreve || 'Modelo pronto para geração.'}
                      </p>
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {temp?.ehPadraoSistema ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 font-mono text-muted-foreground"
                          >
                            Sistema
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] px-1 py-0">
                            Próprio
                          </Badge>
                        )}
                        {(temp?.tagsJuridicas || []).slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 font-medium"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Dados do Contrato e Parâmetros */}
          <div className="space-y-3 p-3.5 bg-card rounded-xl border border-border">
            <h4 className="font-bold font-display text-xs text-[#212B55] dark:text-[#F7F8FB] flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-indigo-600" />
              Parâmetros e Cláusulas Contratuais
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[11px] font-semibold">Título Formal do Contrato</Label>
                <Input
                  value={titulo || ''}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Contrato de Prestação de Serviços..."
                  className="h-8 text-xs font-medium"
                />
              </div>

              {/* Empresa Contratante (Holding / BU) */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">
                  Empresa Contratante (Holding ou BU)
                </Label>
                <select
                  value={empresaContratoId}
                  onChange={(e) => {
                    setEmpresaContratoId(e.target.value)
                    setAreaContratoId('')
                  }}
                  className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-medium"
                >
                  <option value="">Selecione a empresa...</option>
                  {empresasCadastradas.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.sigla ? `[${emp.sigla}] ` : ''}
                      {emp.nome_fantasia} ({emp.tipo === 'Holding / Matriz' ? 'Holding' : 'BU'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Área / Unidade da Empresa */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Área / Unidade da Empresa</Label>
                <select
                  value={areaContratoId}
                  onChange={(e) => setAreaContratoId(e.target.value)}
                  disabled={!empresaContratoId}
                  className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-medium disabled:opacity-50"
                >
                  <option value="">
                    {empresaContratoId ? 'Selecione a área...' : 'Escolha a empresa primeiro'}
                  </option>
                  {areasCadastradas
                    .filter((a) => a.empresa === empresaContratoId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Início da Vigência</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Término Previsto (Opcional)</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Valor Mensal (R$)</Label>
                <Input
                  type="number"
                  value={valorMensal}
                  onChange={(e) => setValorMensal(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Carga Horária Base (Horas/Mês)</Label>
                <Input
                  type="number"
                  value={horasBase}
                  onChange={(e) => setHorasBase(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Tipo de Prazo</Label>
                <select
                  value={prazoTipo || 'Determinado'}
                  onChange={(e) => setPrazoTipo(e.target.value)}
                  className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                >
                  <option value="Determinado">Determinado</option>
                  <option value="Indeterminado">Indeterminado</option>
                  <option value="Experiencia 45+45">Experiência 45+45 (CLT)</option>
                  <option value="Projeto Especifico">Projeto Específico</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Cargo / Função</Label>
                <Input value={pessoa.cargo_funcao} disabled className="h-8 text-xs bg-muted/40" />
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <Label className="text-[11px] font-semibold">Cláusulas Especiais e SLA</Label>
              <Textarea
                value={clausulasEspeciais}
                onChange={(e) => setClausulasEspeciais(e.target.value)}
                placeholder="Insira cláusulas específicas de SLA, entregas ou regimes híbridos..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={carregando}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleGerarContrato}
            disabled={carregando || !templateAtual || !templateAtual.id}
            title={!templateAtual ? 'Selecione um modelo válido para gerar a minuta' : undefined}
            className="bg-[#E9530E] hover:bg-[#C5430A] text-white font-semibold text-xs gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {carregando ? 'Gerando Minuta v1.0...' : 'Gerar Minuta do Contrato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default ModalNovoContratoTemplate

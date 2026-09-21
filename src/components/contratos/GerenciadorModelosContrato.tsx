import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText,
  Plus,
  Copy,
  Edit3,
  CheckCircle2,
  Trash2,
  Power,
  Eye,
  Sparkles,
  Search,
  Building2,
  User,
  Info,
  Layers,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  modelosContratoService,
  CriarModeloContratoInput,
  AtualizarModeloContratoInput,
} from '@/services/modelosContratoService'
import { TemplateContrato, PLACEHOLDERS_SUPORTADOS } from '@/services/templatesContrato'
import { preencherTemplate } from '@/services/contratosService'
import { PessoaUnificada, pessoasService } from '@/services/pessoasService'
import { useAuth } from '@/contexts/AuthContext'

interface GerenciadorModelosContratoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAtualizar?: () => void
}

export const GerenciadorModelosContrato: React.FC<GerenciadorModelosContratoProps> = ({
  open,
  onOpenChange,
  onAtualizar,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [modelos, setModelos] = useState<TemplateContrato[]>([])
  const [pessoas, setPessoas] = useState<PessoaUnificada[]>([])
  const [carregando, setCarregando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroModalidade, setFiltroModalidade] = useState<'TODAS' | 'PJ' | 'CLT'>('TODAS')

  // Estado do Editor
  const [modoEditor, setModoEditor] = useState<boolean>(false)
  const [modeloEmEdicao, setModeloEmEdicao] = useState<TemplateContrato | null>(null)
  const [isNovo, setIsNovo] = useState<boolean>(false)

  // Formulário do Modelo
  const [formNome, setFormNome] = useState('')
  const [formModalidade, setFormModalidade] = useState<'PJ' | 'CLT'>('PJ')
  const [formTipoModelo, setFormTipoModelo] =
    useState<TemplateContrato['tipoModelo']>('PJ_PRESTACAO_SERVICOS')
  const [formDescricao, setFormDescricao] = useState('')
  const [formCorpoTexto, setFormCorpoTexto] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formDiasAlerta, setFormDiasAlerta] = useState<number>(60)
  const [formPrazoTipo, setFormPrazoTipo] = useState<
    'Indeterminado' | 'Determinado' | 'Experiencia 45+45' | 'Projeto Especifico'
  >('Determinado')
  const [formAtivo, setFormAtivo] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Preview com Interpolação Real
  const [abaEditor, setAbaEditor] = useState<'editor' | 'preview'>('editor')
  const [pessoaPreviewId, setPessoaPreviewId] = useState<string>('')
  const [filtroCategoriaPlaceholder, setFiltroCategoriaPlaceholder] = useState<string>('TODAS')

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const [mods, pss] = await Promise.all([
        modelosContratoService.listarTodos(false),
        pessoasService.listar(),
      ])
      setModelos(mods)
      setPessoas(pss)
      if (pss.length > 0 && !pessoaPreviewId) {
        setPessoaPreviewId(pss[0].id)
      }
    } catch {
      toast({
        title: 'Erro ao carregar modelos',
        description: 'Não foi possível carregar os modelos de contrato.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (open) {
      carregarDados()
      setModoEditor(false)
      setModeloEmEdicao(null)
    }
  }, [open])

  // Filtragem dos modelos na listagem
  const modelosFiltrados = useMemo(() => {
    return modelos.filter((m) => {
      if (filtroModalidade !== 'TODAS' && m.modalidade !== filtroModalidade) return false
      if (busca.trim()) {
        const b = busca.toLowerCase()
        const matchNome = m.titulo.toLowerCase().includes(b)
        const matchDesc = m.descricaoBreve.toLowerCase().includes(b)
        const matchTags = m.tagsJuridicas.some((t) => t.toLowerCase().includes(b))
        if (!matchNome && !matchDesc && !matchTags) return false
      }
      return true
    })
  }, [modelos, filtroModalidade, busca])

  // Placeholders filtrados por categoria
  const placeholdersFiltrados = useMemo(() => {
    if (filtroCategoriaPlaceholder === 'TODAS') return PLACEHOLDERS_SUPORTADOS
    return PLACEHOLDERS_SUPORTADOS.filter((p) => p.categoria === filtroCategoriaPlaceholder)
  }, [filtroCategoriaPlaceholder])

  // Pessoa selecionada para o preview interativo
  const pessoaSelecionadaPreview = useMemo(() => {
    return pessoas.find((p) => p.id === pessoaPreviewId) || pessoas[0]
  }, [pessoas, pessoaPreviewId])

  // Conteúdo interpolado em tempo real no preview
  const textoInterpoladoPreview = useMemo(() => {
    if (!formCorpoTexto) return 'Nenhum conteúdo digitado para pré-visualização.'
    const p = pessoaSelecionadaPreview
    return preencherTemplate(formCorpoTexto, {
      codigoContrato: formModalidade === 'PJ' ? 'CT-PJ-PREVIEW-2026' : 'CT-CLT-PREVIEW-2026',
      pessoaNome: p?.nome || 'Juliana Mendes Castro',
      pessoaDocumento: p?.cpf_cnpj || '412.890.318-72',
      pessoaEmail: p?.email || 'juliana.mendes@exemplo.com',
      pessoaTelefone: p?.telefone || '(11) 98765-4321',
      prestadorRazaoSocial: p?.modalidade === 'PJ' ? p.nome : 'Empresa Prestadora de Serviços Ltda',
      prestadorCnpj: p?.modalidade === 'PJ' ? p.cpf_cnpj : '34.819.204/0001-95',
      prestadorEndereco: 'Avenida Paulista, 1000, Bela Vista, São Paulo/SP',
      cargoFuncao: p?.cargo_funcao || 'Especialista em Gente & Gestão',
      departamento: p?.departamento || 'Gente & Gestão',
      centroCusto: p?.centro_custo || 'CC-PEOPLE-01',
      gestorNome: p?.gestor_nome || user?.name || 'Douglas Severo',
      dataInicio: p?.data_inicio ? p.data_inicio.split('T')[0] : '2026-10-06',
      dataFim: p?.data_fim ? p.data_fim.split('T')[0] : '2027-01-04',
      prazoTipo: formPrazoTipo,
      diasAlerta: formDiasAlerta,
      valorMensal: p?.valor_contratado || 14000,
      valorHora: p?.valor_hora || 87.5,
      horasBase: p?.horas_mensais_base || 160,
      clausulasEspeciais:
        p?.observacoes ||
        'Condições gerais de trabalho híbrido, equipamentos corporativos e sigilo.',
    })
  }, [
    formCorpoTexto,
    pessoaSelecionadaPreview,
    formModalidade,
    formPrazoTipo,
    formDiasAlerta,
    user?.name,
  ])

  // Iniciar criação de novo modelo
  const handleNovoModelo = () => {
    setIsNovo(true)
    setModeloEmEdicao(null)
    setFormNome('')
    setFormModalidade('PJ')
    setFormTipoModelo('PJ_PRESTACAO_SERVICOS')
    setFormDescricao('')
    setFormTags('Contrato, Personalizado')
    setFormDiasAlerta(60)
    setFormPrazoTipo('Determinado')
    setFormAtivo(true)
    setFormCorpoTexto(`INSTRUMENTO PARTICULAR DE CONTRATO
CONTRATO NÚMERO: {{CODIGO_CONTRATO}}

Pelo presente instrumento, de um lado SOUYESS TECNOLOGIA E SERVIÇOS S/A (CONTRATANTE), representada por {{GESTOR_NOME}};
E de outro lado {{PESSOA_NOME}} ({{PESSOA_DOCUMENTO}}), com e-mail {{PESSOA_EMAIL}}:

CLÁUSULA 1 — DO OBJETO
Prestação de serviços para {{CARGO_FUNCAO}} na área de {{DEPARTAMENTO}}, centro de custo {{CENTRO_CUSTO}}.

CLÁUSULA 2 — VIGÊNCIA E REMUNERAÇÃO
Vigência a partir de {{DATA_INICIO}} sob regime {{PRAZO_TIPO}}.
Remuneração mensal de R$ {{VALOR_MENSAL}} (R$ {{VALOR_HORA}}/h na base de {{HORAS_BASE}} horas mensais).

CLÁUSULA 3 — CONDIÇÕES ESPECIAIS
{{CLAUSULAS_ESPECIAIS}}

São Paulo/SP, {{DATA_EXTENSO}}.`)
    setAbaEditor('editor')
    setModoEditor(true)
  }

  // Abrir modelo existente para edição
  const handleEditarModelo = (mod: TemplateContrato) => {
    setIsNovo(false)
    setModeloEmEdicao(mod)
    setFormNome(mod.titulo)
    setFormModalidade(mod.modalidade)
    setFormTipoModelo(mod.tipoModelo)
    setFormDescricao(mod.descricaoBreve)
    setFormTags(mod.tagsJuridicas.join(', '))
    setFormDiasAlerta(mod.diasAlertaPadrao)
    setFormPrazoTipo(mod.prazoTipoSugerido)
    setFormAtivo(mod.ativo !== false)
    setFormCorpoTexto(mod.conteudoPadrao)
    setAbaEditor('editor')
    setModoEditor(true)
  }

  // Duplicar modelo
  const handleDuplicar = async (mod: TemplateContrato) => {
    try {
      setCarregando(true)
      const novo = await modelosContratoService.duplicarModelo(
        mod.id,
        user?.name || 'Douglas Severo',
        user?.id,
      )
      if (novo) {
        toast({
          title: 'Modelo Duplicado!',
          description: `Novo modelo "${novo.titulo}" gerado com sucesso. Você pode editá-lo agora.`,
        })
        await carregarDados()
        onAtualizar?.()
      }
    } catch {
      toast({
        title: 'Erro ao duplicar modelo',
        description: 'Não foi possível duplicar o modelo selecionado.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  // Alternar ativo/inativo
  const handleAlternarAtivo = async (mod: TemplateContrato) => {
    try {
      const ok = await modelosContratoService.alternarStatusAtivo(mod.id, mod.ativo !== false)
      if (ok) {
        toast({
          title: mod.ativo ? 'Modelo Desativado' : 'Modelo Ativado!',
          description: `O modelo ${mod.titulo} agora está ${mod.ativo ? 'inativo' : 'ativo'}.`,
        })
        await carregarDados()
        onAtualizar?.()
      }
    } catch {
      toast({
        title: 'Erro ao alterar status',
        description: 'Não foi possível alterar a situação do modelo.',
        variant: 'destructive',
      })
    }
  }

  // Salvar modelo (criação ou atualização)
  const handleSalvarModelo = async () => {
    if (!formNome.trim() || !formCorpoTexto.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o nome do modelo e o corpo do texto com os placeholders.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const tagsArray = formTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      if (isNovo || !modeloEmEdicao) {
        const criado = await modelosContratoService.criarModelo({
          nome: formNome.trim(),
          modalidade: formModalidade,
          tipo_modelo: formTipoModelo,
          descricao: formDescricao.trim(),
          corpo_texto: formCorpoTexto,
          tags: tagsArray,
          dias_alerta_padrao: Number(formDiasAlerta) || (formModalidade === 'PJ' ? 60 : 15),
          prazo_tipo_sugerido: formPrazoTipo,
          ativo: formAtivo,
          criado_por_nome: user?.name || 'Douglas Severo',
          criado_por_usuario: user?.id,
        })
        if (criado) {
          toast({
            title: 'Modelo Criado!',
            description: `Modelo "${criado.titulo}" salvo na biblioteca e disponível para gerar novos contratos.`,
          })
        }
      } else {
        const atualizado = await modelosContratoService.atualizarModelo(modeloEmEdicao.id, {
          nome: formNome.trim(),
          modalidade: formModalidade,
          tipo_modelo: formTipoModelo,
          descricao: formDescricao.trim(),
          corpo_texto: formCorpoTexto,
          tags: tagsArray,
          dias_alerta_padrao: Number(formDiasAlerta),
          prazo_tipo_sugerido: formPrazoTipo,
          ativo: formAtivo,
        })
        if (atualizado) {
          toast({
            title: 'Modelo Atualizado!',
            description: `Alterações salvas com sucesso no modelo "${atualizado.titulo}".`,
          })
        }
      }

      setModoEditor(false)
      await carregarDados()
      onAtualizar?.()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar modelo',
        description: err?.message || 'Falha ao persistir modelo no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Inserir placeholder no texto
  const inserirPlaceholder = (token: string) => {
    setFormCorpoTexto((prev) => prev + ' ' + token)
    navigator.clipboard?.writeText(token)
    toast({
      title: 'Token copiado!',
      description: `${token} copiado e inserido no final do texto.`,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0">
        {/* Cabeçalho */}
        <DialogHeader className="p-5 border-b border-border/70 shrink-0 bg-card">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#E9530E]/10 text-[#E9530E] flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold font-display text-[#212B55] dark:text-[#F7F8FB] flex items-center gap-2">
                  Biblioteca de Modelos de Contrato
                  <Badge className="bg-[#E9530E]/15 text-[#E9530E] border-[#E9530E]/30 text-[10px] font-mono">
                    Flexibilidade Total
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Crie, personalize e gerencie modelos jurídicos próprios para contratações PJ e CLT
                  com placeholders interpoláveis.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!modoEditor ? (
                <Button
                  size="sm"
                  onClick={handleNovoModelo}
                  className="h-8 text-xs bg-[#E9530E] hover:bg-[#C5430A] text-white font-semibold gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo Modelo Próprio
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModoEditor(false)}
                  className="h-8 text-xs"
                >
                  Voltar à Lista
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Corpo com scroll */}
        <div className="flex-1 overflow-y-auto p-5 font-sans">
          {!modoEditor ? (
            /* ============================================================== */
            /* TELA 1: LISTAGEM DE MODELOS                                    */
            /* ============================================================== */
            <div className="space-y-4">
              {/* Barra de Filtros e Busca */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar modelo por nome, descrição ou tag jurídica..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-muted/60 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setFiltroModalidade('TODAS')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                        filtroModalidade === 'TODAS'
                          ? 'bg-card text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Todos ({modelos.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroModalidade('PJ')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                        filtroModalidade === 'PJ'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      PJ ({modelos.filter((m) => m.modalidade === 'PJ').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroModalidade('CLT')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                        filtroModalidade === 'CLT'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      CLT ({modelos.filter((m) => m.modalidade === 'CLT').length})
                    </button>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={carregarDados}
                    disabled={carregando}
                    className="h-8 px-2.5"
                    title="Recarregar modelos"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Grid de Modelos */}
              {carregando && modelos.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  Carregando biblioteca de modelos...
                </div>
              ) : modelosFiltrados.length === 0 ? (
                <div className="p-12 text-center bg-card rounded-2xl border border-dashed border-border/80 space-y-3">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto" />
                  <h4 className="font-bold text-sm text-[#212B55] dark:text-[#F7F8FB]">
                    Nenhum modelo encontrado
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Não foram localizados modelos para o filtro selecionado. Crie seu primeiro
                    modelo de contrato personalizado!
                  </p>
                  <Button
                    size="sm"
                    onClick={handleNovoModelo}
                    className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Inserir Meu Primeiro Modelo
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {modelosFiltrados.map((mod) => {
                    const isPj = mod.modalidade === 'PJ'
                    const isAtivo = mod.ativo !== false

                    return (
                      <div
                        key={mod.id}
                        className={`p-4 rounded-xl border bg-card transition-all hover:border-[#E9530E]/50 flex flex-col justify-between ${
                          !isAtivo
                            ? 'opacity-60 bg-muted/20 border-dashed border-border'
                            : 'border-border shadow-xs'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                className={`text-[10px] font-bold uppercase font-display ${
                                  isPj
                                    ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                                    : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                                }`}
                              >
                                {mod.modalidade}
                              </Badge>

                              {mod.ehPadraoSistema ? (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-mono text-muted-foreground"
                                >
                                  Padrão Sistema
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-semibold">
                                  Do Usuário
                                </Badge>
                              )}

                              {!isAtivo && (
                                <Badge variant="destructive" className="text-[9px]">
                                  Inativo
                                </Badge>
                              )}
                            </div>

                            <span className="text-[10px] text-muted-foreground font-mono">
                              Alerta: {mod.diasAlertaPadrao}d
                            </span>
                          </div>

                          <h4 className="font-bold text-sm text-[#212B55] dark:text-[#F7F8FB] font-display">
                            {mod.titulo}
                          </h4>

                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {mod.descricaoBreve || 'Modelo sem descrição cadastrada.'}
                          </p>

                          {/* Tags Jurídicas */}
                          {mod.tagsJuridicas.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap pt-1">
                              {mod.tagsJuridicas.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-[9px] px-1.5 py-0 font-medium"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Rodapé de Ações */}
                        <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between text-xs">
                          <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                            {mod.criadoPorNome ? `Por ${mod.criadoPorNome}` : 'SouYess'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDuplicar(mod)}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                              title="Duplicar modelo para personalizar"
                            >
                              <Copy className="w-3 h-3" />
                              <span className="hidden sm:inline">Duplicar</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAlternarAtivo(mod)}
                              className={`h-7 px-2 text-xs gap-1 ${
                                isAtivo
                                  ? 'text-amber-600 hover:text-amber-800'
                                  : 'text-emerald-600 hover:text-emerald-800'
                              }`}
                              title={isAtivo ? 'Desativar modelo' : 'Ativar modelo'}
                            >
                              <Power className="w-3 h-3" />
                              <span className="hidden sm:inline">
                                {isAtivo ? 'Desativar' : 'Ativar'}
                              </span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditarModelo(mod)}
                              className="h-7 px-2.5 text-xs text-[#212B55] dark:text-[#F7F8FB] font-semibold border-border gap-1"
                            >
                              <Edit3 className="w-3 h-3 text-[#E9530E]" />
                              Editar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ============================================================== */
            /* TELA 2: EDITOR COM PREVIEW E PLACEHOLDERS                      */
            /* ============================================================== */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/70 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm font-display text-[#212B55] dark:text-[#F7F8FB]">
                    {isNovo
                      ? 'Criando Novo Modelo de Contrato'
                      : `Editando: ${modeloEmEdicao?.titulo}`}
                  </span>
                  {modeloEmEdicao?.ehPadraoSistema && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-amber-600 border-amber-300"
                    >
                      Editando modelo do sistema (afeta novos contratos gerados)
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setModoEditor(false)}
                    disabled={salvando}
                    className="h-8 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSalvarModelo}
                    disabled={salvando}
                    className="h-8 text-xs bg-[#E9530E] hover:bg-[#C5430A] text-white font-semibold gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {salvando ? 'Salvando Modelo...' : 'Salvar Modelo na Biblioteca'}
                  </Button>
                </div>
              </div>

              {/* Informações Básicas do Modelo */}
              <div className="p-4 bg-card rounded-xl border border-border space-y-3">
                <h4 className="font-bold font-display text-xs text-[#212B55] dark:text-[#F7F8FB] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#E9530E]" />
                  Definição e Modalidade Jurídica
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px] font-semibold">Nome do Modelo</Label>
                    <Input
                      value={formNome}
                      onChange={(e) => setFormNome(e.target.value)}
                      placeholder="Ex: Contrato de Prestação de Serviços Tech (PJ) — Modelo Custom"
                      className="h-8 text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Modalidade</Label>
                    <Select
                      value={formModalidade}
                      onValueChange={(val: any) => {
                        setFormModalidade(val)
                        if (val === 'CLT') {
                          setFormDiasAlerta(15)
                          setFormTipoModelo('CLT_EXPERIENCIA')
                          setFormPrazoTipo('Experiencia 45+45')
                        } else {
                          setFormDiasAlerta(60)
                          setFormTipoModelo('PJ_PRESTACAO_SERVICOS')
                          setFormPrazoTipo('Determinado')
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PJ" className="text-xs">
                          PJ (Prestador de Serviços)
                        </SelectItem>
                        <SelectItem value="CLT" className="text-xs">
                          CLT (Contrato de Trabalho)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 sm:col-span-3">
                    <Label className="text-[11px] font-semibold">Descrição Breve do Modelo</Label>
                    <Input
                      value={formDescricao}
                      onChange={(e) => setFormDescricao(e.target.value)}
                      placeholder="Resuma quando este modelo deve ser escolhido (ex: recomendado para especialistas sênior com entregáveis mensais)"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Tipo de Modelo Formal</Label>
                    <Select
                      value={formTipoModelo}
                      onValueChange={(val: any) => setFormTipoModelo(val)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PJ_PRESTACAO_SERVICOS" className="text-xs">
                          PJ — Prestação de Serviços Padrão
                        </SelectItem>
                        <SelectItem value="PJ_HORISTA" className="text-xs">
                          PJ — Horista / Demanda
                        </SelectItem>
                        <SelectItem value="CLT_EXPERIENCIA" className="text-xs">
                          CLT — Experiência (45+45)
                        </SelectItem>
                        <SelectItem value="CLT_INDETERMINADO" className="text-xs">
                          CLT — Indeterminado Padrão
                        </SelectItem>
                        <SelectItem value="CLT_TELETRABALHO" className="text-xs">
                          CLT — Teletrabalho / Remoto
                        </SelectItem>
                        <SelectItem value="OUTRO" className="text-xs">
                          Outro Modelo Customizado
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Prazo Sugerido</Label>
                    <Select
                      value={formPrazoTipo}
                      onValueChange={(val: any) => setFormPrazoTipo(val)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Determinado" className="text-xs">
                          Determinado
                        </SelectItem>
                        <SelectItem value="Indeterminado" className="text-xs">
                          Indeterminado
                        </SelectItem>
                        <SelectItem value="Experiencia 45+45" className="text-xs">
                          Experiência 45+45
                        </SelectItem>
                        <SelectItem value="Projeto Especifico" className="text-xs">
                          Projeto Específico
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">
                      Alerta de Renovação (Dias Antes)
                    </Label>
                    <Input
                      type="number"
                      value={formDiasAlerta}
                      onChange={(e) => setFormDiasAlerta(Number(e.target.value))}
                      className="h-8 text-xs font-mono"
                      placeholder="60"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px] font-semibold">
                      Tags Jurídicas (separadas por vírgula)
                    </Label>
                    <Input
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      placeholder="Ex: SLA 99.9%, Lei 13.429/17, Sigilo, Híbrido"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-5">
                    <input
                      type="checkbox"
                      id="mod_ativo"
                      checked={formAtivo}
                      onChange={(e) => setFormAtivo(e.target.checked)}
                      className="rounded border-input text-[#E9530E] focus:ring-[#E9530E]"
                    />
                    <label
                      htmlFor="mod_ativo"
                      className="text-xs font-semibold cursor-pointer text-[#212B55] dark:text-[#F7F8FB]"
                    >
                      Modelo Ativo para Geração
                    </label>
                  </div>
                </div>
              </div>

              {/* Área do Editor e Placeholders */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Coluna Central: Editor ou Preview */}
                <div className="lg:col-span-8 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setAbaEditor('editor')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                          abaEditor === 'editor'
                            ? 'bg-card text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Editor de Minuta
                      </button>
                      <button
                        type="button"
                        onClick={() => setAbaEditor('preview')}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
                          abaEditor === 'preview'
                            ? 'bg-[#E9530E] text-white shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview com Interpolação Real
                      </button>
                    </div>

                    {abaEditor === 'preview' && pessoas.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">Testar com:</span>
                        <select
                          value={pessoaPreviewId}
                          onChange={(e) => setPessoaPreviewId(e.target.value)}
                          className="h-7 text-xs border border-border bg-card rounded px-2"
                        >
                          {pessoas.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome} ({p.modalidade})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {abaEditor === 'editor' ? (
                    <div className="space-y-1">
                      <Textarea
                        value={formCorpoTexto}
                        onChange={(e) => setFormCorpoTexto(e.target.value)}
                        rows={18}
                        className="font-mono text-xs leading-relaxed resize-y p-3.5 bg-card"
                        placeholder="Digite o texto do contrato com os marcadores {{PESSOA_NOME}}, {{VALOR_MENSAL}}, etc..."
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Dica: use a barra lateral à direita para clicar em qualquer placeholder e
                        copiá-lo para a minuta.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-muted/40 rounded-lg border border-border/70 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[#E9530E]" />
                          <span>
                            Interpolação ativa para:{' '}
                            <strong className="text-foreground">
                              {pessoaSelecionadaPreview?.nome}
                            </strong>{' '}
                            ({pessoaSelecionadaPreview?.cargo_funcao || 'Cargo'} ·{' '}
                            {pessoaSelecionadaPreview?.modalidade})
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Simulação em Tempo Real
                        </Badge>
                      </div>

                      <div className="p-4 bg-muted/20 border border-border rounded-xl font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-[460px] overflow-y-auto text-slate-800 dark:text-slate-200">
                        {textoInterpoladoPreview}
                      </div>
                    </div>
                  )}
                </div>

                {/* Coluna Direita: Biblioteca de Placeholders Interpoláveis */}
                <div className="lg:col-span-4 p-3.5 bg-card rounded-xl border border-border space-y-3 flex flex-col max-h-[560px]">
                  <div className="flex items-center justify-between shrink-0">
                    <h4 className="font-bold font-display text-xs text-[#212B55] dark:text-[#F7F8FB] flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-indigo-600" />
                      Placeholders Suportados
                    </h4>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Clique para copiar
                    </span>
                  </div>

                  {/* Filtro de Categoria de Placeholders */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 shrink-0">
                    {['TODAS', 'Geral', 'Pessoa / PJ', 'Financeiro & Prazo', 'Especiais'].map(
                      (cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFiltroCategoriaPlaceholder(cat)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 transition-colors ${
                            filtroCategoriaPlaceholder === cat
                              ? 'bg-[#212B55] text-white'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {cat}
                        </button>
                      ),
                    )}
                  </div>

                  {/* Lista de Tokens */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {placeholdersFiltrados.map((item) => (
                      <div
                        key={item.token}
                        onClick={() => inserirPlaceholder(item.token)}
                        className="p-2 rounded-lg border border-border/70 hover:border-[#E9530E] bg-muted/20 hover:bg-[#FEF1EA]/50 dark:hover:bg-[#212B55]/60 cursor-pointer transition-all space-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <code className="text-[11px] font-bold text-[#E9530E] font-mono">
                            {item.token}
                          </code>
                          <Copy className="w-3 h-3 text-muted-foreground opacity-60" />
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">
                          {item.descricao}
                        </p>
                        <span className="text-[9px] text-muted-foreground/75 font-mono block truncate">
                          Ex: {item.exemplo}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default GerenciadorModelosContrato

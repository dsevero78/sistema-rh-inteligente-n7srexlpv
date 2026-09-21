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
  Sparkles,
  Plus,
  Scale,
  Calendar,
  Building2,
  DollarSign,
  CheckCircle2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  contratosService,
  CriarContratoInput,
  ModalidadeContrato,
} from '@/services/contratosService'
import { PessoaUnificada } from '@/services/pessoasService'
import { useAuth } from '@/contexts/AuthContext'

interface ModalNovoContratoTemplateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pessoa: PessoaUnificada
  onSuccess: () => void
}

export const ModalNovoContratoTemplate: React.FC<ModalNovoContratoTemplateProps> = ({
  open,
  onOpenChange,
  pessoa,
  onSuccess,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const templates = contratosService.getTemplates()

  // Filtra templates compatíveis com a modalidade da pessoa por padrão
  const [modalidade, setModalidade] = useState<ModalidadeContrato>(
    pessoa.modalidade === 'CLT' ? 'CLT' : 'PJ',
  )
  const templatesFiltrados = templates.filter((t) => t.modalidade === modalidade)

  const [templateSelecionadoId, setTemplateSelecionadoId] = useState<string>(
    templatesFiltrados[0]?.id || templates[0].id,
  )

  const templateAtual = templates.find((t) => t.id === templateSelecionadoId) || templates[0]

  const [titulo, setTitulo] = useState(templateAtual.titulo)
  const [dataInicio, setDataInicio] = useState(
    pessoa.data_inicio ? pessoa.data_inicio.split('T')[0] : new Date().toISOString().split('T')[0],
  )
  const [dataFim, setDataFim] = useState(pessoa.data_fim ? pessoa.data_fim.split('T')[0] : '')
  const [valorMensal, setValorMensal] = useState<number>(pessoa.valor_contratado || 0)
  const [horasBase, setHorasBase] = useState<number>(pessoa.horas_mensais_base || 160)
  const [prazoTipo, setPrazoTipo] = useState<string>(
    pessoa.prazo_tipo || templateAtual.prazoTipoSugerido || 'Determinado',
  )
  const [clausulasEspeciais, setClausulasEspeciais] = useState(pessoa.observacoes || '')
  const [resumoMudancas, setResumoMudancas] = useState(
    'Emissão inicial v1.0 gerada via SouYess People Hub.',
  )
  const [carregando, setCarregando] = useState(false)

  // Ao mudar de modalidade, atualiza o template padrão
  const handleTrocaModalidade = (novaMod: ModalidadeContrato) => {
    setModalidade(novaMod)
    const novos = templates.filter((t) => t.modalidade === novaMod)
    if (novos.length > 0) {
      setTemplateSelecionadoId(novos[0].id)
      setTitulo(novos[0].titulo)
      setPrazoTipo(novos[0].prazoTipoSugerido)
    }
  }

  const handleTrocaTemplate = (tempId: string) => {
    setTemplateSelecionadoId(tempId)
    const t = templates.find((item) => item.id === tempId)
    if (t) {
      setTitulo(t.titulo)
      setPrazoTipo(t.prazoTipoSugerido)
    }
  }

  const handleGerarContrato = async () => {
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
            <div>
              <DialogTitle className="text-lg font-bold font-display text-[#212B55] dark:text-[#F7F8FB]">
                Gerar Contrato a partir de Modelo Jurídico
              </DialogTitle>
              <DialogDescription className="text-xs">
                Selecione um template pronto e validado para {pessoa.nome} ({modalidade}).
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
            <Label className="text-xs font-semibold text-foreground">
              Selecione o Modelo Jurídico Homologado
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {templatesFiltrados.map((temp) => {
                const isSelected = temp.id === templateSelecionadoId
                return (
                  <div
                    key={temp.id}
                    onClick={() => handleTrocaTemplate(temp.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#E9530E] bg-[#FEF1EA]/60 dark:bg-[#212B55] ring-1 ring-[#E9530E]'
                        : 'border-border/80 bg-card hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#212B55] dark:text-[#F7F8FB] line-clamp-1">
                        {temp.titulo}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#E9530E] shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {temp.descricaoBreve}
                    </p>
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {temp.tagsJuridicas.map((tag) => (
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
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="h-8 text-xs font-medium"
                />
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
                  value={prazoTipo}
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
            disabled={carregando}
            className="bg-[#E9530E] hover:bg-[#C5430A] text-white font-semibold text-xs gap-1.5"
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

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Gift,
  Plus,
  Trash2,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react'
import {
  beneficiosService,
  BeneficioVinculo,
  TipoBeneficio,
  LABELS_TIPO_BENEFICIO,
  SalvarBeneficioInput,
} from '@/services/beneficiosService'
import { VinculoPessoa } from '@/services/pessoasService'
import { useToast } from '@/hooks/use-toast'

interface AbaBeneficiosVinculoProps {
  pessoaId: string
  pessoaNome: string
  modalidade: 'CLT' | 'PJ'
  vinculos: VinculoPessoa[]
  onAtualizar?: () => void
}

export const AbaBeneficiosVinculo: React.FC<AbaBeneficiosVinculoProps> = ({
  pessoaId,
  pessoaNome,
  modalidade,
  vinculos,
  onAtualizar,
}) => {
  const { toast } = useToast()
  const [beneficios, setBeneficios] = useState<BeneficioVinculo[]>([])
  const [carregando, setCarregando] = useState(true)

  // Vínculo selecionado para exibição / filtro (ou todos)
  const [vinculoSelecionadoId, setVinculoSelecionadoId] = useState<string>('todos')

  // Modal de cadastro/edição
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [beneficioEmEdicao, setBeneficioEmEdicao] = useState<BeneficioVinculo | null>(null)

  // Form
  const [formTipo, setFormTipo] = useState<TipoBeneficio>('vale_refeicao')
  const [formNome, setFormNome] = useState('')
  const [formValor, setFormValor] = useState<string>('')
  const [formDataInicio, setFormDataInicio] = useState('')
  const [formDataFim, setFormDataFim] = useState('')
  const [formVinculoId, setFormVinculoId] = useState('')
  const [formObservacao, setFormObservacao] = useState('')
  const [formAtivo, setFormAtivo] = useState(true)

  // Carregar lista de benefícios
  const carregarBeneficios = async () => {
    if (!pessoaId) return
    setCarregando(true)
    try {
      const lista = await beneficiosService.listarPorPessoa(pessoaId)
      setBeneficios(lista)
    } catch (err) {
      console.error('Erro ao carregar benefícios:', err)
      toast({
        title: 'Erro ao carregar benefícios',
        description: 'Não foi possível carregar os benefícios vinculados.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarBeneficios()
  }, [pessoaId])

  // Vínculo ativo principal para composição da remuneração
  const vinculoPrincipal =
    vinculos.find((v) => v.situacao === 'Vigente' || v.situacao === 'Em integração') || vinculos[0]

  const valorContratadoBase = vinculoPrincipal ? Number(vinculoPrincipal.valorMensal || 0) : 0

  // Benefícios filtrados
  const beneficiosFiltrados =
    vinculoSelecionadoId === 'todos'
      ? beneficios
      : beneficios.filter(
          (b) => !b.vinculo_origem_id || b.vinculo_origem_id === vinculoSelecionadoId,
        )

  // Total de benefícios mensais ativos
  const totalBeneficiosAtivos = beneficios
    .filter((b) => b.ativo !== false)
    .reduce((acc, b) => acc + (Number(b.valor_mensal) || 0), 0)

  // Remuneração Total Composta = Contratado + Benefícios
  const remuneracaoTotalComposta = valorContratadoBase + totalBeneficiosAtivos

  const handleAbrirCriacao = () => {
    setBeneficioEmEdicao(null)
    setFormTipo(modalidade === 'PJ' ? 'auxilio_home_office' : 'vale_refeicao')
    setFormNome('')
    setFormValor('')
    setFormDataInicio(new Date().toISOString().split('T')[0])
    setFormDataFim('')
    setFormVinculoId(vinculoPrincipal?.id || '')
    setFormObservacao('')
    setFormAtivo(true)
    setModalAberto(true)
  }

  const handleAbrirEdicao = (b: BeneficioVinculo) => {
    setBeneficioEmEdicao(b)
    setFormTipo(b.tipo)
    setFormNome(b.nome_personalizado || '')
    setFormValor(b.valor_mensal.toString())
    setFormDataInicio(b.data_inicio ? b.data_inicio.split('T')[0] : '')
    setFormDataFim(b.data_fim ? b.data_fim.split('T')[0] : '')
    setFormVinculoId(b.vinculo_origem_id || '')
    setFormObservacao(b.observacao || '')
    setFormAtivo(b.ativo)
    setModalAberto(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const valorNum = parseFloat(formValor.replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Informe um valor mensal positivo para o benefício.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const payload: SalvarBeneficioInput = {
        pessoa: pessoaId,
        vinculo_origem_id: formVinculoId || undefined,
        tipo: formTipo,
        nome_personalizado: formNome.trim() || undefined,
        valor_mensal: valorNum,
        data_inicio: formDataInicio || new Date().toISOString().split('T')[0],
        data_fim: formDataFim || undefined,
        ativo: formAtivo,
        observacao: formObservacao.trim() || undefined,
      }

      if (beneficioEmEdicao) {
        await beneficiosService.atualizar(beneficioEmEdicao.id, payload)
        toast({
          title: 'Benefício atualizado',
          description: 'Benefício do vínculo atualizado com sucesso.',
        })
      } else {
        await beneficiosService.criar(payload)
        toast({
          title: 'Benefício adicionado',
          description: 'Benefício incorporado à remuneração do vínculo.',
        })
      }

      setModalAberto(false)
      await carregarBeneficios()
      if (onAtualizar) onAtualizar()
    } catch (err: any) {
      console.error('Erro ao salvar benefício:', err)
      toast({
        title: 'Erro ao salvar benefício',
        description: err?.message || 'Falha ao salvar no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente remover o benefício "${nome}"?`)) return
    try {
      await beneficiosService.excluir(id)
      toast({
        title: 'Benefício removido',
        description: 'O benefício foi excluído da composição remuneratória.',
      })
      await carregarBeneficios()
      if (onAtualizar) onAtualizar()
    } catch (err) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o benefício.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-5">
      {/* 1. Header do Módulo com Identidade e Ação */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold font-display text-[#212B55] dark:text-[#F7F8FB] flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#E9530E]" />
              Benefícios & Composição Remuneratória ({modalidade})
            </h3>
            <Badge
              variant="outline"
              className={
                modalidade === 'CLT'
                  ? 'border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/40'
                  : 'border-purple-400 text-purple-700 bg-purple-50 dark:bg-purple-950/40'
              }
            >
              {modalidade}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cadastre os benefícios contratados para {pessoaNome}. Os valores compõem a remuneração
            total da pessoa e alimentam os custos por BU.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleAbrirCriacao}
          className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-semibold gap-1.5 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Cadastrar Benefício
        </Button>
      </div>

      {/* 2. Destaque da Composição: Contratado + Benefícios = Remuneração Total */}
      <Card className="border-2 border-[#E9530E]/30 bg-gradient-to-r from-orange-50/40 via-card to-amber-50/30 dark:from-[#212B55]/30 dark:to-card shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#E9530E] block flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Fórmula de Remuneração Total Composta
              </span>
              <p className="text-xs text-muted-foreground">
                Demonstrativo explícito de remuneração para {modalidade}: valor contratado somado
                aos benefícios ativos.
              </p>
            </div>

            {/* Display Matemático: Base + Benefícios = Total */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="bg-card/90 border border-border/80 px-3 py-2 rounded-lg text-center shadow-2xs">
                <span className="text-[10px] text-muted-foreground block font-medium">
                  {modalidade === 'CLT' ? 'Salário Contratado' : 'Valor Contratado PJ'}
                </span>
                <span className="text-sm sm:text-base font-bold font-mono text-[#212B55] dark:text-[#F7F8FB]">
                  R$ {valorContratadoBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <span className="text-lg font-bold text-muted-foreground">+</span>

              <div className="bg-card/90 border border-border/80 px-3 py-2 rounded-lg text-center shadow-2xs">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                  Benefícios ({beneficios.filter((b) => b.ativo !== false).length})
                </span>
                <span className="text-sm sm:text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  R$ {totalBeneficiosAtivos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <span className="text-lg font-bold text-muted-foreground">=</span>

              <div className="bg-[#212B55] text-white px-4 py-2 rounded-lg text-center shadow-xs">
                <span className="text-[10px] text-orange-200 block font-bold uppercase tracking-wider">
                  Remuneração Total
                </span>
                <span className="text-base sm:text-lg font-black font-mono text-orange-400">
                  R${' '}
                  {remuneracaoTotalComposta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Filtro por Vínculo (caso a pessoa tenha mais de um contrato/vínculo) */}
      {vinculos.length > 1 && (
        <div className="flex items-center gap-2 text-xs">
          <Label className="text-muted-foreground font-semibold">Filtrar por Vínculo:</Label>
          <Select value={vinculoSelecionadoId} onValueChange={setVinculoSelecionadoId}>
            <SelectTrigger className="w-[280px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os vínculos ({beneficios.length})</SelectItem>
              {vinculos.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.titulo} ({v.tipo})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 4. Lista dos Benefícios Cadastrados */}
      {carregando ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Carregando benefícios do vínculo...
        </div>
      ) : beneficiosFiltrados.length === 0 ? (
        <Card className="border border-dashed border-border/80 bg-muted/10 p-8 text-center space-y-3">
          <Gift className="w-10 h-10 text-muted-foreground/60 mx-auto" />
          <h4 className="font-bold text-sm text-[#212B55] dark:text-[#F7F8FB]">
            Nenhum benefício cadastrado para este vínculo
          </h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {modalidade === 'CLT'
              ? 'Adicione benefícios comuns a contratos CLT como Vale-Refeição, Vale-Transporte, Plano de Saúde ou Odontológico.'
              : 'Cadastre os benefícios negociados para o prestador PJ, como Auxílio Conectividade / Home Office, Plano de Saúde ou Subsídio Técnico.'}
          </p>
          <Button
            size="sm"
            onClick={handleAbrirCriacao}
            className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-semibold gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Cadastrar Primeiro Benefício
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {beneficiosFiltrados.map((ben) => {
            const rotuloTipo = LABELS_TIPO_BENEFICIO[ben.tipo] || ben.tipo
            const nomeExibicao = ben.nome_personalizado || rotuloTipo
            const dtIniStr = ben.data_inicio
              ? new Date(ben.data_inicio).toLocaleDateString('pt-BR')
              : '—'
            const dtFimStr = ben.data_fim
              ? new Date(ben.data_fim).toLocaleDateString('pt-BR')
              : 'Indeterminado'

            const vincAssoc = vinculos.find((v) => v.id === ben.vinculo_origem_id)

            return (
              <Card
                key={ben.id}
                className={`border shadow-2xs transition-all ${
                  ben.ativo
                    ? 'border-border/80 bg-card hover:border-[#E9530E]/50'
                    : 'border-border/40 bg-muted/20 opacity-60'
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#212B55] dark:text-[#F7F8FB]">
                          {nomeExibicao}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            ben.ativo
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px]'
                              : 'bg-muted text-muted-foreground border-border text-[10px]'
                          }
                        >
                          {ben.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium block mt-0.5">
                        {rotuloTipo}
                        {vincAssoc && ` · Vínculo: ${vincAssoc.titulo}`}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-bold font-mono text-[#E9530E]">
                        R${' '}
                        {Number(ben.valor_mensal).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">/ mês</span>
                    </div>
                  </div>

                  {ben.observacao && (
                    <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border/40 italic">
                      "{ben.observacao}"
                    </p>
                  )}

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      Vigência: {dtIniStr} até {dtFimStr}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAbrirEdicao(ben)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleExcluir(ben.id, nomeExibicao)}
                        className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 5. Modal de Cadastro/Edição de Benefício */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#212B55] dark:text-[#F7F8FB] flex items-center gap-2">
              <Gift className="w-4 h-4 text-[#E9530E]" />
              {beneficioEmEdicao ? 'Editar Benefício' : 'Cadastrar Benefício no Vínculo'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe a categoria, nome e valor mensal do benefício. O total compõe a remuneração do
              colaborador {modalidade}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-3.5 py-1 text-xs">
            <div className="space-y-1">
              <Label>Tipo de Benefício *</Label>
              <Select value={formTipo} onValueChange={(val: any) => setFormTipo(val)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vale_refeicao">Vale-Refeição (VR)</SelectItem>
                  <SelectItem value="vale_alimentacao">Vale-Alimentação (VA)</SelectItem>
                  <SelectItem value="vale_transporte">Vale-Transporte (VT)</SelectItem>
                  <SelectItem value="plano_saude">Plano de Saúde Médico</SelectItem>
                  <SelectItem value="plano_odontologico">Plano Odontológico</SelectItem>
                  <SelectItem value="seguro_vida">Seguro de Vida em Grupo</SelectItem>
                  <SelectItem value="auxilio_home_office">
                    Auxílio Home Office / Conectividade
                  </SelectItem>
                  <SelectItem value="auxilio_creche">Auxílio-Creche</SelectItem>
                  <SelectItem value="outros">Outro Benefício Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="ben-nome">Nome Personalizado / Fornecedor (opcional)</Label>
              <Input
                id="ben-nome"
                placeholder="Ex: Flash Flexível, Bradesco Saúde Top Nacional, Ticket Restaurante"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ben-valor">Valor Mensal (R$) *</Label>
                <Input
                  id="ben-valor"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 850.00"
                  required
                  value={formValor}
                  onChange={(e) => setFormValor(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Vínculo Associado</Label>
                <Select value={formVinculoId} onValueChange={setFormVinculoId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Vínculo principal" />
                  </SelectTrigger>
                  <SelectContent>
                    {vinculos.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.titulo} ({v.tipo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ben-ini">Data de Início *</Label>
                <Input
                  id="ben-ini"
                  type="date"
                  required
                  value={formDataInicio}
                  onChange={(e) => setFormDataInicio(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="ben-fim">Data de Término (opcional)</Label>
                <Input
                  id="ben-fim"
                  type="date"
                  value={formDataFim}
                  onChange={(e) => setFormDataFim(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="ben-obs">Observações / Detalhes de Concessão</Label>
              <Input
                id="ben-obs"
                placeholder="Ex: Coparticipação subsidiada pela SouYess, carga no 1º dia útil..."
                value={formObservacao}
                onChange={(e) => setFormObservacao(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="ben-ativo"
                checked={formAtivo}
                onChange={(e) => setFormAtivo(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#E9530E] focus:ring-[#E9530E]"
              />
              <Label htmlFor="ben-ativo" className="cursor-pointer text-xs font-semibold">
                Benefício ativo e compondo a remuneração mensal
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalAberto(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvando}
                className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-semibold"
              >
                {salvando ? 'Salvando...' : beneficioEmEdicao ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default AbaBeneficiosVinculo

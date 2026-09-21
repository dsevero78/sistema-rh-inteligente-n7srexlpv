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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calendar,
  DollarSign,
  Building2,
  Users2,
  Sparkles,
  FileText,
  UserCheck,
  CheckCircle2,
  Compass,
} from 'lucide-react'
import {
  TEMPLATES_INTEGRACAO,
  TemplatePlanoIntegracao,
  TipoIntegrado,
  PrazoContratoTipo,
  ItemChecklistRotina,
  Marco306090,
  CriarRotinaIntegracaoInput,
  rotinaIntegracaoService,
} from '@/services/rotinaIntegracaoService'
import type { PrestadorPJ, ContratoPJ } from '@/services/prestadoresPj'
import type { RecordModel } from 'pocketbase'
import { useToast } from '@/hooks/use-toast'

interface ModalNovaRotinaIntegracaoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSucesso: (idNovaRotina: string) => void
  prestadoresDisponiveis: PrestadorPJ[]
  contratosDisponiveis: ContratoPJ[]
  candidatosDisponiveis: RecordModel[]
  vagasDisponiveis: RecordModel[]
  usuariosGestores: RecordModel[]
  prestadorPreSelecionado?: PrestadorPJ | null
}

export function ModalNovaRotinaIntegracao({
  open,
  onOpenChange,
  onSucesso,
  prestadoresDisponiveis,
  contratosDisponiveis,
  candidatosDisponiveis,
  vagasDisponiveis,
  usuariosGestores,
  prestadorPreSelecionado,
}: ModalNovaRotinaIntegracaoProps) {
  const { toast } = useToast()

  // Estado geral do formulário
  const [tipoIntegrado, setTipoIntegrado] = useState<TipoIntegrado>(
    prestadorPreSelecionado ? 'PJ' : 'CLT',
  )
  const [templateSelecionadoId, setTemplateSelecionadoId] = useState<string>(
    prestadorPreSelecionado ? 'template-prestador-pj' : 'template-tech-senior',
  )

  // Vínculos com cadastros existentes
  const [prestadorId, setPrestadorId] = useState<string>(prestadorPreSelecionado?.id || '')
  const [candidatoId, setCandidatoId] = useState<string>('')
  const [vagaId, setVagaId] = useState<string>('')

  // Campos de identificação
  const [nomeCompleto, setNomeCompleto] = useState<string>(
    prestadorPreSelecionado?.nome_fantasia || prestadorPreSelecionado?.razao_social || '',
  )
  const [documento, setDocumento] = useState<string>(prestadorPreSelecionado?.cnpj || '')
  const [email, setEmail] = useState<string>(prestadorPreSelecionado?.contato_email || '')
  const [telefone, setTelefone] = useState<string>(prestadorPreSelecionado?.contato_telefone || '')
  const [cargoFuncao, setCargoFuncao] = useState<string>(
    prestadorPreSelecionado?.area_atuacao || '',
  )
  const [departamento, setDepartamento] = useState<string>('Tecnologia')

  // Dados Contratuais
  const [dataInicio, setDataInicio] = useState<string>(new Date().toISOString().split('T')[0])
  const [valorContratado, setValorContratado] = useState<number>(
    prestadorPreSelecionado?.valor_mensal_atual || 0,
  )
  const [valorHora, setValorHora] = useState<number>(
    prestadorPreSelecionado?.valor_mensal_atual
      ? Number((prestadorPreSelecionado.valor_mensal_atual / 160).toFixed(2))
      : 0,
  )
  const [horasSemanais, setHorasSemanais] = useState<number>(40)
  const [duracaoMeses, setDuracaoMeses] = useState<number>(12)
  const [prazoTipo, setPrazoTipo] = useState<PrazoContratoTipo>(
    prestadorPreSelecionado ? 'Determinado' : 'Indeterminado',
  )

  // Responsáveis
  const [gestorId, setGestorId] = useState<string>('')
  const [gestorNome, setGestorNome] = useState<string>('')
  const [buddyNome, setBuddyNome] = useState<string>('')
  const [buddyEmail, setBuddyEmail] = useState<string>('')
  const [observacoes, setObservacoes] = useState<string>('')

  const [salvando, setSalvando] = useState(false)

  // Quando seleciona um prestador existente PJ, preenche automaticamente os dados sem duplicar
  const handleSelecionarPrestador = (id: string) => {
    setPrestadorId(id)
    const p = prestadoresDisponiveis.find((item) => item.id === id)
    if (p) {
      setNomeCompleto(p.nome_fantasia || p.razao_social)
      setDocumento(p.cnpj || '')
      setEmail(p.contato_email || '')
      setTelefone(p.contato_telefone || '')
      setCargoFuncao(p.area_atuacao || 'Prestador PJ Especialista')
      if (p.valor_mensal_atual && p.valor_mensal_atual > 0) {
        setValorContratado(p.valor_mensal_atual)
        setValorHora(Number((p.valor_mensal_atual / 160).toFixed(2)))
      } else {
        // Tentar obter do contrato vigente
        const cont = contratosDisponiveis.find(
          (c) => c.prestador === p.id && (c.status === 'Vigente' || c.status === 'Vencendo'),
        )
        if (cont && cont.valor) {
          setValorContratado(cont.valor)
          setValorHora(Number((cont.valor / 160).toFixed(2)))
          if (cont.gestor_responsavel) setGestorId(cont.gestor_responsavel)
          if (cont.gestor_nome) setGestorNome(cont.gestor_nome)
        }
      }
    }
  }

  // Quando seleciona um candidato aprovado existente, preenche os dados
  const handleSelecionarCandidato = (id: string) => {
    setCandidatoId(id)
    const c = candidatosDisponiveis.find((item) => item.id === id)
    if (c) {
      setNomeCompleto(c.nome)
      setEmail(c.email || '')
      setTelefone(c.telefone || '')
      setCargoFuncao(c.cargo_atual || 'Colaborador')
      if (c.vaga) {
        setVagaId(c.vaga)
        const v = vagasDisponiveis.find((item) => item.id === c.vaga)
        if (v) {
          setDepartamento(v.departamento || 'Tecnologia')
          if (v.gestor_responsavel) {
            setGestorId(v.gestor_responsavel)
            const g = usuariosGestores.find((u) => u.id === v.gestor_responsavel)
            if (g) setGestorNome(g.name || g.email)
          }
        }
      }
    }
  }

  // Recalcular valor hora ao digitar valor contratado ou horas semanais
  const handleValorContratadoChange = (val: number) => {
    setValorContratado(val)
    if (val > 0) {
      const vh = rotinaIntegracaoService.calcularValorHora(val, horasSemanais)
      setValorHora(vh)
    }
  }

  const handleSalvar = async () => {
    if (!nomeCompleto.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome do colaborador ou prestador PJ.',
        variant: 'destructive',
      })
      return
    }

    if (!cargoFuncao.trim()) {
      toast({
        title: 'Cargo/Função obrigatória',
        description: 'Informe a função a ser desempenhada.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      // Obter template selecionado
      const tmpl =
        TEMPLATES_INTEGRACAO.find((t) => t.id === templateSelecionadoId) || TEMPLATES_INTEGRACAO[0]

      // Montar itens de checklist com IDs únicos
      const checklistItens: ItemChecklistRotina[] = tmpl.checklistFases.map((it, idx) => ({
        id: `chk-${Date.now()}-${idx}`,
        fase: it.fase,
        titulo: it.titulo,
        responsavel: it.responsavel,
        concluido: false,
      }))

      // Montar marcos 30-60-90
      const datasMarcos = rotinaIntegracaoService.calcularDatasMarcos(dataInicio)
      const marcos306090: Marco306090[] = tmpl.marcos.map((m) => {
        let prazoIso = datasMarcos.marco30
        if (m.marco === '60_dias') prazoIso = datasMarcos.marco60
        if (m.marco === '90_dias') prazoIso = datasMarcos.marco90

        return {
          marco: m.marco,
          titulo: m.titulo,
          prazo: prazoIso,
          status: 'pendente',
          objetivos: [...m.objetivos],
          entregasEsperadas: m.entregasEsperadas,
          checkInRealizado: false,
          dataCheckIn: null,
          parecerGestor: '',
          notaAvaliacao: null,
        }
      })

      const gestorObj = usuariosGestores.find((u) => u.id === gestorId)
      const nomeGestorFinal = gestorObj ? gestorObj.name || gestorObj.email : gestorNome

      const input: CriarRotinaIntegracaoInput = {
        tipo_integrado: tipoIntegrado,
        nome_completo: nomeCompleto,
        documento_identificacao: documento,
        email_contato: email,
        telefone_contato: telefone,
        cargo_funcao: cargoFuncao,
        departamento: departamento,
        gestor_responsavel: gestorId || undefined,
        gestor_nome: nomeGestorFinal,
        buddy_mentor_nome: buddyNome,
        buddy_mentor_email: buddyEmail,
        prestador_pj: tipoIntegrado === 'PJ' ? prestadorId || undefined : undefined,
        candidato: tipoIntegrado === 'CLT' ? candidatoId || undefined : undefined,
        vaga: vagaId || undefined,
        data_inicio: dataInicio,
        valor_contratado: valorContratado,
        valor_hora: valorHora,
        horas_semanais: horasSemanais,
        duracao_meses: duracaoMeses,
        prazo_contrato_tipo: prazoTipo,
        template_origem: tmpl.titulo,
        itens_checklist: checklistItens,
        marcos_30_60_90: marcos306090,
        observacoes: observacoes,
      }

      const nova = await rotinaIntegracaoService.criar(input)
      toast({
        title: 'Rotina de Integração criada com sucesso!',
        description: `Plano ativado para ${nova.nome_completo} com checklist em 4 fases e marcos 30-60-90.`,
      })
      onSucesso(nova.id)
      onOpenChange(false)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao criar rotina',
        description: err instanceof Error ? err.message : 'Falha na persistência.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E] text-slate-900 dark:text-[#F7F8FB] p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-[#2E3A6E]/50 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#E9530E]/10 text-[#E9530E] border border-[#E9530E]/20 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-[#E9530E]" />
            </div>
            <div>
              <DialogTitle className="font-display text-xl font-bold text-slate-900 dark:text-[#F7F8FB]">
                Nova Rotina de Integração
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-[#A8B0C9] mt-0.5">
                Vincule o cadastro contratual ao plano de integração 30-60-90 inspirado nas melhores
                práticas tech.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-3 font-sans">
          {/* SELEÇÃO DE MODALIDADE CLT OU PJ */}
          <div className="bg-slate-50 dark:bg-[#11162B]/60 p-4 rounded-xl border border-slate-200 dark:border-[#2E3A6E]/50 space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-[#D3D7E5] font-display flex items-center gap-2">
              <span>1. Modalidade de Contratação</span>
            </Label>
            <RadioGroup
              value={tipoIntegrado}
              onValueChange={(val: TipoIntegrado) => {
                setTipoIntegrado(val)
                if (val === 'PJ') {
                  setTemplateSelecionadoId('template-prestador-pj')
                  setPrazoTipo('Determinado')
                } else {
                  setTemplateSelecionadoId('template-tech-senior')
                  setPrazoTipo('Indeterminado')
                }
              }}
              className="grid grid-cols-2 gap-3"
            >
              <div
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  tipoIntegrado === 'CLT'
                    ? 'border-[#E9530E] bg-[#FEF1EA] dark:bg-[#E9530E]/10 text-slate-900 dark:text-[#F7F8FB] shadow-xs'
                    : 'border-slate-200 dark:border-[#2E3A6E] hover:bg-slate-100 dark:hover:bg-[#212B55]'
                }`}
                onClick={() => {
                  setTipoIntegrado('CLT')
                  setTemplateSelecionadoId('template-tech-senior')
                }}
              >
                <RadioGroupItem value="CLT" id="modalidade-clt" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="modalidade-clt" className="font-bold text-sm cursor-pointer">
                      Colaborador CLT
                    </Label>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Contrato de Trabalho
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#A8B0C9] mt-0.5">
                    Admissão legal, eSocial, benefícios, período de experiência 90 dias.
                  </p>
                </div>
              </div>

              <div
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  tipoIntegrado === 'PJ'
                    ? 'border-[#E9530E] bg-[#FEF1EA] dark:bg-[#E9530E]/10 text-slate-900 dark:text-[#F7F8FB] shadow-xs'
                    : 'border-slate-200 dark:border-[#2E3A6E] hover:bg-slate-100 dark:hover:bg-[#212B55]'
                }`}
                onClick={() => {
                  setTipoIntegrado('PJ')
                  setTemplateSelecionadoId('template-prestador-pj')
                }}
              >
                <RadioGroupItem value="PJ" id="modalidade-pj" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="modalidade-pj" className="font-bold text-sm cursor-pointer">
                      Prestador de Serviços PJ
                    </Label>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      B2B / CNPJ
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#A8B0C9] mt-0.5">
                    Reaproveita fornecedor já cadastrado, certidões e valor contratado.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* VÍNCULO COM O QUE JÁ EXISTE (NÃO DUPLICAR ENTIDADES) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-[#D3D7E5] font-display flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#E9530E]" />
                <span>
                  {tipoIntegrado === 'PJ'
                    ? 'Vincular a um Prestador PJ Existente (Recomendado)'
                    : 'Vincular a um Candidato Aprovado (Opcional)'}
                </span>
              </Label>
              <span className="text-[11px] text-slate-400">Reaproveita dados sem duplicar</span>
            </div>

            {tipoIntegrado === 'PJ' ? (
              <Select value={prestadorId} onValueChange={handleSelecionarPrestador}>
                <SelectTrigger className="w-full bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs">
                  <SelectValue placeholder="Selecione um prestador cadastrado..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E] text-xs max-h-56">
                  <SelectItem value="">-- Novo Cadastro Avulso --</SelectItem>
                  {prestadoresDisponiveis.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome_fantasia || p.razao_social} · CNPJ: {p.cnpj} (
                      {p.valor_mensal_atual
                        ? `R$ ${p.valor_mensal_atual.toLocaleString('pt-BR')}/mês`
                        : 'Sem valor'}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={candidatoId} onValueChange={handleSelecionarCandidato}>
                <SelectTrigger className="w-full bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs">
                  <SelectValue placeholder="Selecione um candidato aprovado..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E] text-xs max-h-56">
                  <SelectItem value="">-- Cadastrar Colaborador Manualmente --</SelectItem>
                  {candidatosDisponiveis.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} · {c.cargo_atual || 'Candidato'} (Status: {c.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* DADOS CADASTRAIS (FASE 0) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome Completo / Razão Social *</Label>
              <Input
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                placeholder={
                  tipoIntegrado === 'PJ'
                    ? 'Ex: Nexus Soluções em Nuvem Ltda'
                    : 'Ex: Juliana Mendes Castro'
                }
                className="bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {tipoIntegrado === 'PJ' ? 'CNPJ' : 'CPF / Documento'}
              </Label>
              <Input
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder={tipoIntegrado === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                className="bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">E-mail de Contato</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@empresa.com"
                className="bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Telefone / WhatsApp</Label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cargo / Função *</Label>
              <Input
                value={cargoFuncao}
                onChange={(e) => setCargoFuncao(e.target.value)}
                placeholder="Ex: Engenheiro de Software Sênior / Consultor Cloud"
                className="bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Departamento</Label>
              <Input
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                placeholder="Ex: Engenharia de Software, Produto, Operações"
                className="bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs"
              />
            </div>
          </div>

          {/* DADOS CONTRATUAIS (FASE 1) */}
          <div className="bg-slate-50 dark:bg-[#11162B]/40 p-4 rounded-xl border border-slate-200 dark:border-[#2E3A6E]/50 space-y-4">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-[#D3D7E5] font-display flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#E9530E]" />
              <span>Dados Contratuais & Financeiros</span>
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Data de Início (Dia 1) *
                </Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  {tipoIntegrado === 'PJ' ? 'Valor Contratado Mensal (R$)' : 'Salário Base (R$)'}
                </Label>
                <Input
                  type="number"
                  value={valorContratado || ''}
                  onChange={(e) => handleValorContratadoChange(Number(e.target.value))}
                  placeholder="0,00"
                  className="bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Valor/Hora (R$)</Label>
                  <span className="text-[10px] text-slate-400 font-mono">160h/mês</span>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  value={valorHora || ''}
                  onChange={(e) => setValorHora(Number(e.target.value))}
                  placeholder="Calculado automaticamente"
                  className="bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Prazo do Contrato</Label>
                <Select
                  value={prazoTipo}
                  onValueChange={(val: PrazoContratoTipo) => setPrazoTipo(val)}
                >
                  <SelectTrigger className="bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E] text-xs">
                    <SelectItem value="Indeterminado">Prazo Indeterminado (Padrão CLT)</SelectItem>
                    <SelectItem value="Determinado">
                      Prazo Determinado (12 meses PJ/Temporário)
                    </SelectItem>
                    <SelectItem value="Projeto Especifico">Por Projeto / Escopo Fechado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Duração Vigência (Meses)</Label>
                <Input
                  type="number"
                  value={duracaoMeses || ''}
                  onChange={(e) => setDuracaoMeses(Number(e.target.value))}
                  placeholder="Ex: 12"
                  className="bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* GESTOR RESPONSÁVEL E BUDDY MENTOR (INSPIRADO GOOGLE & NUBANK) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#E9530E]" />
                Gestor Responsável pelos Check-ins 30-60-90
              </Label>
              <Select
                value={gestorId}
                onValueChange={(val) => {
                  setGestorId(val)
                  const g = usuariosGestores.find((u) => u.id === val)
                  if (g) setGestorNome(g.name || g.email)
                }}
              >
                <SelectTrigger className="bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs">
                  <SelectValue placeholder="Selecione o gestor contratante..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E] text-xs">
                  {usuariosGestores.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email} ({u.cargo_funcao || 'Gestor'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Users2 className="w-3.5 h-3.5 text-blue-500" />
                Buddy / Mentor Designado (Benchmark Tech)
              </Label>
              <Input
                value={buddyNome}
                onChange={(e) => setBuddyNome(e.target.value)}
                placeholder="Ex: Lucas Ferreira (Staff Engineer) / Par experiente"
                className="bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs"
              />
            </div>
          </div>

          {/* TEMPLATES DE PLANO PRÉ-PRONTOS (1 CLIQUE) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-[#D3D7E5] font-display flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E9530E]" />
                <span>Escolha o Template de Integração 30-60-90</span>
              </Label>
              <Badge
                variant="outline"
                className="text-[10px] text-[#E9530E] border-[#E9530E]/30 bg-[#E9530E]/5"
              >
                1 clique para aplicar
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TEMPLATES_INTEGRACAO.map((tmpl) => {
                const isSelected = templateSelecionadoId === tmpl.id
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setTemplateSelecionadoId(tmpl.id)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#E9530E] bg-[#FEF1EA] dark:bg-[#E9530E]/15 shadow-sm ring-1 ring-[#E9530E]'
                        : 'border-slate-200 dark:border-[#2E3A6E] hover:border-[#E9530E]/60 bg-white dark:bg-[#11162B]/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-[#2E3A6E] text-slate-700 dark:text-[#D3D7E5]">
                          {tmpl.badge}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#E9530E]" />}
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-[#F7F8FB] leading-snug">
                        {tmpl.titulo}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-[#A8B0C9] mt-1 line-clamp-3">
                        {tmpl.descricao}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-[#2E3A6E]/40 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{tmpl.checklistFases.length} itens checklist</span>
                      <span>3 marcos (30-60-90)</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Observações Complementares</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Instruções específicas para o primeiro dia, links internos ou detalhes do contrato."
              rows={2}
              className="bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 dark:border-[#2E3A6E]/50 pt-4 flex flex-row items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-500"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={salvando}
            onClick={handleSalvar}
            className="text-xs bg-[#E9530E] hover:bg-[#C5430A] text-white font-bold px-5 shadow-xs"
          >
            {salvando ? 'Criando Rotina...' : 'Ativar Rotina de Integração'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

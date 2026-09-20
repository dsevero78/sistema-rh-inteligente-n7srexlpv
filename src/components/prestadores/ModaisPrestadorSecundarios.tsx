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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/hooks/use-toast'
import {
  prestadoresService,
  PrestadorPJ,
  ContratoPJ,
  DocumentoPJ,
  NotaFiscalPJ,
} from '@/services/prestadoresPj'
import pb from '@/lib/pocketbase/client'
import { FileText, FileCheck, DollarSign, Star, UploadCloud } from 'lucide-react'

// ============================================================================
// Modal Novo Contrato
// ============================================================================
export const ModalNovoContrato: React.FC<{
  open: boolean
  onOpenChange: (open: boolean) => void
  prestador: PrestadorPJ
  onSuccess: () => void
}> = ({ open, onOpenChange, prestador, onSuccess }) => {
  const { toast } = useToast()
  const [titulo, setTitulo] = useState('')
  const [numeroContrato, setNumeroContrato] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState<'Mensal' | 'Por hora' | 'Por projeto'>('Mensal')
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().substring(0, 10))
  const [dataFim, setDataFim] = useState('')
  const [status, setStatus] = useState<
    'Vigente' | 'Vencendo' | 'Renovado' | 'Encerrado' | 'Rescindido'
  >('Vigente')
  const [clausulas, setClausulas] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo || !valor || !dataInicio || !dataFim) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      await prestadoresService.criarContrato(
        {
          prestador: prestador.id,
          titulo,
          numero_contrato: numeroContrato || undefined,
          valor: Number(valor),
          tipo,
          data_inicio: `${dataInicio} 00:00:00.000Z`,
          data_fim: `${dataFim} 00:00:00.000Z`,
          status,
          gestor_responsavel: pb.authStore.model?.id || undefined,
          gestor_nome: pb.authStore.model?.name || 'Gestor RH',
          clausulas_resumo: clausulas || undefined,
        },
        arquivo || undefined,
      )
      toast({ title: 'Contrato cadastrado com sucesso!' })
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao criar contrato',
        description: err instanceof Error ? err.message : 'Falha ao salvar.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6 bg-white border border-slate-200">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Novo Contrato de Prestação PJ
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Vincular contrato com {prestador.nome_fantasia || prestador.razao_social}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Título / Objeto do Contrato *
            </Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Consultoria em Cloud e Sustentação Kubernetes"
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Número do Contrato</Label>
              <Input
                value={numeroContrato}
                onChange={(e) => setNumeroContrato(e.target.value)}
                placeholder="Ex: CT-PJ-2026-050"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Tipo de Faturamento</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                  <SelectItem value="Por projeto">Por projeto</SelectItem>
                  <SelectItem value="Por hora">Por hora</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Ex: 24500"
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vigente">Vigente</SelectItem>
                  <SelectItem value="Vencendo">Vencendo</SelectItem>
                  <SelectItem value="Renovado">Renovado</SelectItem>
                  <SelectItem value="Encerrado">Encerrado</SelectItem>
                  <SelectItem value="Rescindido">Rescindido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Data de Início *</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Data de Fim (Vigência) *
              </Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Resumo de Cláusulas & SLAs
            </Label>
            <Textarea
              value={clausulas}
              onChange={(e) => setClausulas(e.target.value)}
              placeholder="Escopo de entregas, multas, aviso prévio de rescisão e regras de confidencialidade..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Anexo do Contrato Assinado (PDF)
            </Label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => e.target.files && setArquivo(e.target.files[0])}
              className="text-xs text-slate-600 block w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-slate-300 file:text-xs file:bg-slate-50"
            />
          </div>

          <DialogFooter className="pt-3 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              {loading ? 'Salvando...' : 'Cadastrar Contrato'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Modal Novo Documento
// ============================================================================
export const ModalNovoDocumento: React.FC<{
  open: boolean
  onOpenChange: (open: boolean) => void
  prestador: PrestadorPJ
  onSuccess: () => void
}> = ({ open, onOpenChange, prestador, onSuccess }) => {
  const { toast } = useToast()
  const [tipoDocumento, setTipoDocumento] = useState<string>('Certidão negativa federal')
  const [titulo, setTitulo] = useState('')
  const [dataEmissao, setDataEmissao] = useState('')
  const [dataValidade, setDataValidade] = useState('')
  const [observacao, setObservacao] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await prestadoresService.criarDocumento(
        {
          prestador: prestador.id,
          tipo_documento: tipoDocumento as any,
          titulo_personalizado: titulo || undefined,
          data_emissao: dataEmissao ? `${dataEmissao} 00:00:00.000Z` : undefined,
          data_validade: dataValidade ? `${dataValidade} 00:00:00.000Z` : undefined,
          observacao: observacao || undefined,
        },
        arquivo || undefined,
      )
      toast({ title: 'Documento registrado com sucesso!' })
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao registrar documento',
        description: err instanceof Error ? err.message : 'Falha.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-white border border-slate-200">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Novo Documento ou Certidão
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Anexe certidões fiscais, trabalhistas ou registros societários.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Tipo de Documento *</Label>
            <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Contrato social">Contrato social</SelectItem>
                <SelectItem value="Certidão negativa federal">Certidão negativa federal</SelectItem>
                <SelectItem value="Certidão estadual/municipal">
                  Certidão estadual/municipal
                </SelectItem>
                <SelectItem value="FGTS/CRF">FGTS/CRF</SelectItem>
                <SelectItem value="CNDT">CNDT (Débitos Trabalhistas)</SelectItem>
                <SelectItem value="Certificado digital">Certificado digital</SelectItem>
                <SelectItem value="Outro">Outro documento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Título / Descrição Personalizada
            </Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Certidão Conjunta Receita Federal & PGFN"
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Data de Emissão</Label>
              <Input
                type="date"
                value={dataEmissao}
                onChange={(e) => setDataEmissao(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Data de Validade</Label>
              <Input
                type="date"
                value={dataValidade}
                onChange={(e) => setDataValidade(e.target.value)}
                className="h-9 text-xs"
              />
              <span className="text-[10px] text-slate-400">Deixe em branco se indeterminado</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Anexo do Arquivo (PDF ou Imagem)
            </Label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => e.target.files && setArquivo(e.target.files[0])}
              className="text-xs text-slate-600 block w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-slate-300 file:text-xs file:bg-slate-50"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Observações de Conferência
            </Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Autenticidade conferida no portal, número de controle..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-3 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              {loading ? 'Salvando...' : 'Salvar Documento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Modal Nova Nota Fiscal
// ============================================================================
export const ModalNovaNotaFiscal: React.FC<{
  open: boolean
  onOpenChange: (open: boolean) => void
  prestador: PrestadorPJ
  contratos: ContratoPJ[]
  onSuccess: () => void
}> = ({ open, onOpenChange, prestador, contratos, onSuccess }) => {
  const { toast } = useToast()
  const [contratoId, setContratoId] = useState(contratos[0]?.id || '')
  const [numeroNf, setNumeroNf] = useState('')
  const [competencia, setCompetencia] = useState(
    `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
  )
  const [valor, setValor] = useState(contratos[0]?.valor ? String(contratos[0].valor) : '')
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().substring(0, 10))
  const [dataVencimento, setDataVencimento] = useState('')
  const [status, setStatus] = useState<NotaFiscalPJ['status']>('Recebida')
  const [motivoGlosa, setMotivoGlosa] = useState('')
  const [observacao, setObservacao] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!numeroNf || !competencia || !valor || !dataEmissao || !dataVencimento) {
      toast({ title: 'Preencha os campos obrigatórios da NF', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      await prestadoresService.criarNotaFiscal(
        {
          prestador: prestador.id,
          contrato: contratoId || undefined,
          numero_nf: numeroNf.trim(),
          competencia: competencia.trim(),
          valor: Number(valor),
          data_emissao: `${dataEmissao} 00:00:00.000Z`,
          data_vencimento: `${dataVencimento} 00:00:00.000Z`,
          status,
          motivo_glosa: status === 'Glosada' ? motivoGlosa : undefined,
          observacao: observacao || undefined,
        },
        arquivo || undefined,
      )
      toast({ title: 'Nota fiscal lançada com sucesso!' })
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao lançar nota fiscal',
        description: err instanceof Error ? err.message : 'Falha.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6 bg-white border border-slate-200">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Lançamento de Nota Fiscal PJ
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Acompanhe o ciclo de liquidação de faturas de serviços prestados.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Contrato Vinculado</Label>
              <Select
                value={contratoId}
                onValueChange={(v) => {
                  setContratoId(v)
                  const ct = contratos.find((c) => c.id === v)
                  if (ct && ct.valor) setValor(String(ct.valor))
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem_contrato">Avulso / Sem contrato</SelectItem>
                  {contratos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.titulo} (R$ {c.valor.toLocaleString('pt-BR')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Número da NF *</Label>
              <Input
                value={numeroNf}
                onChange={(e) => setNumeroNf(e.target.value)}
                placeholder="Ex: NF-2049"
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Competência (MM/AAAA) *
              </Label>
              <Input
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                placeholder="10/2026"
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Valor da NF (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0.00"
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Status da NF</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Recebida">Recebida</SelectItem>
                  <SelectItem value="Em conferência">Em conferência</SelectItem>
                  <SelectItem value="Aprovada para pagamento">Aprovada para pagamento</SelectItem>
                  <SelectItem value="Paga">Paga</SelectItem>
                  <SelectItem value="Atrasada">Atrasada</SelectItem>
                  <SelectItem value="Glosada">Glosada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Data de Emissão *</Label>
              <Input
                type="date"
                value={dataEmissao}
                onChange={(e) => setDataEmissao(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Data de Vencimento do Pagamento *
              </Label>
              <Input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {status === 'Glosada' && (
            <div className="space-y-1 bg-red-50 p-2.5 rounded border border-red-200">
              <Label className="text-xs font-semibold text-red-800">
                Motivo da Glosa / Rejeição
              </Label>
              <Textarea
                value={motivoGlosa}
                onChange={(e) => setMotivoGlosa(e.target.value)}
                placeholder="Descreva a divergência de horas, valor incorreto ou serviço não homologado..."
                rows={2}
                className="text-xs bg-white resize-none"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Anexo do Arquivo (PDF / XML)
            </Label>
            <input
              type="file"
              accept=".pdf,.xml"
              onChange={(e) => e.target.files && setArquivo(e.target.files[0])}
              className="text-xs text-slate-600 block w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-slate-300 file:text-xs file:bg-slate-50"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Observações Internas</Label>
            <Input
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Número de protocolo financeiro, aprovador da área..."
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="pt-3 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
            >
              {loading ? 'Salvando...' : 'Lançar Nota Fiscal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Modal Nova Avaliação de Desempenho
// ============================================================================
export const ModalNovaAvaliacao: React.FC<{
  open: boolean
  onOpenChange: (open: boolean) => void
  prestador: PrestadorPJ
  contratos: ContratoPJ[]
  onSuccess: () => void
}> = ({ open, onOpenChange, prestador, contratos, onSuccess }) => {
  const { toast } = useToast()
  const [contratoId, setContratoId] = useState(contratos[0]?.id || '')
  const [periodo, setPeriodo] = useState('3º Trimestre/2026')
  const [qualidade, setQualidade] = useState<number>(9)
  const [prazo, setPrazo] = useState<number>(9)
  const [comunicacao, setComunicacao] = useState<number>(9)
  const [aderencia, setAderencia] = useState<number>(9)
  const [recomendacao, setRecomendacao] = useState<
    'Continuar' | 'Renovar com ressalvas' | 'Não renovar'
  >('Continuar')
  const [comentario, setComentario] = useState('')
  const [pontosFortes, setPontosFortes] = useState('')
  const [pontosMelhoria, setPontosMelhoria] = useState('')
  const [loading, setLoading] = useState(false)

  const mediaAtual = Number(((qualidade + prazo + comunicacao + aderencia) / 4).toFixed(1))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await prestadoresService.criarAvaliacao({
        prestador: prestador.id,
        contrato: contratoId || undefined,
        avaliador: pb.authStore.model?.id || undefined,
        avaliador_nome: pb.authStore.model?.name || 'Gestor RH',
        periodo_avaliado: periodo,
        nota_qualidade_tecnica: qualidade,
        nota_prazo: prazo,
        nota_comunicacao: comunicacao,
        nota_aderencia_cultural: aderencia,
        recomendacao,
        comentario: comentario || undefined,
        pontos_fortes: pontosFortes || undefined,
        pontos_melhoria: pontosMelhoria || undefined,
      })
      toast({ title: 'Avaliação de desempenho registrada com sucesso!' })
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao registrar avaliação',
        description: err instanceof Error ? err.message : 'Falha.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6 bg-white border border-slate-200">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Star className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Avaliação de Desempenho do Prestador
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Avalie os critérios técnicos, pontualidade e recomendação de continuidade.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Contrato em Avaliação</Label>
              <Select value={contratoId} onValueChange={setContratoId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o contrato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Prestação Geral (Sem contrato específico)</SelectItem>
                  {contratos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Período Avaliado *</Label>
              <Input
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                placeholder="Ex: 3º Trimestre/2026 ou 09/2026"
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Sliders de Notas */}
          <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Notas por Critério (0 a 10)</span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-extrabold text-xs">
                <Star className="w-3.5 h-3.5 fill-purple-700" />
                <span>Média: {mediaAtual}/10</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Qualidade Técnica da Entrega</span>
                <span className="font-bold text-purple-700">{qualidade}/10</span>
              </div>
              <Slider
                value={[qualidade]}
                min={0}
                max={10}
                step={0.5}
                onValueChange={(val) => setQualidade(val[0])}
                className="py-1"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Cumprimento de Prazos & SLAs</span>
                <span className="font-bold text-purple-700">{prazo}/10</span>
              </div>
              <Slider
                value={[prazo]}
                min={0}
                max={10}
                step={0.5}
                onValueChange={(val) => setPrazo(val[0])}
                className="py-1"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Comunicação & Transparência</span>
                <span className="font-bold text-purple-700">{comunicacao}/10</span>
              </div>
              <Slider
                value={[comunicacao]}
                min={0}
                max={10}
                step={0.5}
                onValueChange={(val) => setComunicacao(val[0])}
                className="py-1"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Aderência Cultural & Postura Profissional</span>
                <span className="font-bold text-purple-700">{aderencia}/10</span>
              </div>
              <Slider
                value={[aderencia]}
                min={0}
                max={10}
                step={0.5}
                onValueChange={(val) => setAderencia(val[0])}
                className="py-1"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Recomendação Estratégica *
            </Label>
            <Select value={recomendacao} onValueChange={(v) => setRecomendacao(v as any)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Continuar">
                  Continuar (Desempenho excelente/atende pleno)
                </SelectItem>
                <SelectItem value="Renovar com ressalvas">
                  Renovar com ressalvas (Ajustar pontos de atenção)
                </SelectItem>
                <SelectItem value="Não renovar">
                  Não renovar (Encerrar na vigência final)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Parecer Executivo da Avaliação
            </Label>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Síntese da colaboração, entregas de destaque e impacto nos resultados..."
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Pontos Fortes</Label>
              <Input
                value={pontosFortes}
                onChange={(e) => setPontosFortes(e.target.value)}
                placeholder="Ex: Proatividade, domínio em DevOps..."
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Pontos a Desenvolver</Label>
              <Input
                value={pontosMelhoria}
                onChange={(e) => setPontosMelhoria(e.target.value)}
                placeholder="Ex: Prazos de documentação..."
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
            >
              {loading ? 'Salvando...' : 'Registrar Avaliação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

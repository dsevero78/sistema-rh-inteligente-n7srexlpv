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
import { useToast } from '@/hooks/use-toast'
import {
  prestadoresService,
  formatarCNPJ,
  validarCNPJ,
  PrestadorPJ,
  HORAS_MES_PADRAO,
  calcularValorHoraPor160,
} from '@/services/prestadoresPj'
import { Building2, UploadCloud, AlertCircle, DollarSign, Calculator } from 'lucide-react'

interface ModalNovoPrestadorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prestadorParaEditar?: PrestadorPJ | null
  onSuccess: () => void
}

export const ModalNovoPrestador: React.FC<ModalNovoPrestadorProps> = ({
  open,
  onOpenChange,
  prestadorParaEditar,
  onSuccess,
}) => {
  const { toast } = useToast()
  const isEditing = !!prestadorParaEditar

  const [razaoSocial, setRazaoSocial] = useState(prestadorParaEditar?.razao_social || '')
  const [nomeFantasia, setNomeFantasia] = useState(prestadorParaEditar?.nome_fantasia || '')
  const [cnpj, setCnpj] = useState(prestadorParaEditar?.cnpj || '')
  const [areaAtuacao, setAreaAtuacao] = useState(prestadorParaEditar?.area_atuacao || '')
  const [contatoNome, setContatoNome] = useState(prestadorParaEditar?.contato_nome || '')
  const [contatoEmail, setContatoEmail] = useState(prestadorParaEditar?.contato_email || '')
  const [contatoTelefone, setContatoTelefone] = useState(
    prestadorParaEditar?.contato_telefone || '',
  )
  const [endereco, setEndereco] = useState(prestadorParaEditar?.endereco || '')
  const [banco, setBanco] = useState(prestadorParaEditar?.banco || '')
  const [dadosBancarios, setDadosBancarios] = useState(prestadorParaEditar?.dados_bancarios || '')
  const [regimeTributario, setRegimeTributario] = useState<string>(
    prestadorParaEditar?.regime_tributario || 'Simples Nacional',
  )
  const [status, setStatus] = useState<'Ativo' | 'Em renovação' | 'Pausado' | 'Encerrado'>(
    prestadorParaEditar?.status || 'Ativo',
  )
  const [dataInicio, setDataInicio] = useState(
    prestadorParaEditar?.data_inicio_parceria
      ? prestadorParaEditar.data_inicio_parceria.substring(0, 10)
      : new Date().toISOString().substring(0, 10),
  )
  const [valorMensalAtual, setValorMensalAtual] = useState<string>(
    prestadorParaEditar?.valor_mensal_atual !== undefined &&
      prestadorParaEditar.valor_mensal_atual !== null
      ? String(prestadorParaEditar.valor_mensal_atual)
      : '',
  )
  const [observacoes, setObservacoes] = useState(prestadorParaEditar?.observacoes || '')
  const [arquivoContratoSocial, setArquivoContratoSocial] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [cnpjInvalido, setCnpjInvalido] = useState(false)

  React.useEffect(() => {
    if (prestadorParaEditar) {
      setRazaoSocial(prestadorParaEditar.razao_social)
      setNomeFantasia(prestadorParaEditar.nome_fantasia || '')
      setCnpj(prestadorParaEditar.cnpj)
      setAreaAtuacao(prestadorParaEditar.area_atuacao)
      setContatoNome(prestadorParaEditar.contato_nome || '')
      setContatoEmail(prestadorParaEditar.contato_email || '')
      setContatoTelefone(prestadorParaEditar.contato_telefone || '')
      setEndereco(prestadorParaEditar.endereco || '')
      setBanco(prestadorParaEditar.banco || '')
      setDadosBancarios(prestadorParaEditar.dados_bancarios || '')
      setRegimeTributario(prestadorParaEditar.regime_tributario || 'Simples Nacional')
      setStatus(prestadorParaEditar.status || 'Ativo')
      setDataInicio(
        prestadorParaEditar.data_inicio_parceria
          ? prestadorParaEditar.data_inicio_parceria.substring(0, 10)
          : '',
      )
      setValorMensalAtual(
        prestadorParaEditar.valor_mensal_atual !== undefined &&
          prestadorParaEditar.valor_mensal_atual !== null
          ? String(prestadorParaEditar.valor_mensal_atual)
          : '',
      )
      setObservacoes(prestadorParaEditar.observacoes || '')
      setCnpjInvalido(false)
    } else {
      setRazaoSocial('')
      setNomeFantasia('')
      setCnpj('')
      setAreaAtuacao('')
      setContatoNome('')
      setContatoEmail('')
      setContatoTelefone('')
      setEndereco('')
      setBanco('')
      setDadosBancarios('')
      setRegimeTributario('Simples Nacional')
      setStatus('Ativo')
      setDataInicio(new Date().toISOString().substring(0, 10))
      setValorMensalAtual('')
      setObservacoes('')
      setArquivoContratoSocial(null)
      setCnpjInvalido(false)
    }
  }, [prestadorParaEditar, open])

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarCNPJ(e.target.value)
    setCnpj(formatted)
    if (formatted.length === 18) {
      setCnpjInvalido(!validarCNPJ(formatted))
    } else {
      setCnpjInvalido(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!razaoSocial.trim()) {
      toast({
        title: 'Razão social obrigatória',
        description: 'Informe a razão social da pessoa jurídica.',
        variant: 'destructive',
      })
      return
    }

    if (!validarCNPJ(cnpj)) {
      setCnpjInvalido(true)
      toast({
        title: 'CNPJ inválido',
        description: 'Por favor, insira um CNPJ com formato e dígitos verificadores válidos.',
        variant: 'destructive',
      })
      return
    }

    if (!areaAtuacao.trim()) {
      toast({
        title: 'Área de atuação obrigatória',
        description: 'Defina o serviço ou área principal do prestador.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const numValorMensal = valorMensalAtual !== '' ? parseFloat(valorMensalAtual) : undefined
      const payload: Partial<PrestadorPJ> = {
        razao_social: razaoSocial.trim(),
        nome_fantasia: nomeFantasia.trim() || undefined,
        cnpj: cnpj.trim(),
        area_atuacao: areaAtuacao.trim(),
        contato_nome: contatoNome.trim() || undefined,
        contato_email: contatoEmail.trim() || undefined,
        contato_telefone: contatoTelefone.trim() || undefined,
        endereco: endereco.trim() || undefined,
        banco: banco.trim() || undefined,
        dados_bancarios: dadosBancarios.trim() || undefined,
        regime_tributario: regimeTributario as any,
        status,
        valor_mensal_atual: !isNaN(numValorMensal as number) ? (numValorMensal as number) : 0,
        data_inicio_parceria: dataInicio ? `${dataInicio} 00:00:00.000Z` : undefined,
        observacoes: observacoes.trim() || undefined,
      }

      if (isEditing && prestadorParaEditar) {
        await prestadoresService.atualizarPrestador(
          prestadorParaEditar.id,
          payload,
          arquivoContratoSocial || undefined,
        )
        toast({
          title: 'Prestador atualizado com sucesso!',
          description: `${razaoSocial} foi atualizado no cadastro de parceiros PJ.`,
        })
      } else {
        await prestadoresService.criarPrestador(payload, arquivoContratoSocial || undefined)
        toast({
          title: 'Prestador PJ cadastrado!',
          description: `${razaoSocial} agora faz parte da gestão corporativa.`,
        })
      }

      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar prestador PJ',
        description:
          err instanceof Error
            ? err.message
            : 'Verifique se o CNPJ já está cadastrado ou revise os campos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-6 bg-white border border-slate-200">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg font-bold text-slate-900">
                {isEditing ? 'Editar Prestador de Serviços PJ' : 'Novo Prestador de Serviços PJ'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Cadastre fornecedores, parceiros contratados e consultorias com dados fiscais e
                bancários.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Seção 1: Identificação da Empresa */}
          <div className="space-y-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 border-b pb-1">
              <span>1. Identificação Empresarial</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="razaoSocial" className="text-xs font-semibold text-slate-700">
                  Razão Social <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="razaoSocial"
                  placeholder="Ex: Nexus Cloud Soluções em Tecnologia Ltda"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="nomeFantasia" className="text-xs font-semibold text-slate-700">
                  Nome Fantasia (marca pública)
                </Label>
                <Input
                  id="nomeFantasia"
                  placeholder="Ex: Nexus Cloud & DevOps"
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cnpj" className="text-xs font-semibold text-slate-700">
                  CNPJ <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  className={`h-9 text-xs font-mono ${cnpjInvalido ? 'border-red-500 focus-visible:ring-red-400 bg-red-50/20' : ''}`}
                  required
                />
                {cnpjInvalido && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1 mt-0.5">
                    <AlertCircle className="w-3 h-3" />
                    CNPJ inválido (dígitos não conferem)
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="areaAtuacao" className="text-xs font-semibold text-slate-700">
                  Área de Atuação / Serviço <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="areaAtuacao"
                  placeholder="Ex: Engenharia de Software & Cloud"
                  value={areaAtuacao}
                  onChange={(e) => setAreaAtuacao(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="status" className="text-xs font-semibold text-slate-700">
                  Status Inicial
                </Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Em renovação">Em renovação</SelectItem>
                    <SelectItem value="Pausado">Pausado</SelectItem>
                    <SelectItem value="Encerrado">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção 2: Contato do Responsável */}
          <div className="space-y-3 pt-2">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-600 border-b pb-1">
              2. Contato & Localização
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="contatoNome" className="text-xs font-semibold text-slate-700">
                  Nome do Responsável
                </Label>
                <Input
                  id="contatoNome"
                  placeholder="Ex: Renato Albuquerque"
                  value={contatoNome}
                  onChange={(e) => setContatoNome(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="contatoEmail" className="text-xs font-semibold text-slate-700">
                  E-mail Comercial
                </Label>
                <Input
                  id="contatoEmail"
                  type="email"
                  placeholder="contato@empresa.com"
                  value={contatoEmail}
                  onChange={(e) => setContatoEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="contatoTelefone" className="text-xs font-semibold text-slate-700">
                  Telefone / WhatsApp
                </Label>
                <Input
                  id="contatoTelefone"
                  placeholder="(11) 98765-4321"
                  value={contatoTelefone}
                  onChange={(e) => setContatoTelefone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="endereco" className="text-xs font-semibold text-slate-700">
                Endereço Comercial Completo
              </Label>
              <Input
                id="endereco"
                placeholder="Ex: Av. Paulista, 1000, Sala 501, Bela Vista, São Paulo - SP"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Seção 3: Dados Bancários & Fiscais e Remuneração Mensal */}
          <div className="space-y-3 pt-2">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-600 border-b pb-1">
              3. Dados Fiscais, Faturamento & Valor Mensal
            </h3>

            {/* Configuração de Valor Mensal Atual e cálculo do Valor/Hora (160h) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Valor Mensal da Prestação de Serviços</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  <Calculator className="w-3 h-3 text-blue-500" />
                  <span>Base {HORAS_MES_PADRAO}h/mês</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                <div className="space-y-1">
                  <Label
                    htmlFor="valorMensalAtual"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Valor Mensal Atual (R$)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-medium text-slate-500">
                      R$
                    </span>
                    <Input
                      id="valorMensalAtual"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={valorMensalAtual}
                      onChange={(e) => setValorMensalAtual(e.target.value)}
                      className="h-9 pl-9 text-xs font-semibold text-slate-900"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Alimenta o KPI no topo da tela e o card do prestador.
                  </p>
                </div>

                <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Valor-Hora Recalculado (÷ 160h)
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-base font-extrabold text-blue-700">
                      R${' '}
                      {calcularValorHoraPor160(parseFloat(valorMensalAtual) || 0).toLocaleString(
                        'pt-BR',
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                      )}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">/hora</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Cálculo automático: R${' '}
                    {(parseFloat(valorMensalAtual) || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    ÷ {HORAS_MES_PADRAO}h
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="regimeTributario" className="text-xs font-semibold text-slate-700">
                  Regime Tributário
                </Label>
                <Select value={regimeTributario} onValueChange={setRegimeTributario}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o regime" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                    <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
                    <SelectItem value="Lucro Real">Lucro Real</SelectItem>
                    <SelectItem value="MEI">MEI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="banco" className="text-xs font-semibold text-slate-700">
                  Instituição Bancária
                </Label>
                <Input
                  id="banco"
                  placeholder="Ex: Banco Itaú (341)"
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="dataInicio" className="text-xs font-semibold text-slate-700">
                  Data de Início da Parceria
                </Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="dadosBancarios" className="text-xs font-semibold text-slate-700">
                Dados Bancários & Chave PIX para Liquidação de NFs
              </Label>
              <Input
                id="dadosBancarios"
                placeholder="Ex: Ag: 0001 | C/C: 12345-6 | Chave PIX: financeiro@parceiro.com.br"
                value={dadosBancarios}
                onChange={(e) => setDadosBancarios(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Seção 4: Documento Anexo e Observações */}
          <div className="space-y-3 pt-2">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-600 border-b pb-1">
              4. Contrato Social & Observações
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Contrato Social / Cartão CNPJ (PDF ou Imagem)
                </Label>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <UploadCloud className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <input
                    type="file"
                    id="contratoSocialUpload"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setArquivoContratoSocial(e.target.files[0])
                      }
                    }}
                  />
                  <label
                    htmlFor="contratoSocialUpload"
                    className="text-xs text-blue-600 font-semibold cursor-pointer hover:underline block"
                  >
                    {arquivoContratoSocial
                      ? arquivoContratoSocial.name
                      : 'Clique para selecionar arquivo (máx 10MB)'}
                  </label>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Formatos suportados: PDF, PNG, JPG
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="observacoes" className="text-xs font-semibold text-slate-700">
                  Observações & Histórico Interno
                </Label>
                <Textarea
                  id="observacoes"
                  rows={3}
                  placeholder="Anotações sobre alinhamento de escopo, acordos de SLA ou particularidades..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 shadow-xs"
            >
              {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Prestador PJ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

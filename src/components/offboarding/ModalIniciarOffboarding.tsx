import { useState } from 'react'
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
  offboardingService,
  ModalidadeOffboarding,
  TipoDesligamento,
  TipoDesligamentoClt,
  TipoDesligamentoPj,
  TipoAvisoPrevio,
} from '@/services/offboardingService'
import { UserMinus, AlertTriangle, Calculator, Calendar } from 'lucide-react'

interface ModalIniciarOffboardingProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pessoaId: string
  pessoaNome: string
  modalidadePadrao?: 'CLT' | 'PJ'
  empresaIdPadrao?: string
  salarioOuRemuneracaoPadrao?: number
  dataAdmissaoPadrao?: string
  onSucesso?: () => void
}

export function ModalIniciarOffboarding({
  open,
  onOpenChange,
  pessoaId,
  pessoaNome,
  modalidadePadrao = 'CLT',
  empresaIdPadrao,
  salarioOuRemuneracaoPadrao = 5000,
  dataAdmissaoPadrao,
  onSucesso,
}: ModalIniciarOffboardingProps) {
  const { toast } = useToast()
  const [salvando, setSalvando] = useState(false)

  const [modalidade, setModalidade] = useState<ModalidadeOffboarding>(modalidadePadrao)
  const [tipoDesligamento, setTipoDesligamento] = useState<TipoDesligamento>(
    modalidadePadrao === 'CLT' ? 'Demissão sem justa causa' : 'Rescisão antecipada PJ',
  )
  const [dataAviso, setDataAviso] = useState<string>(new Date().toISOString().split('T')[0])
  const [dataDesligamento, setDataDesligamento] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })
  const [avisoPrevioTipo, setAvisoPrevioTipo] = useState<TipoAvisoPrevio>(
    modalidadePadrao === 'CLT' ? 'Indenizado' : 'Não aplicável',
  )
  const [diasAviso, setDiasAviso] = useState<number>(30)
  const [responsavelNome, setResponsavelNome] = useState('Gente & Gestão (RH)')
  const [motivoDetalhado, setMotivoDetalhado] = useState('')
  const [remuneracaoBase, setRemuneracaoBase] = useState<number>(salarioOuRemuneracaoPadrao || 5000)

  const handleModalidadeChange = (val: ModalidadeOffboarding) => {
    setModalidade(val)
    if (val === 'CLT') {
      setTipoDesligamento('Demissão sem justa causa')
      setAvisoPrevioTipo('Indenizado')
      setDiasAviso(30)
    } else {
      setTipoDesligamento('Rescisão antecipada PJ')
      setAvisoPrevioTipo('Não aplicável')
      setDiasAviso(0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dataAviso || !dataDesligamento) {
      toast({
        title: 'Datas obrigatórias',
        description: 'Informe a data do aviso e a data do último dia/desligamento.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSalvando(true)
      await offboardingService.iniciar({
        pessoaId,
        modalidade,
        tipoDesligamento,
        dataAviso,
        dataDesligamento,
        avisoPrevioTipo,
        diasAvisoPrevio: modalidade === 'CLT' ? diasAviso : 0,
        responsavelNome,
        empresaId: empresaIdPadrao,
        motivoDetalhado,
        salarioBaseOuContrato: remuneracaoBase,
        dataAdmissaoOuInicio: dataAdmissaoPadrao,
      })

      toast({
        title: 'Offboarding iniciado com sucesso',
        description: `Processo de desligamento de ${pessoaNome} foi registrado com checklist e cálculo inicial gerados.`,
      })

      onOpenChange(false)
      if (onSucesso) onSucesso()
    } catch (err: any) {
      toast({
        title: 'Erro ao iniciar desligamento',
        description: err.message || 'Verifique os dados informados.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-100 text-red-700 rounded-lg">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Iniciar Processo de Desligamento</DialogTitle>
              <DialogDescription>
                Registro de offboarding com memória de cálculo rescisório e checklist para{' '}
                <strong className="text-foreground">{pessoaNome}</strong>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Modalidade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Modalidade de Contratação
              </Label>
              <Select
                value={modalidade}
                onValueChange={(v) => handleModalidadeChange(v as ModalidadeOffboarding)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLT">CLT (Consolidação das Leis do Trabalho)</SelectItem>
                  <SelectItem value="PJ">PJ (Pessoa Jurídica / Prestador)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Tipo de Desligamento
              </Label>
              <Select
                value={tipoDesligamento}
                onValueChange={(v) => setTipoDesligamento(v as TipoDesligamento)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modalidade === 'CLT' ? (
                    <>
                      <SelectItem value="Demissão sem justa causa">
                        Demissão sem justa causa (Iniciativa do empregador)
                      </SelectItem>
                      <SelectItem value="Pedido de demissão">
                        Pedido de demissão (Iniciativa do colaborador)
                      </SelectItem>
                      <SelectItem value="Demissão por justa causa">
                        Demissão por justa causa (Falta grave)
                      </SelectItem>
                      <SelectItem value="Acordo mútuo (Art. 484-A CLT)">
                        Acordo mútuo consensual (Art. 484-A CLT)
                      </SelectItem>
                      <SelectItem value="Término de contrato de experiência">
                        Término de experiência (Contrato determinado)
                      </SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Rescisão antecipada PJ">
                        Rescisão antecipada do contrato PJ
                      </SelectItem>
                      <SelectItem value="Término de contrato PJ">
                        Término do prazo de vigência PJ
                      </SelectItem>
                      <SelectItem value="Não renovação PJ">
                        Não renovação de contrato de prestação
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Data do Aviso / Notificação
              </Label>
              <Input
                type="date"
                className="mt-1"
                value={dataAviso}
                onChange={(e) => setDataAviso(e.target.value)}
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-500" />
                Data de Desligamento / Último Dia
              </Label>
              <Input
                type="date"
                className="mt-1"
                value={dataDesligamento}
                onChange={(e) => setDataDesligamento(e.target.value)}
                required
              />
            </div>
          </div>

          {/* CLT Aviso Prévio */}
          {modalidade === 'CLT' && (
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Aviso Prévio</Label>
                <Select
                  value={avisoPrevioTipo}
                  onValueChange={(v) => setAvisoPrevioTipo(v as TipoAvisoPrevio)}
                >
                  <SelectTrigger className="mt-1 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Indenizado">Indenizado (pago ou descontado)</SelectItem>
                    <SelectItem value="Trabalhado">
                      Trabalhado (cumprimento presencial/remoto)
                    </SelectItem>
                    <SelectItem value="Dispensado">Dispensado pelo empregador</SelectItem>
                    <SelectItem value="Não aplicável">Não aplicável (ex.: justa causa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Dias de Aviso Prévio</Label>
                <Input
                  type="number"
                  min={0}
                  max={90}
                  className="mt-1 bg-white"
                  value={diasAviso}
                  onChange={(e) => setDiasAviso(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* Remuneração Base para cálculo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" />
                {modalidade === 'CLT' ? 'Salário Base (R$)' : 'Valor Mensal Contratado (R$)'}
              </Label>
              <Input
                type="number"
                step="0.01"
                className="mt-1"
                value={remuneracaoBase}
                onChange={(e) => setRemuneracaoBase(Number(e.target.value))}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Responsável pelo Processo (RH/Gestor)
              </Label>
              <Input
                type="text"
                className="mt-1"
                value={responsavelNome}
                onChange={(e) => setResponsavelNome(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Motivo do Desligamento e Observações Iniciais
            </Label>
            <Textarea
              className="mt-1 text-sm resize-none"
              rows={3}
              placeholder="Descreva o contexto, alinhamento de transição de tarefas e justificativa do encerramento..."
              value={motivoDetalhado}
              onChange={(e) => setMotivoDetalhado(e.target.value)}
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Importante:</strong> Nenhum dado da pessoa ou vínculo será apagado. O
              offboarding gerará pendências no Meu Dia, acionará o checklist obrigatório e
              atualizará o Financeiro por BU preservando o histórico vitalício.
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={salvando}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={salvando} className="gap-2">
              <UserMinus className="w-4 h-4" />
              {salvando ? 'Iniciando...' : 'Iniciar Offboarding'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

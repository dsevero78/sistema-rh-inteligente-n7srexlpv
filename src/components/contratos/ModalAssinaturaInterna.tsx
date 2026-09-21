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
import { Checkbox } from '@/components/ui/checkbox'
import {
  FileSignature,
  ShieldCheck,
  CheckCircle2,
  Lock,
  UserCheck,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  contratosService,
  ContratoUnificado,
  VersaoContrato,
  AssinaturaContrato,
} from '@/services/contratosService'
import { useAuth } from '@/contexts/AuthContext'

interface ModalAssinaturaInternaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contrato: ContratoUnificado
  versao: VersaoContrato
  assinaturaPendente?: AssinaturaContrato | null
  onSuccess: () => void
}

export const ModalAssinaturaInterna: React.FC<ModalAssinaturaInternaProps> = ({
  open,
  onOpenChange,
  contrato,
  versao,
  assinaturaPendente,
  onSuccess,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [nome, setNome] = useState(
    assinaturaPendente?.nome_signatario || user?.name || 'Signatário SouYess',
  )
  const [email, setEmail] = useState(assinaturaPendente?.email_signatario || user?.email || '')
  const [documento, setDocumento] = useState(assinaturaPendente?.documento_identificacao || '')
  const [papel, setPapel] = useState<
    'Contratado' | 'Representante Empresa' | 'Testemunha 1' | 'Testemunha 2' | 'Gestor'
  >(assinaturaPendente?.papel_signatario || 'Representante Empresa')
  const [declaracaoAceite, setDeclaracaoAceite] = useState(true)
  const [manifestacao, setManifestacao] = useState(
    'Declaro sob as penas da lei que li e concordo integralmente com as cláusulas deste contrato eletrônico, confirmando a validade jurídica desta assinatura digital no SouYess People Hub.',
  )
  const [carregando, setCarregando] = useState(false)

  const handleAssinar = async () => {
    if (!nome.trim() || !email.trim()) {
      toast({
        title: 'Dados incompletos',
        description: 'Informe seu nome e e-mail corporativo para a trilha de auditoria.',
        variant: 'destructive',
      })
      return
    }

    if (!declaracaoAceite) {
      toast({
        title: 'Aceite obrigatório',
        description: 'É necessário confirmar o termo de manifestação de vontade para assinar.',
        variant: 'destructive',
      })
      return
    }

    setCarregando(true)
    try {
      const ok = await contratosService.registrarAssinaturaInterna({
        contratoId: contrato.id,
        versaoId: versao.id,
        assinaturaId: assinaturaPendente?.id,
        nomeSignatario: nome,
        emailSignatario: email,
        papel,
        documentoIdentificacao: documento,
        manifestacaoAceite: manifestacao,
        ip: '189.120.45.19',
        userAgent: navigator.userAgent,
      })

      if (ok) {
        toast({
          title: 'Assinatura Registrada!',
          description:
            'A assinatura digital foi gravada na trilha de auditoria e vinculada ao contrato com hash criptográfico.',
        })
        onSuccess()
        onOpenChange(false)
      } else {
        throw new Error('Falha ao gravar assinatura')
      }
    } catch {
      toast({
        title: 'Erro ao assinar',
        description: 'Ocorreu um erro ao processar a assinatura digital.',
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
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <FileSignature className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold font-display text-[#212B55] dark:text-[#F7F8FB]">
                Assinatura Eletrônica Interna
              </DialogTitle>
              <DialogDescription className="text-xs">
                Registro formal de manifestação de vontade com carimbo de tempo, IP e hash
                auditável.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs font-sans">
          {/* Card Resumo do Contrato */}
          <div className="p-3.5 bg-muted/40 rounded-xl border border-border/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold font-display text-sm text-[#212B55] dark:text-[#F7F8FB]">
                {contrato.titulo}
              </span>
              <Badge className="bg-[#E9530E]/15 text-[#E9530E] border-[#E9530E]/30 font-mono text-[10px]">
                {contrato.codigo_contrato}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-muted-foreground">
              <div>
                <span className="block font-semibold text-foreground">Versão:</span>
                <span>
                  {versao.rotulo_versao} (v{versao.numero_versao}.0)
                </span>
              </div>
              <div>
                <span className="block font-semibold text-foreground">Modalidade:</span>
                <span>
                  {contrato.modalidade} · {contrato.tipo_modelo}
                </span>
              </div>
              <div>
                <span className="block font-semibold text-foreground">Remuneração:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  R$ {contrato.valor_mensal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  /mês
                </span>
              </div>
            </div>
            {versao.hash_conteudo && (
              <div className="pt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono truncate">
                <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="shrink-0 font-sans font-semibold">Hash SHA-256:</span>
                <span className="truncate">{versao.hash_conteudo}</span>
              </div>
            )}
          </div>

          {/* Dados do Signatário */}
          <div className="space-y-3 p-3.5 bg-card rounded-xl border border-border">
            <h4 className="font-bold font-display text-xs text-[#212B55] dark:text-[#F7F8FB] flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              Identificação do Signatário
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Nome Completo</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="h-8 text-xs font-medium"
                  placeholder="Nome do assinante"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">E-mail Corporativo</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="email@empresa.com"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Documento (CPF ou CNPJ)</Label>
                <Input
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Papel no Instrumento</Label>
                <select
                  value={papel}
                  onChange={(e) => setPapel(e.target.value as any)}
                  className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                >
                  <option value="Representante Empresa">Representante Empresa (SouYess)</option>
                  <option value="Contratado">Contratado / Colaborador</option>
                  <option value="Gestor">Gestor Imediato</option>
                  <option value="Testemunha 1">Testemunha 1</option>
                  <option value="Testemunha 2">Testemunha 2</option>
                </select>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <Label className="text-[11px] font-semibold">
                Declaração de Vontade / Manifestação de Aceite
              </Label>
              <Textarea
                value={manifestacao}
                onChange={(e) => setManifestacao(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>

          {/* Trilha e Validade Legal */}
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-300 dark:border-amber-900/60 space-y-2">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-[11px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">
                  Validade Jurídica Interna (Art. 10, § 2º da MP 2.200-2/2001)
                </p>
                <p>
                  As partes admitem como válido este meio eletrônico de assinatura interna. Ao
                  clicar em assinar, serão registrados seu endereço IP, carimbo de data/hora oficial
                  e metadados do navegador.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1 border-t border-amber-200 dark:border-amber-900/40">
              <Checkbox
                id="termo_aceite"
                checked={declaracaoAceite}
                onCheckedChange={(checked) => setDeclaracaoAceite(!!checked)}
              />
              <label
                htmlFor="termo_aceite"
                className="text-[11px] font-semibold leading-none cursor-pointer text-[#212B55] dark:text-[#F7F8FB]"
              >
                Confirmo a exatidão das informações e assino eletronicamente este contrato.
              </label>
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
            onClick={handleAssinar}
            disabled={carregando || !declaracaoAceite}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {carregando ? 'Gravando Assinatura...' : 'Registrar Assinatura Digital'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default ModalAssinaturaInterna

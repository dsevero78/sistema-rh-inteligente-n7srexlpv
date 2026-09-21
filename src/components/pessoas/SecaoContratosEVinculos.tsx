import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText,
  FileSignature,
  FileCheck2,
  DollarSign,
  Calendar,
  Clock,
  Plus,
  Scale,
  Sparkles,
  ShieldCheck,
  Building2,
  Briefcase,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Receipt,
  HeartPulse,
} from 'lucide-react'
import {
  PessoaUnificada,
  VinculoPessoa,
  pessoasService,
  DocumentoPessoa,
} from '@/services/pessoasService'
import {
  PrestadorPJ,
  ContratoPJ,
  AditivoPJ,
  DocumentoPJ,
  NotaFiscalPJ,
  AvaliacaoPrestadorPJ,
  MarcoLifecyclePJ,
  prestadoresService,
  getAnexoUrl,
  HORAS_MES_PADRAO,
} from '@/services/prestadoresPj'
import { AbaAditivos } from '@/components/prestadores/AbaAditivos'
import { LifecycleJornadaPJ } from '@/components/prestadores/LifecycleJornadaPJ'
import {
  BannerDecisaoRenovacao,
  calcularDecisaoRenovacaoPrestador,
} from '@/components/prestadores/BannerDecisaoRenovacao'
import { DocumentViewerModal } from '@/components/prestadores/DocumentViewerModal'
import {
  ModalNovoContrato,
  ModalNovaNotaFiscal,
} from '@/components/prestadores/ModaisPrestadorSecundarios'
import { ModalNovoAditivo } from '@/components/prestadores/ModalNovoAditivo'
import { ModalFluxoJuridicoAditivo } from '@/components/prestadores/ModalFluxoJuridicoAditivo'
import { ModalNovoContratoTemplate } from '@/components/contratos/ModalNovoContratoTemplate'
import { ModalDetalhesContratoVersionado } from '@/components/contratos/ModalDetalhesContratoVersionado'
import { contratosService, ContratoUnificado } from '@/services/contratosService'
import { useToast } from '@/hooks/use-toast'

interface SecaoContratosEVinculosProps {
  pessoa: PessoaUnificada
  vinculos: VinculoPessoa[]
  prestadorPj?: PrestadorPJ | null
  contratosPj?: ContratoPJ[]
  aditivosPj?: AditivoPJ[]
  marcosLifecycle?: MarcoLifecyclePJ[]
  documentosCofre?: DocumentoPessoa[]
  onAtualizar: () => void
}

export const SecaoContratosEVinculos: React.FC<SecaoContratosEVinculosProps> = ({
  pessoa,
  vinculos,
  prestadorPj,
  contratosPj = [],
  aditivosPj = [],
  marcosLifecycle = [],
  documentosCofre = [],
  onAtualizar,
}) => {
  const { toast } = useToast()

  // Aba ativa interna
  const [subAba, setSubAba] = useState<string>('contratos_digitais')

  // Contratos Digitais e Versionamento da Pessoa
  const [contratosDigitais, setContratosDigitais] = useState<ContratoUnificado[]>([])
  const [contratoEmFoco, setContratoEmFoco] = useState<ContratoUnificado | null>(null)
  const [modalDetalhesContratoOpen, setModalDetalhesContratoOpen] = useState(false)
  const [modalNovoContratoTemplateOpen, setModalNovoContratoTemplateOpen] = useState(false)

  const carregarContratosDigitais = async () => {
    if (!pessoa.id) return
    const lista = await contratosService.listarContratos({ pessoaId: pessoa.id })
    setContratosDigitais(lista)
  }

  React.useEffect(() => {
    carregarContratosDigitais()
  }, [pessoa.id])

  // Modais de ações
  const [modalNovoContratoOpen, setModalNovoContratoOpen] = useState(false)
  const [modalNovoAditivoOpen, setModalNovoAditivoOpen] = useState(false)
  const [modalNovaNfOpen, setModalNovaNfOpen] = useState(false)
  const [modalJuridicoOpen, setModalJuridicoOpen] = useState(false)
  const [aditivoEmFoco, setAditivoEmFoco] = useState<AditivoPJ | null>(null)

  // Visualizador de documentos
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerUrl, setViewerUrl] = useState('')
  const [viewerTitle, setViewerTitle] = useState('')
  const [viewerFilename, setViewerFilename] = useState<string | undefined>(undefined)

  const abrirVisualizador = (record: any, filename?: string, title?: string) => {
    if (!filename) return
    const url = getAnexoUrl(record, filename)
    setViewerUrl(url)
    setViewerTitle(title || filename)
    setViewerFilename(filename)
    setViewerOpen(true)
  }

  // Cálculos de resumo
  const vinculosAtivos = vinculos.filter(
    (v) => v.situacao === 'Vigente' || v.situacao === 'Em integração' || v.situacao === 'Vencendo',
  )
  const vinculosEncerrados = vinculos.filter(
    (v) => v.situacao === 'Encerrado' || v.situacao === 'Rescindido',
  )
  const totalMensal = vinculosAtivos.reduce((acc, v) => acc + (v.valorMensal || 0), 0)

  // Informações de Renovação do Prestador PJ
  const decisaoRenovacao =
    prestadorPj && contratosPj.length > 0
      ? calcularDecisaoRenovacaoPrestador(prestadorPj, contratosPj, aditivosPj, [], [prestadorPj])
      : null

  // Documentos PJ / Certidões no Cofre da Pessoa
  const certidoesNoCofre = documentosCofre.filter(
    (d) =>
      d.tipo.includes('Certidão Fiscal') ||
      d.nome.toLowerCase().includes('cnd') ||
      d.nome.toLowerCase().includes('crf') ||
      d.nome.toLowerCase().includes('fgts') ||
      d.nome.toLowerCase().includes('cndt'),
  )

  // Documentos CLT no Cofre da Pessoa
  const docsCltNoCofre = documentosCofre.filter(
    (d) =>
      d.tipo.includes('Admissional') ||
      d.tipo.includes('CTPS') ||
      d.nome.toLowerCase().includes('aso') ||
      d.nome.toLowerCase().includes('esocial'),
  )

  return (
    <div className="space-y-6">
      {/* 1. Header do Módulo com Identidade SouYess */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-bold font-display text-[#212B55] dark:text-[#F7F8FB] flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-[#E9530E]" />
              Contratos & Vínculos de {pessoa.nome}
            </h3>
            <Badge className="bg-[#E9530E]/15 text-[#E9530E] border-[#E9530E]/30 font-display text-xs">
              {vinculos.length} vínculo(s) registrado(s)
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-sans">
            Ciclo vitalício unificado: contratos CLT, prestação de serviços PJ, aditivos com parecer
            jurídico, conformidade de certidões e histórico imutável.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => setModalNovoContratoTemplateOpen(true)}
            className="h-8 text-xs bg-[#E9530E] hover:bg-[#C5430A] text-white font-semibold shadow-xs gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Gerar Contrato do Template ({pessoa.modalidade})
          </Button>

          {prestadorPj && (
            <Button
              size="sm"
              onClick={() => setModalNovoAditivoOpen(true)}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Propor Aditivo
            </Button>
          )}
        </div>
      </div>

      {/* 2. Banner de Decisão de Renovação Inteligente (Janela de 60 dias para PJ) */}
      {decisaoRenovacao && prestadorPj && (
        <BannerDecisaoRenovacao
          prestador={prestadorPj}
          decisao={decisaoRenovacao}
          variante="completo"
          onAtualizar={onAtualizar}
        />
      )}

      {/* 3. Cards Resumo Financeiro e Operacional dos Vínculos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-sans block">
              Vínculos Ativos
            </span>
            <div className="text-xl font-black text-[#212B55] dark:text-[#F7F8FB] font-display mt-0.5">
              {vinculosAtivos.length} em vigor
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              {vinculosEncerrados.length} encerrado(s) no histórico
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-sans block">
              Custo Total Mensal
            </span>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-mono mt-0.5 tabular-nums">
              R$ {totalMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">
              Consolidação de vínculos ativos
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-sans block">
              Aditivos Contratuais
            </span>
            <div className="text-xl font-black text-indigo-700 dark:text-indigo-300 font-mono mt-0.5">
              {aditivosPj.length} aditivo(s)
            </div>
            <span className="text-[10px] text-muted-foreground font-sans">
              {aditivosPj.filter((a) => a.status === 'Vigente').length} vigente(s) ·{' '}
              {aditivosPj.filter((a) => a.status === 'Em análise pelo jurídico').length} no jurídico
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-[#E9530E] uppercase tracking-wider font-sans block flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Conformidade & Regras
            </span>
            <div className="text-xl font-black text-[#E9530E] font-mono mt-0.5">
              {prestadorPj ? 'PJ Ativo' : pessoa.modalidade}
            </div>
            <span className="text-[10px] text-muted-foreground font-sans truncate block">
              {prestadorPj ? 'CNDT / CRF / 60d / Parecer' : 'ASO / eSocial / CTPS'}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 4. Sub-Navegação por Abas para Todas as Regras */}
      <Tabs value={subAba} onValueChange={setSubAba} className="space-y-4">
        <TabsList className="bg-card border border-border/80 p-1 rounded-xl flex-wrap">
          <TabsTrigger
            value="contratos_digitais"
            className="text-xs font-bold gap-1.5 data-[state=active]:bg-[#FEF1EA] data-[state=active]:text-[#E9530E] dark:data-[state=active]:bg-[#212B55]"
          >
            <FileSignature className="w-3.5 h-3.5" />
            Contratos Digitais & Versões ({contratosDigitais.length})
          </TabsTrigger>

          <TabsTrigger
            value="todos"
            className="text-xs font-bold gap-1.5 data-[state=active]:bg-[#FEF1EA] data-[state=active]:text-[#E9530E] dark:data-[state=active]:bg-[#212B55]"
          >
            <Briefcase className="w-3.5 h-3.5" />
            Vínculos Gerais ({vinculos.length})
          </TabsTrigger>

          {prestadorPj && (
            <>
              <TabsTrigger
                value="aditivos"
                className="text-xs font-bold gap-1.5 data-[state=active]:bg-[#FEF1EA] data-[state=active]:text-[#E9530E] dark:data-[state=active]:bg-[#212B55]"
              >
                <FileSignature className="w-3.5 h-3.5" />
                Aditivos & Jurídico ({aditivosPj.length})
              </TabsTrigger>

              <TabsTrigger
                value="jornada"
                className="text-xs font-bold gap-1.5 data-[state=active]:bg-[#FEF1EA] data-[state=active]:text-[#E9530E] dark:data-[state=active]:bg-[#212B55]"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Jornada & Marcos PJ ({marcosLifecycle.length})
              </TabsTrigger>
            </>
          )}

          <TabsTrigger
            value="regras"
            className="text-xs font-bold gap-1.5 data-[state=active]:bg-[#FEF1EA] data-[state=active]:text-[#E9530E] dark:data-[state=active]:bg-[#212B55]"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Regras por Tipo de Vínculo
          </TabsTrigger>
        </TabsList>

        {/* ---------------- SUB-ABA 0: CONTRATOS DIGITAIS E VERSIONAMENTO FORMAL ---------------- */}
        <TabsContent value="contratos_digitais" className="space-y-4">
          {contratosDigitais.length === 0 ? (
            <div className="p-8 text-center bg-card rounded-xl border border-dashed border-border/80 space-y-2">
              <FileSignature className="w-8 h-8 text-muted-foreground mx-auto" />
              <h4 className="font-bold text-sm text-[#212B55] dark:text-[#F7F8FB] font-display">
                Nenhum contrato digital versionado ainda
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Gere um contrato jurídico a partir de nossos modelos pré-configurados (CLT ou PJ),
                com versionamento formal e assinatura interna com hash de auditoria.
              </p>
              <Button
                size="sm"
                onClick={() => setModalNovoContratoTemplateOpen(true)}
                className="mt-2 text-xs bg-[#E9530E] hover:bg-[#C5430A] text-white font-semibold gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Gerar Primeiro Contrato
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {contratosDigitais.map((ct) => (
                <Card
                  key={ct.id}
                  className={`border shadow-xs transition-all hover:border-[#E9530E]/50 ${
                    ct.status === 'Vigente'
                      ? 'border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-r from-card to-emerald-50/10'
                      : ct.status === 'Vencendo'
                        ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/10'
                        : ct.status === 'Em assinatura'
                          ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/10'
                          : 'border-border/80 bg-card'
                  }`}
                >
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-2.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Badge
                          className={`text-xs font-bold uppercase font-display ${
                            ct.modalidade === 'PJ'
                              ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {ct.modalidade}
                        </Badge>
                        <h4 className="font-bold text-sm sm:text-base text-[#212B55] dark:text-[#F7F8FB] font-display">
                          {ct.titulo}
                        </h4>
                        <span className="text-xs font-mono text-muted-foreground">
                          ({ct.codigo_contrato})
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs font-semibold ${
                            ct.status === 'Vigente'
                              ? 'text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40'
                              : ct.status === 'Vencendo'
                                ? 'text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/40'
                                : ct.status === 'Em assinatura'
                                  ? 'text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-950/40'
                                  : 'text-slate-600 border-slate-300'
                          }`}
                        >
                          {ct.status}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          v{ct.versao_atual || 1}.0
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setContratoEmFoco(ct)
                            setModalDetalhesContratoOpen(true)
                          }}
                          className="h-7 text-xs font-semibold gap-1 text-[#212B55] dark:text-[#F7F8FB] border-border hover:bg-muted"
                        >
                          <FileText className="w-3 h-3 text-[#E9530E]" />
                          Ver Versões & Assinaturas
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
                      <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                          Remuneração Mensal
                        </span>
                        <span className="text-sm font-bold font-mono text-[#212B55] dark:text-[#F7F8FB]">
                          R${' '}
                          {ct.valor_mensal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          R$ {ct.valor_hora?.toFixed(2)}/h ({ct.horas_mensais_base || 160}h base)
                        </span>
                      </div>

                      <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                          Início da Vigência
                        </span>
                        <span className="text-sm font-semibold font-mono text-[#212B55] dark:text-[#F7F8FB]">
                          {ct.data_inicio
                            ? new Date(ct.data_inicio).toLocaleDateString('pt-BR')
                            : '—'}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          {ct.prazo_tipo || 'Prazo'}
                        </span>
                      </div>

                      <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                          Término / Renovação
                        </span>
                        <span className="text-sm font-semibold font-mono text-[#212B55] dark:text-[#F7F8FB]">
                          {ct.data_fim
                            ? new Date(ct.data_fim).toLocaleDateString('pt-BR')
                            : 'Indeterminado'}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Alerta com {ct.dias_antecedencia_alerta || 60} dias
                        </span>
                      </div>

                      <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                          Departamento & Cargo
                        </span>
                        <span className="text-xs font-semibold text-[#212B55] dark:text-[#F7F8FB] truncate block">
                          {ct.cargo_funcao || pessoa.cargo_funcao}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {ct.departamento || pessoa.departamento}
                        </span>
                      </div>
                    </div>

                    {ct.clausulas_especiais && (
                      <p className="text-xs text-muted-foreground italic bg-muted/20 p-2 rounded border border-border/40">
                        "{ct.clausulas_especiais}"
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------------- SUB-ABA 1: LISTA DE VÍNCULOS GERAIS ---------------- */}
        <TabsContent value="todos" className="space-y-4">
          <div className="space-y-3">
            {vinculos.map((vinc) => {
              const isPj = vinc.tipo === 'PJ'
              const aditivosDoContrato = aditivosPj.filter(
                (a) => a.contrato === vinc.origemId || vinc.origem === 'pessoas',
              )

              return (
                <Card
                  key={vinc.id}
                  className={`border shadow-xs transition-all ${
                    vinc.situacao === 'Vigente'
                      ? 'border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-r from-card to-emerald-50/10'
                      : vinc.situacao === 'Vencendo'
                        ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/10'
                        : 'border-border/80 bg-card'
                  }`}
                >
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-2.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Badge
                          className={`text-xs font-bold uppercase font-display ${
                            isPj
                              ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                          }`}
                        >
                          {vinc.tipo}
                        </Badge>
                        <h4 className="font-bold text-sm sm:text-base text-[#212B55] dark:text-[#F7F8FB] font-display">
                          {vinc.titulo}
                        </h4>
                        {vinc.numeroContrato && (
                          <span className="text-xs font-mono text-muted-foreground">
                            ({vinc.numeroContrato})
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-xs font-semibold ${
                            vinc.situacao === 'Vigente'
                              ? 'text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40'
                              : vinc.situacao === 'Vencendo'
                                ? 'text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/40'
                                : 'text-slate-600 border-slate-300'
                          }`}
                        >
                          {vinc.situacao}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPj && prestadorPj && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSubAba('aditivos')
                            }}
                            className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold gap-1"
                          >
                            <FileSignature className="w-3 h-3" />
                            Ver Aditivos ({aditivosDoContrato.length})
                          </Button>
                        )}
                        {vinc.contratoAssinadoAnexo && vinc.recordOriginal && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              abrirVisualizador(
                                vinc.recordOriginal,
                                vinc.contratoAssinadoAnexo,
                                `Contrato ${vinc.numeroContrato || vinc.titulo}`,
                              )
                            }
                            className="h-7 text-xs text-blue-600 hover:text-blue-800 gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Contrato Assinado
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Grade de valores e prazos */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
                      <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                          Valor Mensal
                        </span>
                        <span className="text-sm font-bold font-mono text-[#212B55] dark:text-[#F7F8FB]">
                          R${' '}
                          {vinc.valorMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          {vinc.tipoRemuneracao || 'Mensal'}
                        </span>
                      </div>

                      <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                          Valor / Hora (Base {vinc.horasMensaisBase}h)
                        </span>
                        <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
                          R$ {vinc.valorHora.toFixed(2)}/h
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          {vinc.horasMensaisBase}h mensais contratadas
                        </span>
                      </div>

                      <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                          Início da Vigência
                        </span>
                        <span className="text-sm font-semibold font-mono text-[#212B55] dark:text-[#F7F8FB]">
                          {vinc.dataInicio
                            ? new Date(vinc.dataInicio).toLocaleDateString('pt-BR')
                            : '—'}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          {vinc.prazoTipo || 'Prazo'}
                        </span>
                      </div>

                      <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                          Término / Renovação
                        </span>
                        <span className="text-sm font-semibold font-mono text-[#212B55] dark:text-[#F7F8FB]">
                          {vinc.dataFim
                            ? new Date(vinc.dataFim).toLocaleDateString('pt-BR')
                            : 'Indeterminado'}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          {vinc.dataFim ? 'Vencimento pactuado' : 'Sem prazo de término'}
                        </span>
                      </div>
                    </div>

                    {vinc.clausulasResumo && (
                      <p className="text-xs text-muted-foreground italic bg-muted/20 p-2 rounded border border-border/40">
                        "{vinc.clausulasResumo}"
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ---------------- SUB-ABA 2: ADITIVOS & FLUXO JURÍDICO (PJ) ---------------- */}
        {prestadorPj && (
          <TabsContent value="aditivos" className="space-y-4">
            <AbaAditivos
              prestador={prestadorPj}
              contratos={contratosPj}
              aditivos={aditivosPj}
              onAtualizar={onAtualizar}
            />
          </TabsContent>
        )}

        {/* ---------------- SUB-ABA 3: JORNADA & MARCOS LIFECYCLE (PJ) ---------------- */}
        {prestadorPj && (
          <TabsContent value="jornada" className="space-y-4">
            <LifecycleJornadaPJ
              prestador={prestadorPj}
              marcos={marcosLifecycle}
              onAtualizar={onAtualizar}
            />
          </TabsContent>
        )}

        {/* ---------------- SUB-ABA 4: REGRAS POR TIPO DE VÍNCULO ---------------- */}
        <TabsContent value="regras" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bloco 1: Regras PJ */}
            <Card className="border-purple-200 dark:border-purple-900/60 bg-gradient-to-br from-card to-purple-50/10">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm sm:text-base font-bold text-purple-900 dark:text-purple-300 font-display flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  Regras Exclusivas de Vínculo PJ
                </CardTitle>
                <CardDescription className="text-xs">
                  Governança jurídica, conformidade fiscal e fluxo assistido de renovação.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3 text-xs font-sans">
                <div className="p-2.5 rounded-lg bg-card border border-border space-y-1">
                  <span className="font-bold text-[#212B55] dark:text-[#F7F8FB] block">
                    1. Certidões Fiscais e CNDT
                  </span>
                  <p className="text-muted-foreground text-[11px]">
                    {certidoesNoCofre.length > 0
                      ? `${certidoesNoCofre.length} certidão(ões) vinculada(s) no cofre de documentos desta pessoa.`
                      : 'Nenhuma certidão anexada ainda. Faça o upload pelo cofre com o tipo "Certidão Fiscal".'}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-card border border-border space-y-1">
                  <span className="font-bold text-[#212B55] dark:text-[#F7F8FB] block">
                    2. Janela de Renovação Assistida (60 dias)
                  </span>
                  <p className="text-muted-foreground text-[11px]">
                    Alertas automáticos disparam no painel e Meu Dia com 60 dias de antecedência
                    para decisão de manter escopo, reajustar valor ou descontinuar com IA assistida.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-card border border-border space-y-1">
                  <span className="font-bold text-[#212B55] dark:text-[#F7F8FB] block">
                    3. Fluxo de Aditivos em 5 Etapas
                  </span>
                  <p className="text-muted-foreground text-[11px]">
                    Minuta gerada &rarr; Parecer e análise jurídica &rarr; Aprovação &rarr; Coleta
                    de assinaturas digitais &rarr; Vigência ativada sem sobrescrever os termos
                    iniciais.
                  </p>
                </div>

                {prestadorPj && (
                  <div className="pt-1 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSubAba('aditivos')}
                      className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50 w-full"
                    >
                      Acessar Gestão de Aditivos Deste Vínculo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bloco 2: Regras CLT */}
            <Card className="border-blue-200 dark:border-blue-900/60 bg-gradient-to-br from-card to-blue-50/10">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm sm:text-base font-bold text-blue-900 dark:text-blue-300 font-display flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-blue-600" />
                  Regras Exclusivas de Vínculo CLT
                </CardTitle>
                <CardDescription className="text-xs">
                  Segurança e Saúde no Trabalho (SST), Atestados Médicos (ASO) e eSocial.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3 text-xs font-sans">
                <div className="p-2.5 rounded-lg bg-card border border-border space-y-1">
                  <span className="font-bold text-[#212B55] dark:text-[#F7F8FB] block">
                    1. ASO (Atestado de Saúde Ocupacional)
                  </span>
                  <p className="text-muted-foreground text-[11px]">
                    {docsCltNoCofre.length > 0
                      ? `${docsCltNoCofre.length} documento(s) CLT/ASO arquivado(s) no cofre digital.`
                      : 'Controle de exames admissionais, periódicos anuais e demissionais com monitoramento de validade no cofre.'}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-card border border-border space-y-1">
                  <span className="font-bold text-[#212B55] dark:text-[#F7F8FB] block">
                    2. eSocial & CTPS Digital
                  </span>
                  <p className="text-muted-foreground text-[11px]">
                    Registro dos eventos S-2200 (Admissão), S-2206 (Alteração Contratual) e
                    comprovante de assinatura digital da CTPS.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-card border border-border space-y-1">
                  <span className="font-bold text-[#212B55] dark:text-[#F7F8FB] block">
                    3. Período de Experiência (45 + 45 dias)
                  </span>
                  <p className="text-muted-foreground text-[11px]">
                    Acompanhamento pelo plano 30-60-90 da rotina de integração com avaliação do
                    gestor antes da efetivação automática.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modais de Operação Vinculados à Pessoa */}
      {prestadorPj && (
        <>
          <ModalNovoContrato
            open={modalNovoContratoOpen}
            onOpenChange={setModalNovoContratoOpen}
            prestador={prestadorPj}
            onSuccess={onAtualizar}
          />

          <ModalNovoAditivo
            open={modalNovoAditivoOpen}
            onOpenChange={setModalNovoAditivoOpen}
            prestador={prestadorPj}
            contratos={contratosPj}
            onSuccess={onAtualizar}
          />

          <ModalFluxoJuridicoAditivo
            open={modalJuridicoOpen}
            onOpenChange={setModalJuridicoOpen}
            aditivo={aditivoEmFoco}
            onSuccess={onAtualizar}
          />
        </>
      )}

      {/* Submodal de Detalhes / Versões do Contrato Unificado */}
      {contratoEmFoco && (
        <ModalDetalhesContratoVersionado
          open={modalDetalhesContratoOpen}
          onOpenChange={setModalDetalhesContratoOpen}
          contrato={contratoEmFoco}
          onAtualizar={() => {
            carregarContratosDigitais()
            onAtualizar()
          }}
        />
      )}

      {/* Submodal de Novo Contrato via Modelo Jurídico */}
      <ModalNovoContratoTemplate
        open={modalNovoContratoTemplateOpen}
        onOpenChange={setModalNovoContratoTemplateOpen}
        pessoa={pessoa}
        onSuccess={() => {
          carregarContratosDigitais()
          onAtualizar()
        }}
      />

      {/* Visualizador de PDF */}
      <DocumentViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        url={viewerUrl}
        title={viewerTitle}
        filename={viewerFilename}
      />
    </div>
  )
}
export default SecaoContratosEVinculos

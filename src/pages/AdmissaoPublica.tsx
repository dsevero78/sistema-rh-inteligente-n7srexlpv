import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  FileCheck2,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Building2,
  ShieldCheck,
  AlertCircle,
  Laptop,
  Users,
  GraduationCap,
  Loader2,
  Send,
  Lock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'

interface ItemAdmissao {
  id: string
  titulo: string
  categoria: 'Documentos' | 'Acesso & Sistemas' | 'Primeiros Dias' | 'Treinamento'
  responsavel: string
  prazo?: string
  concluido: boolean
  observacao?: string
  aCargoDoContratado?: boolean
  confirmadoPorMim?: boolean
  confirmadoEm?: string | null
  observacaoContratado?: string
}

interface DadosAdmissao {
  onboarding: {
    id: string
    data_admissao?: string
    status_geral: string
    status_admissao: string
    percentual_conclusao: number
    itens: ItemAdmissao[]
    total_itens: number
    concluidos: number
    total_itens_contratado: number
    concluidos_contratado: number
    total_itens_empresa: number
    concluidos_empresa: number
    assinatura_nome?: string
    assinatura_data?: string
    assinatura_declaracao_lgpd?: boolean
  }
  candidato: {
    nome: string
    email: string
    telefone: string
  }
  vaga: {
    titulo: string
    departamento: string
    modalidade: string
  }
}

const CATEGORIAS_CONFIG = [
  {
    key: 'Documentos',
    label: 'Documentos & DP',
    icon: FileCheck2,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  {
    key: 'Acesso & Sistemas',
    label: 'Acesso & Sistemas',
    icon: Laptop,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
  },
  {
    key: 'Primeiros Dias',
    label: 'Primeiros Dias (Dia 1)',
    icon: Users,
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    dotColor: 'bg-purple-500',
  },
  {
    key: 'Treinamento',
    label: 'Treinamento & Cultura',
    icon: GraduationCap,
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
  },
] as const

export default function AdmissaoPublica() {
  const { token } = useParams<{ token: string }>()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [dados, setDados] = useState<DadosAdmissao | null>(null)

  // Estado da Assinatura Digital
  const [nomeAssinatura, setNomeAssinatura] = useState('')
  const [declaracaoLgpd, setDeclaracaoLgpd] = useState(false)
  const [assinando, setAssinando] = useState(false)
  const [sucessoAssinatura, setSucessoAssinatura] = useState(false)

  // Estado de notas/observações por item
  const [obsPorItem, setObsPorItem] = useState<Record<string, string>>({})
  const [salvandoItem, setSalvandoItem] = useState<string | null>(null)

  const carregarDadosAdmissao = async () => {
    if (!token) {
      setErro('Token de admissão não fornecido.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/public/admissao/${token}`,
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Link de admissão inválido ou expirado.')
      }
      setDados(data)

      // Carregar observações salvas
      const mapaObs: Record<string, string> = {}
      ;(data.onboarding.itens || []).forEach((it: ItemAdmissao) => {
        if (it.observacaoContratado) {
          mapaObs[it.id] = it.observacaoContratado
        }
      })
      setObsPorItem(mapaObs)

      if (data.onboarding.status_admissao === 'Assinado pelo contratado') {
        setSucessoAssinatura(true)
      }
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Falha ao carregar checklist admissional.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDadosAdmissao()
  }, [token])

  const handleToggleItemContratado = async (itemId: string, novoValor: boolean) => {
    if (!dados || dados.onboarding.status_admissao === 'Assinado pelo contratado') return

    setSalvandoItem(itemId)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/public/admissao/${token}/confirmar-item`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId,
            confirmado: novoValor,
            observacao: obsPorItem[itemId] || '',
          }),
        },
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao confirmar item')
      }

      setDados((prev) => {
        if (!prev) return null
        return {
          ...prev,
          onboarding: {
            ...prev.onboarding,
            itens: data.itens,
            percentual_conclusao: data.percentual_conclusao,
            concluidos_contratado: data.concluidos_contratado,
            status_admissao: 'Em preenchimento',
          },
        }
      })

      toast({
        title: novoValor ? 'Item confirmado!' : 'Item reaberto',
        description: 'Sua alteração foi registrada com sucesso.',
      })
    } catch (err: unknown) {
      toast({
        title: 'Não foi possível atualizar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoItem(null)
    }
  }

  const handleSalvarObservacao = async (itemId: string) => {
    if (!dados || dados.onboarding.status_admissao === 'Assinado pelo contratado') return

    const itemAlvo = dados.onboarding.itens.find((i) => i.id === itemId)
    if (!itemAlvo) return

    setSalvandoItem(itemId)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/public/admissao/${token}/confirmar-item`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId,
            confirmado: !!itemAlvo.confirmadoPorMim,
            observacao: obsPorItem[itemId] || '',
          }),
        },
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao salvar observação')
      }

      toast({
        title: 'Observação salva',
        description: 'Seu apontamento foi compartilhado com o RH.',
      })
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoItem(null)
    }
  }

  const handleAssinarDigitalmente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    if (!declaracaoLgpd) {
      toast({
        title: 'Declaração obrigatória',
        description: 'Por favor, assinale o checkbox de concordância LGPD e veracidade dos dados.',
        variant: 'destructive',
      })
      return
    }

    if (!nomeAssinatura.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite seu nome completo para assinar o termo admissional.',
        variant: 'destructive',
      })
      return
    }

    setAssinando(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/public/admissao/${token}/assinar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: nomeAssinatura.trim(),
            declaracao_lgpd: declaracaoLgpd,
          }),
        },
      )

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao registrar assinatura digital')
      }

      setSucessoAssinatura(true)
      toast({
        title: 'Checklist assinado com sucesso!',
        description: 'A equipe de Gente & Gestão foi notificada automaticamente.',
      })
      await carregarDadosAdmissao()
    } catch (err: unknown) {
      toast({
        title: 'Falha na assinatura',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setAssinando(false)
    }
  }

  // Tela de Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <h2 className="text-sm font-bold text-slate-700">Carregando portal de admissão...</h2>
          <p className="text-xs text-slate-400">Verificando credenciais seguras de acesso.</p>
        </div>
      </div>
    )
  }

  // Tela Cordial de Link Inválido ou Expirado
  if (erro || !dados) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-slate-200 shadow-sm text-center p-8 bg-white">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Link de Admissão Não Encontrado
          </h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            {erro ||
              'Este link pode ter expirado, ter sido digitado incorretamente ou reaberto pela equipe de Gente & Gestão.'}
          </p>
          <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-500 text-left">
            <strong>O que fazer?</strong> Entre em contato diretamente com o responsável de RH da
            empresa para solicitar um novo link de conferência do seu checklist de admissão.
          </div>
          <div className="mt-6">
            <Link to="/candidatar">
              <Button variant="outline" size="sm" className="text-xs">
                Acessar Página de Carreiras
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const { onboarding, candidato, vaga } = dados
  const jaAssinado = onboarding.status_admissao === 'Assinado pelo contratado' || sucessoAssinatura

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Header Institucional */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight block">Gente & Gestão</span>
              <span className="text-[10px] text-slate-400 font-medium">Portal do Contratado</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs font-bold px-2.5 py-1 ${
                jaAssinado
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}
            >
              {jaAssinado ? 'Checklist Assinado' : 'Em Preenchimento'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero de Boas-Vindas */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Ambiente Seguro de Admissão Digital
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Boas-vindas, {candidato.nome}! 🎉
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Estamos muito felizes em oficializar sua contratação para a posição de{' '}
            <strong className="text-white">{vaga.titulo}</strong> no departamento de{' '}
            <strong className="text-white">{vaga.departamento}</strong>. Confira abaixo o status das
            etapas do seu primeiro dia e confirme seus documentos.
          </p>

          {/* Cards de Resumo Rápido */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <span className="text-[11px] text-slate-400 block font-medium">
                Data Prevista de Início
              </span>
              <span className="text-sm font-bold text-white flex items-center gap-1.5 mt-1">
                <Calendar className="w-4 h-4 text-blue-400" />
                {onboarding.data_admissao
                  ? new Date(onboarding.data_admissao).toLocaleDateString('pt-BR', {
                      timeZone: 'UTC',
                    })
                  : 'Alinhada com seu RH'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <span className="text-[11px] text-slate-400 block font-medium">
                Suas Confirmações
              </span>
              <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {onboarding.concluidos_contratado} de {onboarding.total_itens_contratado} itens
                confirmados
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
              <span className="text-[11px] text-slate-400 block font-medium">
                Progresso Geral do Dia 1
              </span>
              <div className="flex items-center justify-between text-xs font-bold text-white mt-1 mb-1">
                <span>{onboarding.percentual_conclusao}% concluído</span>
              </div>
              <Progress value={onboarding.percentual_conclusao} className="h-1.5 bg-slate-700" />
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo Principal */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 -mt-4 space-y-6">
        {/* Banner Informativo se Já Assinado */}
        {jaAssinado && (
          <Card className="border-emerald-200 bg-emerald-50/70 p-4 shadow-xs">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950 space-y-1">
                <p className="font-bold">Checklist Admissional Assinado Digitalmente</p>
                <p className="text-emerald-800">
                  Assinado por <strong>{onboarding.assinatura_nome || candidato.nome}</strong>{' '}
                  {onboarding.assinatura_data && (
                    <>
                      em{' '}
                      {new Date(onboarding.assinatura_data).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </>
                  )}
                  . As informações foram transmitidas com segurança para o Departamento Pessoal.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Bloco de Explicação e Legenda */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <h3 className="font-bold text-slate-900">Como funciona este checklist?</h3>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Itens a seu cargo podem ser marcados conforme você providencia ou envia. Os itens de
              TI e RH são gerenciados diretamente pela empresa.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap text-[11px]">
            <span className="flex items-center gap-1.5 text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-600" />A seu cargo (interativo)
            </span>
            <span className="flex items-center gap-1.5 text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              <Lock className="w-3 h-3 text-slate-400" />A cargo da empresa (somente leitura)
            </span>
          </div>
        </div>

        {/* Checklist Organizado pelas 4 Categorias */}
        <div className="space-y-6">
          {CATEGORIAS_CONFIG.map((cat) => {
            const Icon = cat.icon
            const itensDaCategoria = (onboarding.itens || []).filter(
              (it) => it.categoria === cat.key,
            )
            const concluidosCat = itensDaCategoria.filter((i) => i.concluido).length

            return (
              <Card key={cat.key} className="border-slate-200 shadow-xs bg-white overflow-hidden">
                <CardHeader className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cat.badgeColor}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        {cat.label}
                      </CardTitle>
                      <CardDescription className="text-[11px] text-slate-500">
                        {itensDaCategoria.length} item(ns) previstos nesta fase
                      </CardDescription>
                    </div>
                  </div>

                  <Badge variant="outline" className="text-xs font-semibold bg-white">
                    {concluidosCat} / {itensDaCategoria.length} concluídos
                  </Badge>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 divide-y divide-slate-100">
                  {itensDaCategoria.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      Nenhum item configurado nesta categoria.
                    </p>
                  ) : (
                    itensDaCategoria.map((item) => {
                      const isContratado = !!item.aCargoDoContratado
                      const isSaving = salvandoItem === item.id
                      const isChecked = isContratado
                        ? !!item.confirmadoPorMim || item.concluido
                        : item.concluido

                      return (
                        <div
                          key={item.id}
                          className={`py-3.5 first:pt-0 last:pb-0 transition-all ${
                            isChecked && isContratado ? 'opacity-90' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              {/* Checkbox: interativo se a cargo do contratado e não assinado; senão ícone de lock/status */}
                              {isContratado ? (
                                <div className="pt-0.5">
                                  <input
                                    type="checkbox"
                                    id={`item-${item.id}`}
                                    checked={isChecked}
                                    disabled={jaAssinado || isSaving}
                                    onChange={(e) =>
                                      handleToggleItemContratado(item.id, e.target.checked)
                                    }
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </div>
                              ) : (
                                <div
                                  className="pt-0.5"
                                  title="A cargo da empresa (somente leitura)"
                                >
                                  {item.concluido ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                  )}
                                </div>
                              )}

                              <div className="space-y-1 min-w-0 flex-1">
                                <label
                                  htmlFor={`item-${item.id}`}
                                  className={`text-xs font-bold block leading-snug ${
                                    isContratado && !jaAssinado
                                      ? 'cursor-pointer hover:text-blue-600'
                                      : ''
                                  } ${isChecked ? 'text-slate-700' : 'text-slate-900'}`}
                                >
                                  {item.titulo}
                                </label>

                                <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                                  <span className="font-medium text-slate-600">
                                    Responsável: {item.responsavel || 'RH / TI'}
                                  </span>

                                  {item.prazo && (
                                    <span className="flex items-center gap-1 text-slate-400">
                                      <Clock className="w-3 h-3" />
                                      Prazo:{' '}
                                      {new Date(item.prazo).toLocaleDateString('pt-BR', {
                                        timeZone: 'UTC',
                                      })}
                                    </span>
                                  )}

                                  {isContratado ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200 py-0"
                                    >
                                      Confirmado por mim
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] font-medium bg-slate-50 text-slate-600 border-slate-200 py-0"
                                    >
                                      A cargo da empresa
                                    </Badge>
                                  )}
                                </div>

                                {item.observacao && (
                                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 mt-1">
                                    {item.observacao}
                                  </p>
                                )}

                                {/* Campo Opcional de Observação do Contratado (ex: "enviei o documento por e-mail") */}
                                {isContratado && (
                                  <div className="pt-1.5 flex items-center gap-2">
                                    <Input
                                      placeholder="Adicionar observação (ex: enviei o PDF hoje por e-mail)..."
                                      value={
                                        obsPorItem[item.id] ?? (item.observacaoContratado || '')
                                      }
                                      onChange={(e) =>
                                        setObsPorItem((prev) => ({
                                          ...prev,
                                          [item.id]: e.target.value,
                                        }))
                                      }
                                      disabled={jaAssinado}
                                      className="h-7 text-[11px] bg-slate-50/60 max-w-md"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault()
                                          handleSalvarObservacao(item.id)
                                        }
                                      }}
                                    />
                                    {!jaAssinado && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSalvarObservacao(item.id)}
                                        disabled={isSaving}
                                        className="h-7 text-[10px] px-2 font-medium"
                                      >
                                        Salvar
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Badge lateral de status do item */}
                            <div className="shrink-0 text-right">
                              {isChecked ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                                  {isContratado ? 'Confirmado' : 'Concluído pelo RH'}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-medium text-slate-500 bg-slate-50"
                                >
                                  {isContratado ? 'Pendente' : 'Em andamento'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Bloco de Assinatura Digital de Reconhecimento e Veracidade com LGPD */}
        <Card className="border-blue-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                Assinatura de Reconhecimento Admissional
              </h3>
              <p className="text-xs text-blue-200">
                Concordância formal com os termos e conferência dos itens de integração
              </p>
            </div>
          </div>

          <CardContent className="p-5 sm:p-6 space-y-4">
            {jaAssinado ? (
              <div className="space-y-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Assinatura Digital Registrada e Concluída
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-emerald-900">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Signatário</span>
                    <strong className="text-slate-900">
                      {onboarding.assinatura_nome || candidato.nome}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Data / Hora</span>
                    <strong className="text-slate-900">
                      {onboarding.assinatura_data
                        ? new Date(onboarding.assinatura_data).toLocaleString('pt-BR')
                        : new Date().toLocaleString('pt-BR')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Status no Sistema</span>
                    <strong className="text-emerald-700">Assinado pelo Contratado</strong>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 pt-1 border-t border-emerald-200/60">
                  Evidência armazenada conforme as diretrizes da LGPD (Lei nº 13.709/2018). Nenhuma
                  outra ação é exigida de sua parte neste momento.
                </p>
              </div>
            ) : (
              <form onSubmit={handleAssinarDigitalmente} className="space-y-4">
                <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-blue-950 leading-relaxed space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    Validação de Concordância Admissional
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Ao assinar digitalmente, você declara ter conferido os itens do checklist, ter
                    enviado ou agendado a entrega dos seus documentos e autoriza o processamento
                    admissional pela equipe de Gente & Gestão.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Digite seu Nome Completo para Assinatura *
                  </label>
                  <Input
                    placeholder={`Ex: ${candidato.nome}`}
                    value={nomeAssinatura}
                    onChange={(e) => setNomeAssinatura(e.target.value)}
                    className="h-10 text-xs bg-slate-50 border-slate-200"
                    required
                  />
                  <p className="text-[11px] text-slate-400">
                    O nome deve coincidir com o cadastro formal do processo ({candidato.nome}).
                  </p>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <input
                    type="checkbox"
                    id="lgpd-admissao"
                    checked={declaracaoLgpd}
                    onChange={(e) => setDeclaracaoLgpd(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    required
                  />
                  <label
                    htmlFor="lgpd-admissao"
                    className="text-xs text-slate-700 leading-snug cursor-pointer font-medium"
                  >
                    Declaro que as informações fornecidas são verdadeiras e autorizo o tratamento
                    dos meus dados para fins admissionais, folha de pagamento e benefícios, conforme
                    a LGPD (Lei nº 13.709/2018).
                  </label>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    Evidências técnicas (IP, data e hora exata) serão registradas para fins de
                    auditoria.
                  </span>

                  <Button
                    type="submit"
                    disabled={assinando || !declaracaoLgpd || !nomeAssinatura.trim()}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-6 shadow-xs"
                  >
                    {assinando ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        Registrando assinatura...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 mr-1.5" />
                        Concluir e Assinar Digitalmente
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

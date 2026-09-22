import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePeriod } from '@/contexts/PeriodContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useRealtime } from '@/hooks/use-realtime'
import { notificacoesRhService, type NotificacaoRH } from '@/services/notificacoesRh'
import {
  LayoutDashboard,
  Sunrise,
  FileSignature,
  Briefcase,
  Users,
  Building2,
  Clock,
  Users2,
  GitPullRequest,
  FileCheck2,
  Calendar,
  MessageSquare,
  FileText,
  LogOut,
  User,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  BarChart3,
  Bell,
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
  ArrowRight,
  ExternalLink,
  UserCheck,
  Mail,
  Heart,
  Gift,
  Handshake,
  CircleDollarSign,
  Compass,
  Sun,
  Moon,
  UserMinus,
} from 'lucide-react'
import { carregarMeuDia } from '@/services/meuDia'
import type { RecordModel } from 'pocketbase'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

interface NavItem {
  title: string
  href: string
  icon: typeof LayoutDashboard
  badge?: string
  countKey?: 'alertas' | 'meudia' | 'desligamentos'
}

interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

export default function Layout() {
  const { user, logout, refreshUser, isGestorContratante } = useAuth()
  const { period, setPeriod } = usePeriod()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [editName, setEditName] = useState(user?.name || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Alertas automáticos e Notificações in-app do RH
  const [alertasRecentes, setAlertasRecentes] = useState<RecordModel[]>([])
  const [notificacoesRh, setNotificacoesRh] = useState<NotificacaoRH[]>([])
  const [alertasNovosCount, setAlertasNovosCount] = useState(0)
  const [loadingAlertas, setLoadingAlertas] = useState(true)
  const [meuDiaCount, setMeuDiaCount] = useState(0)
  const [desligamentosCount, setDesligamentosCount] = useState(0)

  const carregarDesligamentosPendentes = async () => {
    try {
      const records = await pb.collection('offboardings').getList(1, 1, {
        filter: "status != 'concluido' && status != 'cancelado'",
        fields: 'id',
      })
      setDesligamentosCount(records.totalItems)
    } catch {
      // Coleção pode não estar acessível ou vazia; ignora silenciosamente
    }
  }

  const carregarPendenciasMeuDia = async () => {
    try {
      const dados = await carregarMeuDia(user)
      setMeuDiaCount(dados.kpis.totalPendencias)
    } catch (err) {
      console.error('Erro ao calcular pendências de Meu Dia no Layout:', err)
    }
  }

  const carregarAlertas = async () => {
    try {
      const [records, notifs] = await Promise.all([
        pb.collection('alertas').getFullList({
          sort: '-created',
          expand: 'candidato,vaga,prestador',
        }),
        notificacoesRhService.listar(15),
      ])
      setAlertasRecentes(records.slice(0, 6))
      setNotificacoesRh(notifs)
      const countAlertasNovos = records.filter((r) => r.status === 'Novo').length
      const countNotifsNaoLidas = notifs.filter((n) => !n.lida).length
      setAlertasNovosCount(countAlertasNovos + countNotifsNaoLidas)
    } catch (err) {
      console.error('Falha ao carregar alertas/notificações no Layout', err)
    } finally {
      setLoadingAlertas(false)
    }
  }

  useEffect(() => {
    carregarAlertas()
    carregarPendenciasMeuDia()
    carregarDesligamentosPendentes()
    // Verificação proativa de contratos vencendo/em renovação para disparo de notificações e e-mails
    notificacoesRhService.verificarEDispararAlertasContratosVencendo().catch(() => {})

    const handleAtualizacaoMeuDia = () => {
      carregarPendenciasMeuDia()
    }
    window.addEventListener('souyess_meu_dia_updated', handleAtualizacaoMeuDia)
    return () => {
      window.removeEventListener('souyess_meu_dia_updated', handleAtualizacaoMeuDia)
    }
  }, [user])

  useRealtime('alertas', () => {
    carregarAlertas()
    carregarPendenciasMeuDia()
  })
  useRealtime('notificacoes_rh', () => carregarAlertas())
  useRealtime('vagas', () => carregarPendenciasMeuDia())
  useRealtime('candidatos', () => carregarPendenciasMeuDia())
  useRealtime('entrevistas', () => carregarPendenciasMeuDia())
  useRealtime('aditivos_pj', () => carregarPendenciasMeuDia())
  useRealtime('onboardings', () => carregarPendenciasMeuDia())
  useRealtime('feedbacks_gestor', () => carregarPendenciasMeuDia())
  useRealtime('offboardings', () => {
    carregarDesligamentosPendentes()
    carregarPendenciasMeuDia()
  })
  const handleMarcarVisualizado = async (alertaId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await pb.collection('alertas').update(alertaId, { status: 'Visualizado' })
      carregarAlertas()
      toast({ title: 'Alerta marcado como visualizado' })
    } catch {
      /* intentionally ignored */
    }
  }

  const handleDescartarAlerta = async (alertaId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await pb.collection('alertas').update(alertaId, { status: 'Descartado' })
      carregarAlertas()
      toast({ title: 'Alerta descartado' })
    } catch {
      /* intentionally ignored */
    }
  }

  const getPageTitle = () => {
    const path = location.pathname
    if (path.startsWith('/meu-dia')) return 'Meu Dia — Rotina & Pendências'
    if (path.startsWith('/empresas')) return 'Gestão Multi-Empresa & Unidades (Holding + BUs)'
    if (path.startsWith('/gestor')) return 'Portal do Gestor Contratante (Minhas Vagas)'
    if (path.startsWith('/dashboard')) return 'Painel Geral de Recrutamento'
    if (path.startsWith('/vagas/')) return 'Detalhes da Vaga'
    if (path === '/vagas') return 'Gestão de Vagas'
    if (path.startsWith('/candidatos/')) return 'Perfil do Candidato'
    if (path === '/candidatos') return 'Gestão de Candidatos'
    if (path.startsWith('/pipeline')) return 'Pipeline de Seleção (Kanban)'
    if (path.startsWith('/ofertas')) return 'Ofertas e Propostas Salariais'
    if (path.startsWith('/onboarding')) return 'Onboarding do Contratado (Dia 1)'
    if (path.startsWith('/experiencia')) return 'Experiência do Candidato (Candidate Experience)'
    if (path.startsWith('/contratos')) return 'Gestão Centralizada de Contratos'
    if (path.startsWith('/indicacoes')) return 'Programa de Indicação de Talentos'
    if (path.startsWith('/prestadores')) return 'Pessoas — Gestão de Pessoas e Vínculos'
    if (path.startsWith('/banco-talentos')) return 'Banco de Talentos & Reaproveitamento'
    if (path.startsWith('/alertas')) return 'Alertas Automáticos de Talentos'
    if (path.startsWith('/entrevistas')) return 'Gestão de Entrevistas & Calendário'
    if (path.startsWith('/chat')) return 'Chat com Gestor de Talentos (IA)'
    if (path.startsWith('/integracao')) return 'Rotina de Integração 30-60-90'
    if (path.startsWith('/offboardings') || path.startsWith('/desligamentos'))
      return 'Desligamentos & Offboarding'
    if (path.startsWith('/importar')) return 'Assistente de Importação em Lote'
    if (path.startsWith('/financeiro')) return 'Painel Financeiro Consolidado'
    if (path.startsWith('/indicadores')) return 'Indicadores Estratégicos de Recrutamento'
    if (path.startsWith('/relatorios/')) return 'Relatório de Avaliação'
    if (path === '/relatorios') return 'Relatórios de Aderência e IA'
    if (path.startsWith('/relatorio-executivo')) return 'Relatório Executivo Mensal'
    return 'Gente & Gestão'
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setSavingProfile(true)
    try {
      await pb.collection('users').update(user.id, {
        name: editName,
      })
      await refreshUser()
      toast({
        title: 'Perfil atualizado',
        description: 'Seu nome institucional foi atualizado.',
      })
      setProfileModalOpen(false)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao atualizar perfil',
        description: err instanceof Error ? err.message : 'Falha inesperada.',
        variant: 'destructive',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const userInitials = (user?.name || user?.email || 'RH')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#11162B] via-[#141B34] to-[#1A2240] text-[#F7F8FB] border-r border-[#2E3A6E]/40">
      {/* Brand Header SouYess */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#2E3A6E]/45 bg-[#11162B]/60 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#E9530E] flex items-center justify-center text-white shadow-[0_2px_8px_rgba(233,83,14,0.35)] shrink-0 font-extrabold text-sm tracking-wider font-display">
            SY
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-[#F7F8FB] tracking-wider uppercase font-display">
                SouYess
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#E9530E]/20 text-[#F19763] border border-[#E9530E]/30 uppercase font-display">
                RH
              </span>
            </div>
            <span className="text-[11px] text-[#A8B0C9] font-semibold tracking-wide font-display">
              Gente &amp; Gestão
            </span>
          </div>
        </div>
      </div>

      {/* Nav List Agrupada em Seções do Ciclo de RH */}
      <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto font-sans scrollbar-thin scrollbar-thumb-[#2E3A6E]/60 scrollbar-track-transparent">
        {(isGestorContratante
          ? [
              {
                id: 'visao_geral',
                label: 'Visão Geral',
                items: [
                  {
                    title: 'Meu Dia',
                    href: '/meu-dia',
                    icon: Sunrise,
                    countKey: 'meudia' as const,
                  },
                ],
              },
              {
                id: 'recrutamento',
                label: 'Recrutamento',
                items: [{ title: 'Minhas Vagas', href: '/gestor', icon: Briefcase }],
              },
              {
                id: 'pessoas',
                label: 'Pessoas & Operação',
                items: [
                  { title: 'Pessoas (Unificado)', href: '/pessoas', icon: Users, badge: 'Ficha' },
                  {
                    title: 'Horas & Competências',
                    href: '/horas-competencias',
                    icon: Clock,
                    badge: 'Apontar',
                  },
                ],
              },
              {
                id: 'inteligencia',
                label: 'Inteligência & IA',
                items: [
                  { title: 'Indicadores', href: '/indicadores', icon: Compass, badge: 'KPIs' },
                  { title: 'Chat com IA', href: '/chat', icon: MessageSquare, badge: 'Agente' },
                ],
              },
            ]
          : [
              {
                id: 'visao_geral',
                label: 'Visão Geral',
                items: [
                  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
                  {
                    title: 'Meu Dia',
                    href: '/meu-dia',
                    icon: Sunrise,
                    countKey: 'meudia' as const,
                  },
                  { title: 'Alertas', href: '/alertas', icon: Bell, countKey: 'alertas' as const },
                  { title: 'E-mails de Status', href: '/alertas?aba=emails_status', icon: Mail },
                ],
              },
              {
                id: 'recrutamento',
                label: 'Recrutamento & Seleção',
                items: [
                  { title: 'Vagas', href: '/vagas', icon: Briefcase },
                  {
                    title: 'Minhas Vagas (Gestor)',
                    href: '/gestor',
                    icon: UserCheck,
                    badge: 'Portal',
                  },
                  { title: 'Candidatos', href: '/candidatos', icon: Users2 },
                  { title: 'Pipeline', href: '/pipeline', icon: GitPullRequest },
                  { title: 'Entrevistas', href: '/entrevistas', icon: Calendar },
                  { title: 'Ofertas', href: '/ofertas', icon: FileCheck2 },
                  {
                    title: 'Banco de Talentos',
                    href: '/banco-talentos',
                    icon: Sparkles,
                    badge: 'Talentos',
                  },
                  {
                    title: 'Indicações',
                    href: '/indicacoes',
                    icon: Gift,
                    badge: 'Promotores',
                  },
                  {
                    title: 'Experiência',
                    href: '/experiencia',
                    icon: Heart,
                    badge: 'NPS',
                  },
                ],
              },
              {
                id: 'pessoas_ciclo',
                label: 'Pessoas & Ciclo de Vida',
                items: [
                  {
                    title: 'Pessoas (Unificado)',
                    href: '/pessoas',
                    icon: Users,
                    badge: 'CLT & PJ',
                  },
                  { title: 'Onboarding', href: '/onboarding', icon: UserCheck, badge: 'Dia 1' },
                  {
                    title: 'Integração 30-60-90',
                    href: '/integracao',
                    icon: Compass,
                    badge: 'Rotina',
                  },
                  {
                    title: 'Horas & Competências',
                    href: '/horas-competencias',
                    icon: Clock,
                    badge: 'NFs Lote',
                  },
                  {
                    title: 'Desligamentos',
                    href: '/offboardings',
                    icon: UserMinus,
                    badge: 'Offboarding',
                    countKey: 'desligamentos' as const,
                  },
                ],
              },
              {
                id: 'gestao_institucional',
                label: 'Gestão Institucional',
                items: [
                  {
                    title: 'Empresas & Unidades',
                    href: '/empresas',
                    icon: Building2,
                    badge: 'Holding',
                  },
                  {
                    title: 'Contratos',
                    href: '/contratos',
                    icon: FileSignature,
                    badge: 'PJ & CLT',
                  },
                  {
                    title: 'Financeiro',
                    href: '/financeiro',
                    icon: CircleDollarSign,
                    badge: 'NFs & PJ',
                  },
                  {
                    title: 'Importar Dados',
                    href: '/importar',
                    icon: FileSpreadsheet,
                    badge: '10 min',
                  },
                ],
              },
              {
                id: 'inteligencia_relatorios',
                label: 'Inteligência & Relatórios',
                items: [
                  {
                    title: 'Indicadores',
                    href: '/indicadores',
                    icon: Compass,
                    badge: 'KPIs',
                  },
                  { title: 'Relatórios', href: '/relatorios', icon: FileText },
                  {
                    title: 'Relatório Executivo',
                    href: '/relatorio-executivo',
                    icon: BarChart3,
                    badge: 'Mensal',
                  },
                  { title: 'Chat com IA', href: '/chat', icon: MessageSquare, badge: 'Agente' },
                ],
              },
            ]
        ).map((group, groupIdx) => (
          <div key={group.id} className="space-y-1">
            {/* Título de Seção Discreto */}
            <div className="flex items-center px-3 pt-2 pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C88B1] font-display">
                {group.label}
              </span>
            </div>

            {/* Itens do Grupo */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== '/dashboard' &&
                    item.href !== '/alertas' &&
                    location.pathname.startsWith(item.href)) ||
                  (item.href === '/alertas' &&
                    location.pathname === '/alertas' &&
                    !location.search.includes('aba=emails_status')) ||
                  (item.href === '/alertas?aba=emails_status' &&
                    location.pathname === '/alertas' &&
                    location.search.includes('aba=emails_status'))

                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium tracking-normal font-sans transition-all duration-150 group relative ${
                      isActive
                        ? 'bg-[#FEF1EA] text-[#E9530E] font-semibold shadow-xs'
                        : 'text-[#D3D7E5] hover:text-[#F7F8FB] hover:bg-[#2E3A6E]'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#E9530E] rounded-r-full" />
                    )}
                    <Icon
                      className={`w-4 h-4 transition-colors shrink-0 ${isActive ? 'text-[#E9530E]' : 'text-[#A8B0C9] group-hover:text-[#F7F8FB]'}`}
                    />
                    <span className="flex-1 truncate font-sans text-sm">{item.title}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded border font-sans ${
                          isActive
                            ? 'bg-[#E9530E] text-white border-transparent'
                            : 'bg-[#2E3A6E] text-[#D3D7E5] border-[#4A567E]/60'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.countKey === 'alertas' && alertasNovosCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#E9530E] text-white min-w-[18px] text-center font-mono shadow-xs">
                        {alertasNovosCount}
                      </span>
                    )}
                    {item.countKey === 'meudia' && meuDiaCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#E9530E] text-white min-w-[18px] text-center font-mono shadow-xs animate-in zoom-in-50">
                        {meuDiaCount}
                      </span>
                    )}
                    {item.countKey === 'desligamentos' && desligamentosCount > 0 && (
                      <span
                        title={`${desligamentosCount} desligamento(s) em andamento`}
                        className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 min-w-[18px] text-center font-mono shadow-xs animate-in zoom-in-50"
                      >
                        {desligamentosCount}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Footer Card - Superfície elevada em #1A2240 com borda em #2E3A6E sobre o gradiente até #1A2240 */}
      <div className="p-3 border-t border-[#2E3A6E]/40 bg-[#11162B]/40 backdrop-blur-xs font-sans">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-[#1A2240]/80 hover:bg-[#2E3A6E]/90 border border-[#2E3A6E] transition-all text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E9530E]">
              <Avatar className="h-8 w-8 border border-[#4A567E] bg-[#212B55] text-white font-bold text-xs shrink-0 shadow-xs font-display">
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 font-sans">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-[#F7F8FB] truncate font-sans">
                    {user?.name || 'Douglas Severo'}
                  </p>
                </div>
                <p className="text-[11px] text-[#F19763] font-medium truncate font-sans">
                  {user?.cargo_funcao ||
                    (isGestorContratante ? 'Gestor Contratante' : 'RH / Recrutador')}
                </p>
                <p className="text-[10px] text-[#A8B0C9] truncate font-sans">
                  {user?.email || 'severo.douglas2@gmail.com'}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-[#A8B0C9] shrink-0" />
            </button>
          </DropdownMenuTrigger>{' '}
          <DropdownMenuContent
            align="end"
            className="w-56 mb-2 bg-[#1A2240] border-[#2E3A6E] text-[#F7F8FB] shadow-2xl rounded-xl font-sans"
          >
            <DropdownMenuLabel className="text-xs text-[#A8B0C9] font-sans">
              Minha Conta
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                setEditName(user?.name || '')
                setProfileModalOpen(true)
              }}
              className="hover:bg-[#2E3A6E] text-[#F7F8FB] cursor-pointer text-xs focus:bg-[#2E3A6E] focus:text-white font-sans"
            >
              <User className="w-3.5 h-3.5 mr-2 text-[#F19763]" />
              Editar perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#2E3A6E]/80" />
            <DropdownMenuItem
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="text-[#ff8a80] hover:bg-[#2E3A6E] hover:text-red-200 cursor-pointer text-xs focus:bg-[#2E3A6E] focus:text-red-200 font-sans"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Sair da conta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-[#F7F8FB] dark:bg-[#11162B] text-foreground transition-colors duration-200">
      {/* Desktop Sidebar (260px fixed) */}
      <aside className="hidden md:flex flex-col w-[260px] fixed inset-y-0 left-0 z-30 shadow-[0_4px_24px_rgba(17,22,43,0.22)]">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-[#11162B]/80 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-[280px] max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-250">
            {sidebarContent}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 text-[#A8B0C9] hover:text-white p-1 rounded-md"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-[260px] min-h-screen">
        {/* TopBar SouYess (64px) */}
        <header className="h-16 sticky top-0 z-20 bg-white/95 dark:bg-[#1A2240]/95 backdrop-blur-md border-b border-[#E7EAF0] dark:border-[#2E3A6E] px-4 sm:px-8 flex items-center justify-between shadow-[0_1px_3px_rgba(11,18,48,0.03)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)] transition-colors duration-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 rounded-lg text-[#4D5566] dark:text-[#D3D7E5] hover:bg-[#F2F4F8] dark:hover:bg-[#2E3A6E] hover:text-[#212B55] dark:hover:text-[#F7F8FB] md:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#E9530E] font-display">
                SouYess People Hub
              </div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-[#212B55] dark:text-[#F7F8FB] truncate font-display">
                {getPageTitle()}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Link Direto para Página Pública de Candidatura */}
            <a
              href="/candidatar"
              target="_blank"
              rel="noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FEF1EA] dark:bg-[#212B55] text-[#C5430A] dark:text-[#F19763] hover:bg-[#FBDCC9] dark:hover:bg-[#2E3A6E] transition-colors border border-[#FBDCC9] dark:border-[#2E3A6E]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E9530E]" />
              Ver Página Pública de Candidatura
            </a>

            {/* Period selector */}
            <div className="hidden sm:flex items-center gap-2">
              <Select
                value={period}
                onValueChange={(val) => setPeriod(val as '7d' | '30d' | '90d')}
              >
                <SelectTrigger className="w-[155px] h-9 text-xs font-semibold border-[#D7DCE6] dark:border-[#2E3A6E] bg-[#F7F8FB] dark:bg-[#11162B] text-[#212B55] dark:text-[#F7F8FB] rounded-lg">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent className="dark:bg-[#1A2240] dark:border-[#2E3A6E] dark:text-[#F7F8FB]">
                  <SelectItem value="7d" className="text-xs font-medium">
                    Últimos 7 dias
                  </SelectItem>
                  <SelectItem value="30d" className="text-xs font-medium">
                    Últimos 30 dias
                  </SelectItem>
                  <SelectItem value="90d" className="text-xs font-medium">
                    Últimos 90 dias
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Alternância de Modo Claro / Escuro SouYess */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-9 w-9 p-0 rounded-lg text-[#4D5566] dark:text-[#D3D7E5] hover:text-[#E9530E] dark:hover:text-[#F19763] hover:bg-[#FEF1EA] dark:hover:bg-[#2E3A6E] transition-colors"
              aria-label={
                theme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'
              }
              title={theme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#F19763]" />
              ) : (
                <Moon className="w-4 h-4 text-[#212B55]" />
              )}
            </Button>

            {/* SINO DE NOTIFICAÇÕES (Alertas Automáticos) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative p-2 rounded-lg text-[#4D5566] hover:text-[#E9530E] hover:bg-[#FEF1EA] transition-colors focus:outline-none focus:ring-2 focus:ring-[#E9530E]"
                  aria-label="Notificações e Alertas"
                >
                  <Bell className="w-5 h-5" />
                  {alertasNovosCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E9530E] px-1 text-[9px] font-extrabold text-white ring-2 ring-white">
                      {alertasNovosCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-84 sm:w-96 p-0 bg-white dark:bg-[#1A2240] border border-[#E7EAF0] dark:border-[#2E3A6E] shadow-[0_16px_32px_rgba(11,18,48,0.12)] dark:shadow-[0_20px_48px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden"
              >
                {/* Header do Dropdown */}
                <div className="p-3.5 bg-gradient-to-r from-[#11162B] to-[#1A2240] text-[#F7F8FB] flex items-center justify-between border-b border-[#2E3A6E]/40">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#F19763]" />
                    <span className="text-xs font-bold tracking-wide uppercase">
                      Central de Notificações
                    </span>
                    {alertasNovosCount > 0 && (
                      <span className="text-[10px] bg-[#E9530E] text-white px-1.5 py-0.2 rounded-full font-bold">
                        {alertasNovosCount} novo(s)
                      </span>
                    )}
                  </div>
                  <Link
                    to="/alertas"
                    className="text-[11px] font-semibold text-[#F19763] hover:text-white transition-colors"
                  >
                    Ver todos
                  </Link>
                </div>

                {/* Lista de Alertas Recentes */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-[#2E3A6E]">
                  {/* Seção 1: Notificações do Gestor e Jurídico para o RH */}
                  {notificacoesRh.length > 0 && (
                    <div className="bg-slate-50/50 dark:bg-[#11162B]/50 p-2 border-b border-slate-100 dark:border-[#2E3A6E]">
                      <div className="flex items-center justify-between px-1 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Ações do Gestor & Jurídico
                        </span>
                        {notificacoesRh.some((n) => !n.lida) && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              await notificacoesRhService.marcarTodasComoLidas()
                              carregarAlertas()
                            }}
                            className="text-[10px] text-blue-600 dark:text-[#F19763] hover:underline font-semibold"
                          >
                            Marcar lidas
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {notificacoesRh.slice(0, 4).map((notif) => {
                          const isVaga =
                            notif.tipo === 'vaga_aprovada' || notif.tipo === 'vaga_ajustes'
                          const isJuridico = notif.tipo === 'aditivo_juridico'
                          const isParecer = notif.tipo === 'parecer_candidato'

                          return (
                            <div
                              key={notif.id}
                              onClick={async () => {
                                await notificacoesRhService.marcarComoLida(notif.id)
                                carregarAlertas()
                                if (notif.link) {
                                  navigate(notif.link)
                                }
                              }}
                              className={`p-2 rounded-lg transition-colors cursor-pointer border ${
                                !notif.lida
                                  ? 'bg-blue-50/70 dark:bg-[#212B55] border-blue-200 dark:border-[#2E3A6E]'
                                  : 'bg-white dark:bg-[#1A2240] border-slate-100 dark:border-[#2E3A6E]/60 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {!notif.lida && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#E9530E] shrink-0" />
                                  )}
                                  <span
                                    className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                                      isVaga
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : isJuridico
                                          ? 'bg-purple-100 text-purple-800 border-purple-300'
                                          : isParecer
                                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                                            : 'bg-slate-100 text-slate-800 border-slate-300'
                                    }`}
                                  >
                                    {notif.tipo === 'fechamento_horas_rh'
                                      ? 'Horas para Validação'
                                      : notif.tipo === 'fechamento_horas_gestor'
                                        ? 'Retorno Horas'
                                        : isVaga
                                          ? 'Gestor Vaga'
                                          : isJuridico
                                            ? 'Jurídico PJ'
                                            : isParecer
                                              ? 'Parecer Gestor'
                                              : 'Notificação'}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 dark:text-[#F7F8FB] truncate max-w-[200px]">
                                    {notif.titulo}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  {new Date(notif.created).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5">
                                {notif.mensagem}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {loadingAlertas ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Carregando alertas...
                    </div>
                  ) : alertasRecentes.length === 0 && notificacoesRh.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Nenhum alerta recente gerado.
                    </div>
                  ) : (
                    alertasRecentes.map((al) => {
                      const cand = al.expand?.candidato
                      const vaga = al.expand?.vaga
                      const prest = al.expand?.prestador
                      const isNovo = al.status === 'Novo'
                      const isAprovVaga = al.tipo === 'aprovacao_vaga_gestor'
                      const isParecerGestor = al.tipo === 'parecer_gestor_candidato'
                      const isAlertaMeta = al.tipo && al.tipo.startsWith('meta_orcamento_')
                      const isRenovacaoPj =
                        al.tipo === 'renovacao_contrato_pj' || al.tipo === 'contrato_pj_vencendo'
                      const isAlertaPj = al.tipo && al.tipo.includes('pj')

                      const handleClickNotif = () => {
                        if (isAlertaMeta) {
                          navigate('/financeiro')
                        } else if (isRenovacaoPj || isAlertaPj) {
                          if (prest?.id) {
                            navigate(`/pessoas/${prest.id}`)
                          } else {
                            navigate('/pessoas')
                          }
                        } else if (isAprovVaga && vaga) {
                          navigate(`/vagas/${vaga.id}`)
                        } else if (isParecerGestor && cand) {
                          navigate(`/candidatos/${cand.id}`)
                        } else {
                          navigate('/alertas')
                        }
                      }

                      return (
                        <div
                          key={al.id}
                          onClick={handleClickNotif}
                          className={`p-3 transition-colors hover:bg-slate-50/80 cursor-pointer ${
                            isNovo ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                              {isNovo && (
                                <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                              )}
                              {isAlertaMeta ? (
                                <>
                                  <span
                                    className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border ${
                                      al.tipo === 'meta_orcamento_estouro'
                                        ? 'bg-red-100 text-red-800 border-red-300'
                                        : 'bg-amber-100 text-amber-800 border-amber-300'
                                    }`}
                                  >
                                    {al.tipo === 'meta_orcamento_estouro'
                                      ? 'Meta Estourada'
                                      : 'Atenção Orçamento'}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    Painel Financeiro
                                  </span>
                                </>
                              ) : isAprovVaga ? (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Vaga Validada
                                </span>
                              ) : isParecerGestor ? (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 border border-purple-200">
                                  Parecer do Gestor
                                </span>
                              ) : null}
                              {!isAlertaMeta && isRenovacaoPj ? (
                                <>
                                  <span className="text-[10px] uppercase font-black px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 border border-indigo-300">
                                    Renovação PJ
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {prest?.nome_fantasia || prest?.razao_social || 'Prestador PJ'}
                                  </span>
                                </>
                              ) : !isAlertaMeta && isAlertaPj ? (
                                <>
                                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                    Prestador PJ
                                  </span>
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {prest?.nome_fantasia || prest?.razao_social || 'Fornecedor PJ'}
                                  </span>
                                </>
                              ) : isAprovVaga ? (
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {vaga?.titulo || 'Vaga sob Gestão'}
                                </span>
                              ) : !isAlertaMeta ? (
                                <>
                                  <span className="font-bold text-xs text-slate-900 truncate">
                                    {cand?.nome || 'Talento'}
                                  </span>
                                  <span className="text-[10px] text-slate-400">→</span>
                                  <span className="text-xs font-medium text-blue-700 truncate">
                                    {vaga?.titulo || 'Vaga'}
                                  </span>
                                </>
                              ) : null}{' '}
                            </div>

                            {/* Score Ring / Badge */}
                            {!isAprovVaga && (
                              <span
                                className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                                  (al.score || 75) >= 85
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {al.score || 75}% fit
                              </span>
                            )}
                          </div>

                          {al.resumo_ia && (
                            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                              {al.resumo_ia}
                            </p>
                          )}

                          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100/60">
                            <span>
                              {al.created
                                ? new Date(al.created).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Recente'}
                            </span>

                            <div className="flex items-center gap-1">
                              {isNovo && (
                                <button
                                  onClick={(e) => handleMarcarVisualizado(al.id, e)}
                                  className="text-slate-500 hover:text-blue-600 p-0.5 rounded font-medium"
                                  title="Marcar como lido"
                                >
                                  Lido
                                </button>
                              )}
                              {al.status !== 'Descartado' && (
                                <button
                                  onClick={(e) => handleDescartarAlerta(al.id, e)}
                                  className="text-slate-400 hover:text-red-600 p-0.5 rounded"
                                  title="Descartar"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Footer do Dropdown */}
                <div className="p-2.5 bg-slate-50 dark:bg-[#141B34] border-t border-slate-100 dark:border-[#2E3A6E] text-center">
                  <Link
                    to="/alertas"
                    className="text-xs font-semibold text-blue-600 dark:text-[#F19763] hover:text-blue-700 dark:hover:text-white inline-flex items-center gap-1"
                  >
                    Abrir Central de Notificações e Alertas
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Header user avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-full focus:outline-none focus:ring-2 focus:ring-[#E9530E] focus:ring-offset-2 transition-transform active:scale-95"
                  aria-label="Menu do usuário"
                >
                  <Avatar className="h-9 w-9 border border-[#D7DCE6] shadow-xs cursor-pointer bg-[#FEF1EA] text-[#E9530E] font-bold text-xs hover:border-[#E9530E]">
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-1 border-[#E7EAF0] shadow-md">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-bold text-[#212B55] text-xs">
                      {user?.name || 'Douglas Severo'}
                    </span>
                    <span className="text-[11px] text-[#6B7384] truncate">
                      {user?.email || 'severo.douglas2@gmail.com'}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setEditName(user?.name || '')
                    setProfileModalOpen(true)
                  }}
                  className="cursor-pointer text-xs"
                >
                  <User className="w-3.5 h-3.5 mr-2 text-[#E9530E]" />
                  Editar perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout()
                    navigate('/login')
                  }}
                  className="text-[#D5392C] cursor-pointer text-xs focus:text-[#D5392C] focus:bg-[#F8DDD9]"
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>

        {/* Rodapé Institucional com Versão do Sistema */}
        <footer className="border-t border-[#E7EAF0] dark:border-[#2E3A6E] bg-white/60 dark:bg-[#1A2240]/60 py-3 px-4 sm:px-8 text-center text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-1">
          <span>Sistema RH Inteligente — SouYess People Hub</span>
          <span className="font-mono text-[11px] font-semibold text-[#E9530E]">v0.0.75</span>
        </footer>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Perfil Institucional</DialogTitle>
            <DialogDescription>
              Atualize as informações do seu usuário do time de Gente & Gestão SouYess.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="prof-email" className="text-xs font-semibold text-[#4D5566]">
                Email institucional
              </Label>
              <Input
                id="prof-email"
                value={user?.email || ''}
                disabled
                className="bg-[#F2F4F8] text-[#6B7384]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prof-name" className="text-xs font-semibold text-[#212B55]">
                Nome completo
              </Label>
              <Input
                id="prof-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ex: Douglas Severo"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#4D5566]">
                Perfil de Acesso & Escopo
              </Label>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Função:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {user?.cargo_funcao || 'RH / Recrutador'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Escopo BU:</span>
                  <span className="font-semibold text-[#E9530E]">
                    {user?.cargo_funcao === 'Gestor Contratante'
                      ? user?.empresa
                        ? 'Líder de BU (Escopado)'
                        : 'Líder sem BU'
                      : 'Grupo Consolidado (Todas as BUs)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setProfileModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-[#E9530E] hover:bg-[#C5430A] text-white"
              onClick={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

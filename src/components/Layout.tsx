import { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePeriod } from '@/contexts/PeriodContext'
import {
  LayoutDashboard,
  Briefcase,
  Users2,
  GitPullRequest,
  Calendar,
  MessageSquare,
  FileText,
  LogOut,
  User,
  Menu,
  X,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
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
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Vagas', href: '/vagas', icon: Briefcase },
  { title: 'Candidatos', href: '/candidatos', icon: Users2 },
  { title: 'Pipeline', href: '/pipeline', icon: GitPullRequest },
  { title: 'Entrevistas', href: '/entrevistas', icon: Calendar },
  { title: 'Chat com IA', href: '/chat', icon: MessageSquare, badge: 'Agente' },
  { title: 'Relatórios', href: '/relatorios', icon: FileText },
]

export default function Layout() {
  const { user, logout, refreshUser } = useAuth()
  const { period, setPeriod } = usePeriod()
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [editName, setEditName] = useState(user?.name || '')
  const [savingProfile, setSavingProfile] = useState(false)

  const getPageTitle = () => {
    const path = location.pathname
    if (path.startsWith('/dashboard')) return 'Painel Geral de Recrutamento'
    if (path.startsWith('/vagas/')) return 'Detalhes da Vaga'
    if (path === '/vagas') return 'Gestão de Vagas'
    if (path.startsWith('/candidatos/')) return 'Perfil do Candidato'
    if (path === '/candidatos') return 'Banco de Talentos'
    if (path.startsWith('/pipeline')) return 'Pipeline de Seleção (Kanban)'
    if (path.startsWith('/entrevistas')) return 'Gestão de Entrevistas & Calendário'
    if (path.startsWith('/chat')) return 'Chat com Gestor de Talentos (IA)'
    if (path.startsWith('/relatorios/')) return 'Relatório de Avaliação'
    if (path === '/relatorios') return 'Relatórios de Aderência e IA'
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
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-200">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base text-white tracking-tight">Gente & Gestão</span>
          <span className="text-[11px] text-slate-400 font-medium">Sistema RH Inteligente</span>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-600 rounded-r-full" />
              )}
              <Icon
                className={`w-4 h-4 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`}
              />
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </div>

      {/* User Footer Card */}
      <div className="p-3 border-t border-slate-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800/70 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500">
              <Avatar className="h-9 w-9 border border-slate-700 bg-slate-800 text-slate-200 font-semibold text-xs">
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {user?.name || 'Douglas Severo'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user?.email || 'admin@empresa.com'}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 mb-2 bg-slate-900 border-slate-800 text-slate-200"
          >
            <DropdownMenuLabel className="text-xs text-slate-400">Minha Conta</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                setEditName(user?.name || '')
                setProfileModalOpen(true)
              }}
              className="hover:bg-slate-800 cursor-pointer text-xs"
            >
              <User className="w-3.5 h-3.5 mr-2" />
              Editar perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="text-red-400 hover:bg-slate-800 hover:text-red-300 cursor-pointer text-xs"
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
    <div className="min-h-screen flex bg-[#F8FAFC]">
      {/* Desktop Sidebar (260px fixed) */}
      <aside className="hidden md:flex flex-col w-[260px] fixed inset-y-0 left-0 z-30 shadow-md">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-[280px] max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-250">
            {sidebarContent}
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 text-slate-400 hover:text-white p-1 rounded-md"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-[260px] min-h-screen">
        {/* Header (64px) */}
        <header className="h-16 sticky top-0 z-20 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate">
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="hidden sm:flex items-center gap-2">
              <Select
                value={period}
                onValueChange={(val) => setPeriod(val as '7d' | '30d' | '90d')}
              >
                <SelectTrigger className="w-[160px] h-9 text-xs font-medium border-slate-200 bg-slate-50 text-slate-700">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d" className="text-xs">
                    Últimos 7 dias
                  </SelectItem>
                  <SelectItem value="30d" className="text-xs">
                    Últimos 30 dias
                  </SelectItem>
                  <SelectItem value="90d" className="text-xs">
                    Últimos 90 dias
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Header user avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                  aria-label="Menu do usuário"
                >
                  <Avatar className="h-9 w-9 border border-slate-200 shadow-xs cursor-pointer bg-blue-50 text-blue-700 font-semibold text-xs">
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-1">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 text-xs">
                      {user?.name || 'Douglas Severo'}
                    </span>
                    <span className="text-[11px] text-slate-500 truncate">
                      {user?.email || 'admin@empresa.com'}
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
                  <User className="w-3.5 h-3.5 mr-2 text-slate-500" />
                  Editar perfil
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout()
                    navigate('/login')
                  }}
                  className="text-red-600 cursor-pointer text-xs focus:text-red-600 focus:bg-red-50"
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
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Perfil Institucional</DialogTitle>
            <DialogDescription>
              Atualize as informações do seu usuário do time de Gente & Gestão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="prof-email" className="text-xs font-semibold text-slate-600">
                Email
              </Label>
              <Input
                id="prof-email"
                value={user?.email || ''}
                disabled
                className="bg-slate-50 text-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prof-name" className="text-xs font-semibold text-slate-700">
                Nome completo
              </Label>
              <Input
                id="prof-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ex: Douglas Severo"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setProfileModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
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

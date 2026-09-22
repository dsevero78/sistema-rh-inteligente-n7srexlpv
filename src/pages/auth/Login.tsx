import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import pb, { singleFlightAuthRefresh } from '@/lib/pocketbase/client'
import { getStoredAuth } from '@/contexts/AuthContext'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Users, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Login() {
  const { login, isAuthenticated, syncAuthNow } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const rawTarget =
    (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
  const targetPath = rawTarget.startsWith('/login') ? '/dashboard' : rawTarget

  const [email, setEmail] = useState('severo.douglas2@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [isLoading, setIsLoading] = useState(false)
  const [isAutoRecovering, setIsAutoRecovering] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Helper para redirecionar incondicionalmente com fallback de segurança por window.location.replace
  const executeGuaranteedRedirect = (dest: string) => {
    console.info(`[Login] Executando redirecionamento garantido para ${dest}`)
    navigate(dest, { replace: true })

    // Rede de segurança: se a rota do navegador ainda estiver em /login, força redirecionamento incondicional
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/login')) {
        console.warn(
          `[Login] Fallback de segurança acionado. Forçando window.location.replace('${dest}')...`,
        )
        window.location.replace(dest)
      }
    }, 250)
  }

  // Fallback de recuperação automática em /login:
  // Se o usuário estiver na rota /login mas tiver credencial salva ou válida,
  // revalidar e navegar incondicionalmente para o painel.
  useEffect(() => {
    let isCancelled = false

    async function checkExistingSession() {
      // Se já autenticado no contexto
      if (isAuthenticated) {
        executeGuaranteedRedirect(targetPath)
        return
      }

      const stored = getStoredAuth()
      const hasStoredToken = Boolean(stored?.token && stored.token.length > 10)
      const hasMemToken = Boolean(pb.authStore.token && pb.authStore.token.length > 10)

      if (hasMemToken || hasStoredToken) {
        // Redireciona imediatamente para o painel se já temos credencial preservada
        const tokenToUse = pb.authStore.token || stored?.token || ''
        const modelToUse = pb.authStore.record || stored?.model || null
        if (!pb.authStore.token && stored?.token) {
          pb.authStore.save(stored.token, stored.model)
        }
        syncAuthNow(tokenToUse, modelToUse)
        executeGuaranteedRedirect(targetPath)

        // Em segundo plano, dispara validação no backend
        try {
          await singleFlightAuthRefresh()
        } catch (err: unknown) {
          console.warn('[Login] Refresh de fundo completado ou com erro transitório:', err)
        }
        return
      }
    }

    checkExistingSession()

    return () => {
      isCancelled = true
    }
  }, [isAuthenticated, targetPath, navigate, syncAuthNow, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError(null)
    setFieldErrors({})

    if (!email.trim()) {
      setFieldErrors((prev) => ({ ...prev, email: 'Email é obrigatório' }))
      return
    }
    if (!password) {
      setFieldErrors((prev) => ({ ...prev, password: 'Senha é obrigatória' }))
      return
    }

    setIsLoading(true)
    try {
      await login(email, password)
      toast({
        title: 'Bem-vindo(a) ao Sistema RH Inteligente',
        description: 'Sessão iniciada com sucesso.',
      })
      executeGuaranteedRedirect(targetPath)
    } catch (err: unknown) {
      const extracted = extractFieldErrors(err)
      if (Object.keys(extracted).length > 0) {
        setFieldErrors(extracted)
      } else {
        setGeneralError('Email ou senha incorretos, ou conta pendente de verificação.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F8FB] dark:bg-[#11162B] relative overflow-hidden px-4">
      {/* SouYess Brand Geometry Accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Navy Deep Hero Backdrop arc */}
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-[#1A2240]/10 dark:bg-[#1A2240]/40 blur-2xl" />
        {/* SouYess Orange Corner Geometry (Iconic visual from Brand Guide) */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#E9530E]/10 dark:bg-[#E9530E]/20 rounded-bl-[200px]" />
        <div className="absolute top-36 right-28 w-24 h-24 rounded-full border-4 border-[#E9530E]/20 dark:border-[#E9530E]/30 bg-transparent" />
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#BFC5D2_1px,transparent_1px)] dark:bg-[radial-gradient(#2E3A6E_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      <Card className="w-full max-w-md relative z-10 border-[#E7EAF0] dark:border-[#2E3A6E] shadow-[0_16px_32px_rgba(11,18,48,0.10)] dark:shadow-[0_20px_48px_rgba(0,0,0,0.5)] bg-white dark:bg-[#1A2240] rounded-2xl overflow-hidden">
        {/* Brand Top Bar */}
        <div className="h-1.5 bg-gradient-to-r from-[#11162B] via-[#1A2240] to-[#E9530E]" />

        <CardHeader className="space-y-3 text-center pb-6 pt-7 border-b border-[#F2F4F8]">
          <div className="mx-auto flex items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-[#1A2240] flex items-center justify-center text-[#F7F8FB] shadow-md shadow-[#11162B]/25 font-extrabold text-base tracking-widest border-2 border-[#E9530E]">
              SY
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#E9530E] mb-1">
              SouYess Design System
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-[#11162B] uppercase">
              Gente &amp; Gestão
            </CardTitle>
            <CardDescription className="text-[#6B7384] text-xs mt-1">
              Sistema RH Inteligente · Plataforma Corporativa
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-6">
            {isAutoRecovering && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs font-medium animate-pulse">
                <Loader2 className="w-4 h-4 shrink-0 animate-spin text-blue-600" />
                <span>Identificamos uma sessão salva. Validando e recuperando seu acesso...</span>
              </div>
            )}

            {generalError && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#F8DDD9] border border-[#f1b4ac] text-[#8B1E14] text-xs font-medium">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#D5392C]" />
                <span>{generalError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-bold uppercase tracking-wider text-[#212B55]"
              >
                Email institucional
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#98A0B0]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-10 ${fieldErrors.email ? 'border-[#D5392C]' : ''}`}
                  disabled={isLoading}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-[#D5392C] mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wider text-[#212B55]"
                >
                  Senha de acesso
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#E9530E] hover:text-[#C5430A] font-semibold hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#98A0B0]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 ${fieldErrors.password ? 'border-[#D5392C]' : ''}`}
                  disabled={isLoading}
                />
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-[#D5392C] mt-1">{fieldErrors.password}</p>
              )}
            </div>

            <div className="bg-[#FEF1EA] p-3 rounded-lg border border-[#FBDCC9] text-xs text-[#9B340A] flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold">RH (Consolidado):</span>
                <span className="font-mono text-[#11162B] dark:text-[#F7F8FB] bg-white dark:bg-[#11162B] px-2 py-0.5 rounded text-[10px] border border-[#FBDCC9] dark:border-[#2E3A6E]">
                  severo.douglas2@gmail.com / Skip@Pass
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Líder BU Tecnologia:</span>
                <span className="font-mono text-[#11162B] dark:text-[#F7F8FB] bg-white dark:bg-[#11162B] px-2 py-0.5 rounded text-[10px] border border-[#FBDCC9] dark:border-[#2E3A6E]">
                  gestor@empresa.com / Skip@Pass
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Líder BU Vértice Mídia:</span>
                <span className="font-mono text-[#11162B] dark:text-[#F7F8FB] bg-white dark:bg-[#11162B] px-2 py-0.5 rounded text-[10px] border border-[#FBDCC9] dark:border-[#2E3A6E]">
                  gestora.produto@empresa.com / Skip@Pass
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 border-t border-[#F2F4F8] pt-5">
            <Button
              type="submit"
              className="w-full bg-[#E9530E] hover:bg-[#C5430A] text-white font-bold tracking-wide shadow-sm hover:shadow-md transition-all h-11"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  Entrar no sistema
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-1.5 text-xs text-[#6B7384]">
              <ShieldCheck className="w-4 h-4 text-[#1F9D6A]" />
              <span>Ambiente seguro corporativo · SouYess People Hub</span>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

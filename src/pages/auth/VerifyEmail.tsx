import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Users, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [isLoading, setIsLoading] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function verify() {
      if (!token) {
        setIsLoading(false)
        setError('Token de validação não fornecido ou inválido.')
        return
      }

      try {
        await pb.collection('users').confirmVerification(token)
        setIsSuccess(true)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Falha ao confirmar email institucional.')
      } finally {
        setIsLoading(false)
      }
    }

    verify()
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden px-4">
      <Card className="w-full max-w-md relative z-10 border-slate-200 shadow-xl bg-white rounded-xl">
        <CardHeader className="space-y-3 text-center pb-6 border-b border-slate-100">
          <div className="mx-auto w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
              Verificação de Conta
            </CardTitle>
            <CardDescription className="text-slate-500 text-sm mt-1">
              Confirmação de acesso ao Sistema RH Inteligente
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-8 pb-6 text-center space-y-4">
          {isLoading && (
            <div className="py-6 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm text-slate-600">Validando credencial e token corporativo...</p>
            </div>
          )}

          {!isLoading && isSuccess && (
            <div className="space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">Email Verificado!</h3>
              <p className="text-sm text-slate-600">
                Sua conta foi autenticada e ativada com sucesso. Você já possui permissão para
                acessar o painel de Gente & Gestão.
              </p>
            </div>
          )}

          {!isLoading && error && (
            <div className="space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">Falha na Verificação</h3>
              <p className="text-sm text-slate-600">{error}</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t border-slate-100 pt-5 pb-6">
          <Link to="/login" className="w-full">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium h-10">
              Ir para o Login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}

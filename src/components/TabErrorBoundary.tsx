import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'

interface TabErrorBoundaryProps {
  tabName?: string
  onResetToDefaultTab?: () => void
  children: ReactNode
}

interface TabErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class TabErrorBoundary extends Component<TabErrorBoundaryProps, TabErrorBoundaryState> {
  public state: TabErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): Partial<TabErrorBoundaryState> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[TabErrorBoundary] Erro capturado na aba "${this.props.tabName || 'Geral'}":`,
      error,
      errorInfo,
    )
    this.setState({ errorInfo })
  }

  private handleTentarNovamente = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  public componentDidUpdate(prevProps: TabErrorBoundaryProps) {
    // Se mudou de aba ou props essenciais, limpa o estado de erro
    if (this.state.hasError && prevProps.tabName !== this.props.tabName) {
      this.setState({ hasError: false, error: null, errorInfo: null })
    }
  }

  public render() {
    if (this.state.hasError) {
      const nomeAba = this.props.tabName || 'esta aba'

      return (
        <Card className="border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 my-4 shadow-sm">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-red-950 dark:text-red-100 font-display">
                  Instabilidade na exibição da aba: {nomeAba}
                </CardTitle>
                <CardDescription className="text-xs text-red-800/80 dark:text-red-300/80 mt-0.5">
                  Ocorreu um erro inesperado na renderização deste painel, mas seus dados cadastrais
                  e sua sessão de trabalho continuam preservados.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 pt-2 space-y-4">
            {this.state.error && (
              <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-lg border border-red-200 dark:border-red-900/50 text-xs font-mono text-red-700 dark:text-red-300 overflow-x-auto max-h-32">
                <span className="font-bold">Detalhe técnico: </span>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleTentarNovamente}
                className="text-xs font-bold gap-1.5 border-red-300 text-red-800 hover:bg-red-100 dark:text-red-200 dark:border-red-800"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar novamente
              </Button>

              {this.props.onResetToDefaultTab && (
                <Button
                  size="sm"
                  onClick={this.props.onResetToDefaultTab}
                  className="text-xs font-bold gap-1.5 bg-[#E9530E] hover:bg-[#C5430A] text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar para Dados Cadastrais
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

export default TabErrorBoundary

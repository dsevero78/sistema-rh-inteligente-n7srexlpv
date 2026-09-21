import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { PeriodProvider } from '@/contexts/PeriodContext'
import { ProtectedRoute, PublicRoute } from '@/components/auth/AuthGuards'
import Layout from '@/components/Layout'

// Public Auth Pages
import Login from '@/pages/auth/Login'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword'
import VerifyEmail from '@/pages/auth/VerifyEmail'

// Public Candidate Portal (sem login)
import CandidaturaPublica from '@/pages/CandidaturaPublica'
import CandidatoPortalPublico from '@/pages/CandidatoPortalPublico'

// Authenticated App Pages
import Dashboard from '@/pages/Dashboard'
import MeuDia from '@/pages/MeuDia'
import Vagas from '@/pages/Vagas'
import VagaDetalhes from '@/pages/VagaDetalhes'
import GestorPortal from '@/pages/GestorPortal'
import Candidatos from '@/pages/Candidatos'
import CandidatoDetalhes from '@/pages/CandidatoDetalhes'
import Pipeline from '@/pages/Pipeline'
import Ofertas from '@/pages/Ofertas'
import Chat from '@/pages/Chat'
import Entrevistas from '@/pages/Entrevistas'
import Relatorios from '@/pages/Relatorios'
import RelatorioDetalhes from '@/pages/RelatorioDetalhes'
import ImportarDados from '@/pages/ImportarDados'
import BancoTalentos from '@/pages/BancoTalentos'
import RelatorioExecutivo from '@/pages/RelatorioExecutivo'
import Indicadores from '@/pages/Indicadores'
import Financeiro from '@/pages/Financeiro'
import Alertas from '@/pages/Alertas'
import Onboarding from '@/pages/Onboarding'
import RotinaIntegracaoPage from '@/pages/RotinaIntegracaoPage'
import ExperienciaCandidato from '@/pages/ExperienciaCandidato'
import PessoasListaPage from '@/pages/PessoasListaPage'
import PessoaDetalhesPage from '@/pages/PessoaDetalhesPage'
import AdmissaoPublica from '@/pages/AdmissaoPublica'
import ExperienciaPublica from '@/pages/ExperienciaPublica'
import IndicarPublica from '@/pages/IndicarPublica'
import Indicacoes from '@/pages/Indicacoes'
import RedirecionamentoPrestadorParaPessoa from '@/pages/RedirecionamentoPrestadorParaPessoa'
import HorasCompetenciasPage from '@/pages/HorasCompetenciasPage'
import NotFound from '@/pages/NotFound'

import { Toaster } from '@/components/ui/toaster'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <PeriodProvider>
            <Routes>
              {/* Public Routes with Guard */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicRoute>
                    <ForgotPassword />
                  </PublicRoute>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <PublicRoute>
                    <ResetPassword />
                  </PublicRoute>
                }
              />
              <Route
                path="/verify-email"
                element={
                  <PublicRoute>
                    <VerifyEmail />
                  </PublicRoute>
                }
              />

              {/* Public Candidate Routes (Página de Carreira, Admissão e Pesquisa de Experiência) */}
              <Route path="/candidatar" element={<CandidaturaPublica />} />
              <Route path="/candidatar/:vagaId" element={<CandidaturaPublica />} />
              <Route path="/candidato/:token" element={<CandidatoPortalPublico />} />
              <Route path="/admissao/:token" element={<AdmissaoPublica />} />
              <Route path="/experiencia/:token" element={<ExperienciaPublica />} />
              <Route path="/indicar/:token" element={<IndicarPublica />} />

              {/* Authenticated Global Layout Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="meu-dia" element={<MeuDia />} />
                <Route path="horas-competencias" element={<HorasCompetenciasPage />} />
                <Route path="pessoas" element={<PessoasListaPage />} />
                <Route path="pessoas/:id" element={<PessoaDetalhesPage />} />
                <Route path="gestor" element={<GestorPortal />} />
                <Route path="vagas" element={<Vagas />} />
                <Route path="vagas/:id" element={<VagaDetalhes />} />
                <Route path="candidatos" element={<Candidatos />} />
                <Route path="candidatos/:id" element={<CandidatoDetalhes />} />
                <Route path="pipeline" element={<Pipeline />} />
                <Route path="ofertas" element={<Ofertas />} />
                <Route path="onboarding" element={<Onboarding />} />
                <Route path="integracao" element={<RotinaIntegracaoPage />} />
                <Route path="experiencia" element={<ExperienciaCandidato />} />{' '}
                <Route path="indicacoes" element={<Indicacoes />} />
                {/* Redirecionamento unificado: Prestadores PJ -> Pessoas */}
                <Route path="prestadores" element={<RedirecionamentoPrestadorParaPessoa />} />
                <Route path="prestadores/:id" element={<RedirecionamentoPrestadorParaPessoa />} />
                <Route path="prestadores-pj" element={<RedirecionamentoPrestadorParaPessoa />} />
                <Route
                  path="prestadores-pj/:id"
                  element={<RedirecionamentoPrestadorParaPessoa />}
                />
                <Route path="banco-talentos" element={<BancoTalentos />} />{' '}
                <Route path="alertas" element={<Alertas />} />{' '}
                <Route path="entrevistas" element={<Entrevistas />} />
                <Route path="chat" element={<Chat />} />
                <Route path="financeiro" element={<Financeiro />} />
                <Route path="importar" element={<ImportarDados />} />
                <Route path="indicadores" element={<Indicadores />} />
                <Route path="relatorios" element={<Relatorios />} />
                <Route path="relatorio-executivo" element={<RelatorioExecutivo />} />
                <Route path="relatorios/:id" element={<RelatorioDetalhes />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </PeriodProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

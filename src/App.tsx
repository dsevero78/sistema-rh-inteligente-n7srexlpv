import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { PeriodProvider } from '@/contexts/PeriodContext'
import { ProtectedRoute, PublicRoute } from '@/components/auth/AuthGuards'
import Layout from '@/components/Layout'

// Public Auth Pages
import Login from '@/pages/auth/Login'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword'
import VerifyEmail from '@/pages/auth/VerifyEmail'

// Authenticated App Pages
import Dashboard from '@/pages/Dashboard'
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
import BancoTalentos from '@/pages/BancoTalentos'
import RelatorioExecutivo from '@/pages/RelatorioExecutivo'
import Alertas from '@/pages/Alertas'
import NotFound from '@/pages/NotFound'

import { Toaster } from '@/components/ui/toaster'

export default function App() {
  return (
    <BrowserRouter>
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
              <Route path="gestor" element={<GestorPortal />} />
              <Route path="vagas" element={<Vagas />} />
              <Route path="vagas/:id" element={<VagaDetalhes />} />
              <Route path="candidatos" element={<Candidatos />} />
              <Route path="candidatos/:id" element={<CandidatoDetalhes />} />
              <Route path="pipeline" element={<Pipeline />} />
              <Route path="ofertas" element={<Ofertas />} />
              <Route path="banco-talentos" element={<BancoTalentos />} />
              <Route path="alertas" element={<Alertas />} />
              <Route path="entrevistas" element={<Entrevistas />} />
              <Route path="chat" element={<Chat />} />
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
    </BrowserRouter>
  )
}

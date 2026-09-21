import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import AssistenteImportacao, {
  type TipoEntidadeImportacao,
} from '@/components/AssistenteImportacao'
import ModalVagasEmLinha from '@/components/ModalVagasEmLinha'
import {
  FileSpreadsheet,
  Briefcase,
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  LayoutDashboard,
  Calendar,
  Grid,
  Download,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { baixarModeloCandidatos, baixarModeloVagas } from '@/lib/templatesImportacao'
import type { RecordModel } from 'pocketbase'

export default function ImportarDados() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const abaAtiva = (searchParams.get('tipo') as TipoEntidadeImportacao) || 'candidatos'

  const [modalGridVagasOpen, setModalGridVagasOpen] = useState(false)
  const [totalVagas, setTotalVagas] = useState(0)
  const [totalCandidatos, setTotalCandidatos] = useState(0)
  const [carregandoStatus, setCarregandoStatus] = useState(true)

  const carregarStatusBanco = async () => {
    try {
      const [vList, cList] = await Promise.all([
        pb.collection('vagas').getFullList({ fields: 'id' }),
        pb.collection('candidatos').getFullList({ fields: 'id' }),
      ])
      setTotalVagas(vList.length)
      setTotalCandidatos(cList.length)
    } catch (err) {
      console.warn('Erro ao verificar total do banco:', err)
    } finally {
      setCarregandoStatus(false)
    }
  }

  useEffect(() => {
    carregarStatusBanco()
  }, [])

  const handleTabChange = (val: string) => {
    setSearchParams({ tipo: val })
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300 font-sans pb-12">
      {/* Banner Principal de Boas-Vindas & Onboarding de Valor */}
      <div className="bg-gradient-to-r from-[#11162B] via-[#1A2240] to-[#212B55] text-white p-6 sm:p-8 rounded-2xl border border-[#2E3A6E] shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#E9530E]/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-[10px] uppercase font-bold tracking-widest text-[#F19763] bg-[#E9530E]/20 px-2.5 py-0.5 rounded-full border border-[#E9530E]/30">
              Onboarding de Valor em 10 Minutos
            </span>
            <span className="text-xs text-[#A8B0C9] font-medium">
              · Veja o sistema com seus próprios dados
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F7F8FB]">
            Assistente de Importação &amp; Cadastro em Lote
          </h1>

          <p className="text-xs sm:text-sm text-[#D3D7E5] leading-relaxed">
            O mercado compra o que consegue ver funcionando com seus dados. Em minutos, traga suas
            vagas em aberto e planilha de candidatos para ativar o matching semântico com IA, o
            pipeline Kanban e a rotina inteligente do Meu Dia.
          </p>

          {/* Checklist de Ativação do Sistema */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
            <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 p-2.5 rounded-xl">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  totalVagas > 0 ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#F7F8FB] truncate">
                  1. Vagas Estratégicas
                </p>
                <p className="text-[11px] text-[#A8B0C9]">
                  {totalVagas > 0 ? `${totalVagas} cadastradas` : 'Nenhuma cadastrada'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 p-2.5 rounded-xl">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  totalCandidatos > 0 ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#F7F8FB] truncate">
                  2. Banco de Talentos
                </p>
                <p className="text-[11px] text-[#A8B0C9]">
                  {totalCandidatos > 0 ? `${totalCandidatos} candidatos` : 'Aguardando planilha'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 p-2.5 rounded-xl">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  totalVagas > 0 && totalCandidatos > 0
                    ? 'bg-[#E9530E] text-white'
                    : 'bg-white/10 text-white/50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#F7F8FB] truncate">
                  3. Matching &amp; IA
                </p>
                <p className="text-[11px] text-[#A8B0C9]">
                  {totalVagas > 0 && totalCandidatos > 0
                    ? 'Pronto para operar'
                    : 'Ativa após importar'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de Seleção de Fluxo */}
      <Tabs value={abaAtiva} onValueChange={handleTabChange} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#2E3A6E] pb-3">
          <TabsList className="bg-slate-100 dark:bg-[#1A2240] p-1 border border-slate-200 dark:border-[#2E3A6E]">
            <TabsTrigger
              value="candidatos"
              className="text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#11162B] data-[state=active]:text-[#E9530E]"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Importar Candidatos (Planilha)
            </TabsTrigger>
            <TabsTrigger
              value="vagas"
              className="text-xs font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-[#11162B] data-[state=active]:text-[#E9530E]"
            >
              <Briefcase className="w-3.5 h-3.5 mr-1.5" />
              Cadastrar Vagas em Lote
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {abaAtiva === 'vagas' && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setModalGridVagasOpen(true)}
                className="text-xs border-[#FBDCC9] dark:border-[#E9530E]/30 text-[#E9530E] bg-[#FEF1EA] dark:bg-[#E9530E]/10 font-bold hover:bg-[#FBDCC9]"
              >
                <Grid className="w-3.5 h-3.5 mr-1.5 text-[#E9530E]" />
                Cadastro Rápido em Linha (Grid)
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                abaAtiva === 'candidatos' ? baixarModeloCandidatos(true) : baixarModeloVagas(true)
              }
              className="text-xs border-slate-300 dark:border-[#2E3A6E] text-slate-700 dark:text-slate-300 font-semibold"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-[#E9530E]" />
              Baixar Modelo Pré-preenchido
            </Button>
          </div>
        </div>

        {/* Conteúdo Aba Candidatos */}
        <TabsContent value="candidatos" className="space-y-6 m-0">
          <AssistenteImportacao tipoPadrao="candidatos" onSucesso={() => carregarStatusBanco()} />
        </TabsContent>

        {/* Conteúdo Aba Vagas */}
        <TabsContent value="vagas" className="space-y-6 m-0">
          <div className="bg-white dark:bg-[#1A2240] p-4 rounded-xl border border-slate-200 dark:border-[#2E3A6E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF1EA] dark:bg-[#E9530E]/20 text-[#E9530E] flex items-center justify-center font-bold shrink-0">
                <Grid className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-[#212B55] dark:text-[#F7F8FB]">
                  Prefere cadastrar vagas sem planilha?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Use nosso grid em linha para adicionar 2, 5 ou 10 vagas rapidamente em uma tabela
                  editável.
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setModalGridVagasOpen(true)}
              className="text-xs bg-[#E9530E] hover:bg-[#C5430A] text-white font-bold shadow-xs whitespace-nowrap"
            >
              <Grid className="w-3.5 h-3.5 mr-1.5" />
              Abrir Grid de Vagas
            </Button>
          </div>

          <AssistenteImportacao tipoPadrao="vagas" onSucesso={() => carregarStatusBanco()} />
        </TabsContent>
      </Tabs>

      {/* Modal de Cadastro em Linha de Vagas */}
      <ModalVagasEmLinha
        open={modalGridVagasOpen}
        onOpenChange={setModalGridVagasOpen}
        onSucesso={() => carregarStatusBanco()}
      />
    </div>
  )
}

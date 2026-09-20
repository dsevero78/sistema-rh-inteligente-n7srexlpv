import React, { useState, useEffect } from 'react'
import {
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Search,
  Filter,
  Sliders,
  Building2,
  Calendar,
  User,
  Save,
  Check,
  Power,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import type { RecordSubscription } from 'pocketbase'

interface ConfigEmailStatus {
  id: string
  vaga?: string
  ativo: boolean
  assunto_personalizado?: string
  mensagem_adicional?: string
}

interface LogEmailStatus {
  id: string
  candidato: string
  vaga: string
  estagio: string
  candidato_nome: string
  candidato_email: string
  vaga_titulo: string
  assunto: string
  status_envio: 'Enviado' | 'Falhou' | 'Simulado'
  mensagem_resumo: string
  data_envio: string
  created: string
}

interface VagaItem {
  id: string
  titulo: string
  departamento: string
  status: string
}

export function CentralEmailsStatus() {
  const { toast } = useToast()

  // Estados principais
  const [configGlobal, setConfigGlobal] = useState<ConfigEmailStatus | null>(null)
  const [configsVagas, setConfigsVagas] = useState<ConfigEmailStatus[]>([])
  const [vagas, setVagas] = useState<VagaItem[]>([])
  const [logs, setLogs] = useState<LogEmailStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [salvandoGlobal, setSalvandoGlobal] = useState(false)
  const [salvandoVagaId, setSalvandoVagaId] = useState<string | null>(null)

  // Filtros de Auditoria
  const [busca, setBusca] = useState('')
  const [filtroEstagio, setFiltroEstagio] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  // Vaga selecionada para configuração individual
  const [vagaSelecionada, setVagaSelecionada] = useState<string>('')
  const [vagaAtivo, setVagaAtivo] = useState(true)

  // Carregar dados
  const carregarDados = async () => {
    try {
      setLoading(true)

      // 1. Vagas
      const vList = await pb.collection('vagas').getFullList<VagaItem>({
        sort: '-created',
      })
      setVagas(vList)

      // 2. Configurações
      const cList = await pb.collection('config_emails_status').getFullList<ConfigEmailStatus>()
      const global = cList.find((c) => !c.vaga)
      setConfigGlobal(
        global || {
          id: '',
          ativo: true,
          assunto_personalizado: 'Atualização sobre seu processo seletivo na {{empresa}}',
          mensagem_adicional:
            'Nosso time de Gente & Gestão preza pela transparência em todas as etapas da sua jornada.',
        },
      )
      setConfigsVagas(cList.filter((c) => !!c.vaga))

      // 3. Logs de auditoria (últimos 50)
      const lList = await pb.collection('logs_emails_status').getList<LogEmailStatus>(1, 50, {
        sort: '-created',
      })
      setLogs(lList.items)
    } catch (err: any) {
      console.error('Falha ao carregar central de e-mails de status:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Inscrição Realtime no log de e-mails
  useRealtime<any>(
    'logs_emails_status',
    (data: RecordSubscription<any>) => {
      if (data.action === 'create' && data.record) {
        setLogs((prev) => [data.record as LogEmailStatus, ...prev.slice(0, 49)])
      }
    },
    true,
  )

  // Atualizar seleção de vaga
  const handleSelecionarVaga = (vagaId: string) => {
    setVagaSelecionada(vagaId)
    const existente = configsVagas.find((c) => c.vaga === vagaId)
    if (existente) {
      setVagaAtivo(existente.ativo)
    } else {
      setVagaAtivo(true)
    }
  }

  // Salvar Toggle Global
  const handleSalvarGlobal = async () => {
    if (!configGlobal) return
    setSalvandoGlobal(true)
    try {
      if (configGlobal.id) {
        await pb.collection('config_emails_status').update(configGlobal.id, {
          ativo: configGlobal.ativo,
          assunto_personalizado: configGlobal.assunto_personalizado,
          mensagem_adicional: configGlobal.mensagem_adicional,
        })
      } else {
        const criado = await pb.collection('config_emails_status').create({
          vaga: null,
          ativo: configGlobal.ativo,
          assunto_personalizado: configGlobal.assunto_personalizado,
          mensagem_adicional: configGlobal.mensagem_adicional,
        })
        setConfigGlobal({ ...configGlobal, id: criado.id })
      }

      toast({
        title: 'Configuração global atualizada',
        description: `Automação global de e-mails de status agora está ${
          configGlobal.ativo ? 'ATIVA' : 'DESATIVADA'
        }.`,
      })
    } catch (err: any) {
      toast({
        title: 'Falha ao salvar',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoGlobal(false)
    }
  }

  // Salvar Toggle por Vaga
  const handleSalvarVaga = async () => {
    if (!vagaSelecionada) return
    setSalvandoVagaId(vagaSelecionada)
    try {
      const existente = configsVagas.find((c) => c.vaga === vagaSelecionada)
      if (existente) {
        const atualizado = await pb
          .collection('config_emails_status')
          .update<ConfigEmailStatus>(existente.id, {
            ativo: vagaAtivo,
          })
        setConfigsVagas(configsVagas.map((c) => (c.id === existente.id ? atualizado : c)))
      } else {
        const criado = await pb.collection('config_emails_status').create<ConfigEmailStatus>({
          vaga: vagaSelecionada,
          ativo: vagaAtivo,
        })
        setConfigsVagas([...configsVagas, criado])
      }

      toast({
        title: 'Regra de vaga salva',
        description: `E-mails de status para esta vaga agora estão ${
          vagaAtivo ? 'ATIVOS' : 'DESATIVADOS'
        }.`,
      })
    } catch (err: any) {
      toast({
        title: 'Falha ao salvar regra da vaga',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoVagaId(null)
    }
  }

  // Filtragem dos Logs de Auditoria
  const logsFiltrados = logs.filter((log) => {
    if (busca) {
      const q = busca.toLowerCase()
      const match =
        log.candidato_nome?.toLowerCase().includes(q) ||
        log.candidato_email?.toLowerCase().includes(q) ||
        log.vaga_titulo?.toLowerCase().includes(q) ||
        log.assunto?.toLowerCase().includes(q)
      if (!match) return false
    }

    if (filtroEstagio !== 'todos' && log.estagio !== filtroEstagio) {
      return false
    }

    if (filtroStatus !== 'todos' && log.status_envio !== filtroStatus) {
      return false
    }

    return true
  })

  return (
    <div className="space-y-6">
      {/* Cards de Toggles: Global e Por Vaga */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Toggle Global */}
        <Card className="border-slate-200 shadow-xs bg-white p-6 space-y-5 rounded-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#1D4ED8] flex items-center justify-center font-bold">
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Automação Global de E-mails</h3>
                <p className="text-xs text-slate-500">
                  Avisa automaticamente o candidato a cada mudança no pipeline
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">
                {configGlobal?.ativo ? 'Ativo' : 'Pausado'}
              </span>
              <Switch
                checked={configGlobal?.ativo ?? true}
                onCheckedChange={(checked) =>
                  setConfigGlobal((prev) => (prev ? { ...prev, ativo: checked } : null))
                }
              />
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-600 bg-slate-50/70 p-4 rounded-lg border border-slate-200/70">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p>
                <strong>Deduplicação Inteligente:</strong> O sistema bloqueia envios repetidos para
                o mesmo estágio consecutivo e agrupa movimentações.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p>
                <strong>Comunicação Empática em pt-BR:</strong> Textos contextuais respeitosos para
                Triagem, Entrevistas, Proposta e Reprovação (sem expor motivos internos).
              </p>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p>
                <strong>Proteção LGPD:</strong> E-mails enviados unicamente aos candidatos que
                autorizaram o tratamento de dados.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              onClick={handleSalvarGlobal}
              disabled={salvandoGlobal}
              className="bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-semibold"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {salvandoGlobal ? 'Salvando...' : 'Salvar Configuração Global'}
            </Button>
          </div>
        </Card>

        {/* Toggle Por Vaga */}
        <Card className="border-slate-200 shadow-xs bg-white p-6 space-y-5 rounded-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Controle por Vaga Específica</h3>
                <p className="text-xs text-slate-500">
                  Desative ou reative o envio automático para posições confidenciais
                </p>
              </div>
            </div>

            {vagaSelecionada && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  {vagaAtivo ? 'Ativo' : 'Desativado'}
                </span>
                <Switch checked={vagaAtivo} onCheckedChange={setVagaAtivo} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">
              Selecione a Vaga para Ajustar:
            </Label>
            <select
              value={vagaSelecionada}
              onChange={(e) => handleSelecionarVaga(e.target.value)}
              className="w-full text-xs h-9 px-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            >
              <option value="">Escolha uma vaga...</option>
              {vagas.map((v) => {
                const conf = configsVagas.find((c) => c.vaga === v.id)
                const statusTexto = conf
                  ? conf.ativo
                    ? ' (Ativo)'
                    : ' (Desativado)'
                  : ' (Herdando Global)'
                return (
                  <option key={v.id} value={v.id}>
                    {v.titulo} — {v.departamento} {statusTexto}
                  </option>
                )
              })}
            </select>
          </div>

          {!vagaSelecionada ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              Selecione uma vaga no menu acima para gerenciar seu toggle individual de disparos.
            </div>
          ) : (
            <div className="space-y-4 pt-1 animate-in fade-in duration-200">
              <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-lg text-xs text-purple-900 flex items-center justify-between">
                <span>Status de envio para esta vaga:</span>
                <Badge
                  className={
                    vagaAtivo
                      ? 'bg-emerald-600 text-white text-[10px]'
                      : 'bg-rose-600 text-white text-[10px]'
                  }
                >
                  {vagaAtivo ? 'Envios Habilitados' : 'Envios Silenciados'}
                </Badge>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSalvarVaga}
                  disabled={salvandoVagaId === vagaSelecionada}
                  className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {salvandoVagaId === vagaSelecionada ? 'Salvando...' : 'Salvar Regra da Vaga'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Auditoria & Log dos E-mails Enviados */}
      <Card className="border-slate-200 shadow-xs bg-white rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#1D4ED8]" />
              <h3 className="text-sm font-bold text-slate-900">Auditoria de E-mails de Status</h3>
              <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600">
                {logsFiltrados.length} registro(s)
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Histórico das últimas 50 notificações enviadas aos candidatos com confirmação de
              entrega
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={carregarDados}
              className="text-xs border-slate-200 text-slate-700 h-8"
            >
              <RotateCw className="w-3 h-3 mr-1" />
              Atualizar Log
            </Button>
          </div>
        </div>

        {/* Filtros da Tabela */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar candidato, e-mail, vaga..."
              className="pl-8 h-8 text-xs bg-white"
            />
          </div>

          <div>
            <Select value={filtroEstagio} onValueChange={setFiltroEstagio}>
              <SelectTrigger className="h-8 text-xs bg-white">
                <SelectValue placeholder="Estágio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os estágios</SelectItem>
                <SelectItem value="Candidatura Recebida">Candidatura Recebida</SelectItem>
                <SelectItem value="Triagem">Triagem</SelectItem>
                <SelectItem value="Entrevista com RH">Entrevista com RH</SelectItem>
                <SelectItem value="Entrevista técnica">Entrevista técnica</SelectItem>
                <SelectItem value="Proposta">Proposta</SelectItem>
                <SelectItem value="Aprovado">Aprovado</SelectItem>
                <SelectItem value="Recusado">Recusado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-8 text-xs bg-white">
                <SelectValue placeholder="Status do Envio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os envios</SelectItem>
                <SelectItem value="Enviado">Enviado</SelectItem>
                <SelectItem value="Falhou">Falhou</SelectItem>
                <SelectItem value="Simulado">Simulado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela de Logs */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">Candidato</th>
                <th className="py-3 px-4">Vaga</th>
                <th className="py-3 px-4">Estágio</th>
                <th className="py-3 px-4">Assunto / Mensagem</th>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Carregando histórico de auditoria...
                  </td>
                </tr>
              ) : logsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhum log de e-mail de status encontrado.
                  </td>
                </tr>
              ) : (
                logsFiltrados.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{log.candidato_nome}</div>
                      <div className="text-[11px] text-slate-400">{log.candidato_email}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 line-clamp-1">
                        {log.vaga_titulo}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${
                          log.estagio === 'Aprovado'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : log.estagio === 'Recusado'
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {log.estagio}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-800 truncate" title={log.assunto}>
                        {log.assunto}
                      </div>
                      <div
                        className="text-[11px] text-slate-500 truncate"
                        title={log.mensagem_resumo}
                      >
                        {log.mensagem_resumo}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                      {log.data_envio || log.created
                        ? new Date(log.data_envio || log.created).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Recente'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          log.status_envio === 'Enviado'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {log.status_envio === 'Enviado' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-600" />
                        )}
                        {log.status_envio}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

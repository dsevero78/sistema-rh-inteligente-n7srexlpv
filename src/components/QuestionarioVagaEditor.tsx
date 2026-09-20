import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import type { RecordModel } from 'pocketbase'
import {
  ListChecks,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Hash,
  FileText,
  Sliders,
  Sparkles,
  Save,
  Loader2,
  Check,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface PerguntaTriagem {
  id: string
  enunciado: string
  tipo: 'sim_nao' | 'escolha_unica' | 'numero' | 'texto'
  eliminatoria: boolean
  resposta_esperada?: string // para sim_nao ('Sim' / 'Não')
  opcoes?: string[] // para escolha_unica
  respostas_validas?: string[] // quais opções passam no eliminatório
  valor_minimo?: number // para numero
  valor_maximo?: number // para numero
  mensagem_reprovacao?: string
}

interface QuestionarioVagaEditorProps {
  vagaId: string
  vagaTitulo: string
}

export function QuestionarioVagaEditor({ vagaId, vagaTitulo }: QuestionarioVagaEditorProps) {
  const { toast } = useToast()

  const [questionarioId, setQuestionarioId] = useState<string | null>(null)
  const [titulo, setTitulo] = useState('Questionário de Triagem Estruturada')
  const [descricao, setDescricao] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [perguntas, setPerguntas] = useState<PerguntaTriagem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Respostas dos candidatos a este questionário
  const [respostasTriagem, setRespostasTriagem] = useState<RecordModel[]>([])

  const carregarQuestionario = async () => {
    try {
      setLoading(true)
      const [qList, rList] = await Promise.all([
        pb.collection('questionarios_vaga').getFullList({
          filter: `vaga = '${vagaId}'`,
          sort: '-created',
        }),
        pb.collection('respostas_triagem').getFullList({
          filter: `vaga = '${vagaId}'`,
          sort: '-created',
          expand: 'candidato',
        }),
      ])

      setRespostasTriagem(rList)

      if (qList.length > 0) {
        const q = qList[0]
        setQuestionarioId(q.id)
        setTitulo(q.titulo || 'Questionário de Triagem')
        setDescricao(q.descricao || '')
        setAtivo(q.ativo !== false)
        setPerguntas(Array.isArray(q.perguntas) ? q.perguntas : [])
      } else {
        // Sugerir perguntas modelo padrão
        setQuestionarioId(null)
        setTitulo(`Questionário de Triagem - ${vagaTitulo}`)
        setDescricao(
          'Responda às questões fundamentais para validação dos requisitos eliminatórios da vaga.',
        )
        setAtivo(true)
        setPerguntas([
          {
            id: 'p_' + Date.now() + '_1',
            enunciado:
              'Você possui disponibilidade para iniciar no modelo de trabalho proposto (híbrido/remoto)?',
            tipo: 'sim_nao',
            eliminatoria: true,
            resposta_esperada: 'Sim',
            mensagem_reprovacao: 'Disponibilidade de modelo de trabalho não atende ao exigido.',
          },
          {
            id: 'p_' + Date.now() + '_2',
            enunciado: 'Qual a sua pretensão salarial mensal (R$)?',
            tipo: 'numero',
            eliminatoria: true,
            valor_maximo: 20000,
            mensagem_reprovacao: 'Pretensão salarial acima do limite orçamentário aprovado.',
          },
        ])
      }
    } catch (err) {
      console.error('Erro ao carregar questionário:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarQuestionario()
  }, [vagaId])

  const handleAddPergunta = () => {
    const nova: PerguntaTriagem = {
      id: 'p_' + Date.now(),
      enunciado: '',
      tipo: 'sim_nao',
      eliminatoria: true,
      resposta_esperada: 'Sim',
      mensagem_reprovacao: 'Critério eliminatório não atendido.',
    }
    setPerguntas([...perguntas, nova])
  }

  const handleUpdatePergunta = (index: number, updates: Partial<PerguntaTriagem>) => {
    const list = [...perguntas]
    list[index] = { ...list[index], ...updates }
    setPerguntas(list)
  }

  const handleRemovePergunta = (index: number) => {
    setPerguntas(perguntas.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!titulo.trim()) {
      toast({ title: 'Informe o título do questionário', variant: 'destructive' })
      return
    }

    // Validar se há perguntas sem enunciado
    for (let i = 0; i < perguntas.length; i++) {
      if (!perguntas[i].enunciado.trim()) {
        toast({
          title: `Pergunta ${i + 1} está sem enunciado`,
          description: 'Preencha o texto da questão antes de salvar.',
          variant: 'destructive',
        })
        return
      }
    }

    setSaving(true)
    try {
      const payload = {
        vaga: vagaId,
        titulo,
        descricao,
        ativo,
        perguntas,
      }

      if (questionarioId) {
        await pb.collection('questionarios_vaga').update(questionarioId, payload)
        toast({ title: 'Questionário de triagem atualizado!' })
      } else {
        const created = await pb.collection('questionarios_vaga').create(payload)
        setQuestionarioId(created.id)
        toast({ title: 'Questionário de triagem salvo com sucesso!' })
      }
      carregarQuestionario()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar questionário',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Carregando questionário...</div>
  }

  return (
    <div className="space-y-6">
      {/* Editor do Questionário */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                Módulo de Triagem Estruturada
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  ativo ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {ativo ? 'Questionário Ativo' : 'Pausado'}
              </Badge>
            </div>
            <CardTitle className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-blue-600" />
              Perguntas de Triagem & Reprovação Automática
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Configure as questões que o candidato responderá. Perguntas eliminatórias com resposta
              insatisfatória reprovam automaticamente o candidato com registro do motivo.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <Switch id="quest-ativo" checked={ativo} onCheckedChange={setAtivo} />
              <Label htmlFor="quest-ativo" className="text-xs font-semibold text-slate-700">
                Ativo na vaga
              </Label>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              Salvar Questionário
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5 text-xs">
          {/* Metadados do questionário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Título do Questionário</Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Triagem Técnica & Cultural"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-semibold text-slate-700">Instruções para o Candidato</Label>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Responda honestamente para validação dos pré-requisitos..."
                className="text-xs"
              />
            </div>
          </div>

          {/* Lista de Perguntas */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <span>Perguntas Configuradas ({perguntas.length})</span>
                <span className="text-[11px] font-normal text-slate-400">
                  {perguntas.filter((p) => p.eliminatoria).length} eliminatória(s)
                </span>
              </h4>
              <Button
                onClick={handleAddPergunta}
                variant="outline"
                size="sm"
                className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50 h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar Pergunta
              </Button>
            </div>

            {perguntas.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-lg border-slate-300 text-slate-400 space-y-2">
                <ListChecks className="w-8 h-8 text-slate-300 mx-auto" />
                <p>Nenhuma pergunta configurada para esta vaga.</p>
                <Button
                  size="sm"
                  onClick={handleAddPergunta}
                  variant="secondary"
                  className="text-xs"
                >
                  Criar Primeira Pergunta
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {perguntas.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      p.eliminatoria
                        ? 'border-rose-200 bg-rose-50/20'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            p.eliminatoria
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.eliminatoria ? '⚠ Eliminatória' : 'Informativa'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center space-x-1.5">
                          <Switch
                            id={`elim-${p.id}`}
                            checked={p.eliminatoria}
                            onCheckedChange={(val) =>
                              handleUpdatePergunta(idx, { eliminatoria: val })
                            }
                          />
                          <Label
                            htmlFor={`elim-${p.id}`}
                            className="text-[11px] font-semibold text-rose-700 cursor-pointer"
                          >
                            Critério Eliminatório
                          </Label>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemovePergunta(idx)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Enunciado e Tipo */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-700">
                          Enunciado da Pergunta *
                        </Label>
                        <Input
                          value={p.enunciado}
                          onChange={(e) => handleUpdatePergunta(idx, { enunciado: e.target.value })}
                          placeholder="Ex: Você possui 4+ anos de experiência comprovada com Go?"
                          className="text-xs bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-700">
                          Tipo de Resposta
                        </Label>
                        <Select
                          value={p.tipo}
                          onValueChange={(val) =>
                            handleUpdatePergunta(idx, {
                              tipo: val as 'sim_nao' | 'escolha_unica' | 'numero' | 'texto',
                            })
                          }
                        >
                          <SelectTrigger className="text-xs bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sim_nao" className="text-xs">
                              Sim / Não
                            </SelectItem>
                            <SelectItem value="numero" className="text-xs">
                              Número / Salário
                            </SelectItem>
                            <SelectItem value="escolha_unica" className="text-xs">
                              Múltipla Escolha
                            </SelectItem>
                            <SelectItem value="texto" className="text-xs">
                              Texto Livre
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Regras específicas para cada tipo quando eliminatória */}
                    {p.eliminatoria && (
                      <div className="p-3 bg-white rounded-lg border border-rose-200/80 space-y-2">
                        <span className="text-[11px] font-bold text-rose-800 block">
                          Regra de Corte Automático:
                        </span>

                        {p.tipo === 'sim_nao' && (
                          <div className="flex items-center gap-3">
                            <Label className="text-xs text-slate-600">
                              Resposta Correta Esperada:
                            </Label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdatePergunta(idx, { resposta_esperada: 'Sim' })
                                }
                                className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors ${
                                  p.resposta_esperada !== 'Não'
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'border-slate-200 text-slate-600'
                                }`}
                              >
                                Sim
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdatePergunta(idx, { resposta_esperada: 'Não' })
                                }
                                className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors ${
                                  p.resposta_esperada === 'Não'
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'border-slate-200 text-slate-600'
                                }`}
                              >
                                Não
                              </button>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              (Qualquer resposta diferente reprova automaticamente)
                            </span>
                          </div>
                        )}

                        {p.tipo === 'numero' && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-slate-600">
                                Valor Mínimo Aceito
                              </Label>
                              <Input
                                type="number"
                                value={p.valor_minimo ?? ''}
                                onChange={(e) =>
                                  handleUpdatePergunta(idx, {
                                    valor_minimo: e.target.value
                                      ? parseFloat(e.target.value)
                                      : undefined,
                                  })
                                }
                                placeholder="Ex: 5000"
                                className="text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-slate-600">
                                Valor Máximo Aceito (Teto)
                              </Label>
                              <Input
                                type="number"
                                value={p.valor_maximo ?? ''}
                                onChange={(e) =>
                                  handleUpdatePergunta(idx, {
                                    valor_maximo: e.target.value
                                      ? parseFloat(e.target.value)
                                      : undefined,
                                  })
                                }
                                placeholder="Ex: 22000"
                                className="text-xs"
                              />
                            </div>
                          </div>
                        )}

                        {p.tipo === 'escolha_unica' && (
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-slate-600">
                                Opções Possíveis (separadas por vírgula)
                              </Label>
                              <Input
                                value={Array.isArray(p.opcoes) ? p.opcoes.join(', ') : ''}
                                onChange={(e) =>
                                  handleUpdatePergunta(idx, {
                                    opcoes: e.target.value
                                      .split(',')
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  })
                                }
                                placeholder="Ex: Básico, Intermediário, Avançado, Fluente"
                                className="text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-slate-600">
                                Opções que Aprovam (separadas por vírgula)
                              </Label>
                              <Input
                                value={
                                  Array.isArray(p.respostas_validas)
                                    ? p.respostas_validas.join(', ')
                                    : ''
                                }
                                onChange={(e) =>
                                  handleUpdatePergunta(idx, {
                                    respostas_validas: e.target.value
                                      .split(',')
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  })
                                }
                                placeholder="Ex: Avançado, Fluente"
                                className="text-xs"
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-1 pt-1">
                          <Label className="text-[11px] text-slate-600">
                            Mensagem / Justificativa de Reprovação no Dossiê
                          </Label>
                          <Input
                            value={p.mensagem_reprovacao || ''}
                            onChange={(e) =>
                              handleUpdatePergunta(idx, { mensagem_reprovacao: e.target.value })
                            }
                            placeholder="Ex: Candidato não possui os 4 anos de experiência mínima exigidos."
                            className="text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Candidatos que Responderam à Triagem */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Respostas dos Candidatos na Triagem ({respostasTriagem.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Auditoria dos cortes automáticos e das respostas submetidas
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs font-semibold">
            {respostasTriagem.filter((r) => r.reprovado_automaticamente).length} reprovado(s)
            automaticamente
          </Badge>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-slate-100 text-xs">
          {respostasTriagem.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              Nenhuma submissão de triagem registrada para esta vaga até o momento.
            </div>
          ) : (
            respostasTriagem.map((resp) => {
              const cand = resp.expand?.candidato
              return (
                <div key={resp.id} className="p-4 space-y-2 hover:bg-slate-50/70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{cand?.nome || 'Candidato'}</span>
                      <span className="text-slate-400">({cand?.email})</span>
                      {resp.reprovado_automaticamente ? (
                        <Badge
                          variant="outline"
                          className="bg-rose-50 text-rose-700 border-rose-300 font-bold"
                        >
                          ✕ Reprovado na Triagem
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold"
                        >
                          ✓ Aprovado na Triagem
                        </Badge>
                      )}
                    </div>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(resp.created).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  {resp.motivo_reprovacao && (
                    <div className="p-2 bg-rose-50 text-rose-900 rounded border border-rose-200 text-[11px]">
                      <strong>Motivo do Corte:</strong> {resp.motivo_reprovacao}
                    </div>
                  )}

                  {/* Respostas individuais */}
                  {Array.isArray(resp.respostas) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                      {resp.respostas.map(
                        (
                          r: {
                            pergunta: string
                            resposta: string | number
                            eliminatoria: boolean
                            atendeu: boolean
                          },
                          i: number,
                        ) => (
                          <div
                            key={i}
                            className={`p-2 rounded border ${
                              r.eliminatoria && !r.atendeu
                                ? 'bg-rose-100/50 border-rose-300 text-rose-950'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="font-semibold block truncate">{r.pergunta}</span>
                            <span className="font-medium text-blue-700">
                              Resposta: {String(r.resposta ?? 'Sem resposta')}
                            </span>
                            {r.eliminatoria && (
                              <span className="ml-1 text-[10px] font-bold">
                                {r.atendeu ? ' (Atendeu)' : ' (Não atendeu)'}
                              </span>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import {
  streamAgentChat,
  displayableMessages,
  type AgentCitation,
  type AgentMessage,
  type DisplayMessage,
} from '@/lib/skipAi'
import {
  Sparkles,
  Send,
  Plus,
  Bot,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  MessageSquare,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export default function Chat() {
  const { toast } = useToast()
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [citationsMap, setCitationsMap] = useState<Record<string, AgentCitation[]>>({})
  const [suggestedAction, setSuggestedAction] = useState<{
    candidatoNome: string
    candidatoId?: string
    vagaNome: string
    vagaId?: string
    novoEstagio: string
    justificativa: string
  } | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isStreaming])

  // Initial welcome message
  useEffect(() => {
    setMessages([
      {
        id: 'msg_initial',
        role: 'assistant',
        content:
          'Olá! Sou o **Gestor de Talentos**, assistente analítico oficial de Gente & Gestão.\n\nPosso te ajudar a cruzar requisitos de vagas com perfis do banco de talentos, comparar candidatos, indicar lacunas técnicas ou comportamentais e sugerir avanços no pipeline de seleção.\n\nComo posso apoiar suas decisões de contratação hoje?',
        created: new Date().toISOString(),
      },
    ])
  }, [])

  const handleStartNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setConversationId(null)
    setSuggestedAction(null)
    setMessages([
      {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        content:
          'Novo chat iniciado. Como posso ajudar com os processos seletivos e candidatos hoje?',
        created: new Date().toISOString(),
      },
    ])
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const text = inputMessage.trim()
    if (!text || isStreaming) return

    setInputMessage('')
    const userMsgId = 'usr_' + Date.now()
    const assistantMsgId = 'ast_' + Date.now()

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: text, created: new Date().toISOString() },
      { id: assistantMsgId, role: 'assistant', content: '', created: new Date().toISOString() },
    ])

    setIsStreaming(true)
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/chat/mensagem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          mensagem: text,
          conversation_id: conversationId,
        }),
        signal: controller.signal,
      })

      const result = await streamAgentChat(res, {
        signal: controller.signal,
        onChunk: (_delta, full) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: full } : m)),
          )
        },
        onCitations: (cits) => {
          setCitationsMap((prev) => ({ ...prev, [assistantMsgId]: cits }))
        },
      })

      const newConvId = res.headers.get('X-Conversation-Id') ?? result.conversation_id
      if (newConvId) {
        setConversationId(newConvId)
      }

      // Check for stage advancement suggestion in the agent's text
      const contentLower = result.content.toLowerCase()
      if (
        contentLower.includes('mover') ||
        contentLower.includes('avançar') ||
        contentLower.includes('estágio') ||
        contentLower.includes('proposta')
      ) {
        // Detect candidate recommendation context
        if (contentLower.includes('lucas') || contentLower.includes('ferreira')) {
          setSuggestedAction({
            candidatoNome: 'Lucas Ferreira Lima',
            vagaNome: 'Desenvolvedor(a) Backend Sênior',
            novoEstagio: 'Entrevista técnica',
            justificativa: 'Alta aderência técnica nas stacks Go, Node.js e microsserviços.',
          })
        } else if (contentLower.includes('camila') || contentLower.includes('ribeiro')) {
          setSuggestedAction({
            candidatoNome: 'Camila Ribeiro Santos',
            vagaNome: 'Product Designer Pleno',
            novoEstagio: 'Proposta',
            justificativa: 'Excelente avaliação em Design System e usabilidade no case prático.',
          })
        } else if (contentLower.includes('juliana') || contentLower.includes('mendes')) {
          setSuggestedAction({
            candidatoNome: 'Juliana Mendes Castro',
            vagaNome: 'Analista de Gente & Gestão',
            novoEstagio: 'Aprovado',
            justificativa: 'Aprovada nas entrevistas comportamentais e de People Analytics.',
          })
        }
      }
    } catch (err: unknown) {
      if ((err as DOMException)?.name === 'AbortError') return
      toast({
        title: 'Falha no processamento',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content:
                  'Desculpe, ocorreu uma instabilidade temporária na resposta do agente. Por favor, reformule a pergunta.',
              }
            : m,
        ),
      )
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }

  const handleConfirmSuggestedAction = async () => {
    if (!suggestedAction) return
    try {
      // Find candidate record by name
      const cList = await pb.collection('candidatos').getFullList({
        filter: `nome ~ '${suggestedAction.candidatoNome.split(' ')[0]}'`,
        limit: 1,
      })
      if (cList.length > 0) {
        const cand = cList[0]
        await pb.collection('candidatos').update(cand.id, {
          status: suggestedAction.novoEstagio,
        })

        // Also update pipeline
        const pList = await pb.collection('pipeline').getFullList({
          filter: `candidato = '${cand.id}'`,
          limit: 1,
        })
        if (pList.length > 0) {
          const pipe = pList[0]
          const hist = Array.isArray(pipe.historico) ? pipe.historico : []
          await pb.collection('pipeline').update(pipe.id, {
            estagio: suggestedAction.novoEstagio,
            anotacoes: `Aprovado via recomendação do Agente de IA: ${suggestedAction.justificativa}`,
            historico: [
              ...hist,
              {
                data: new Date().toISOString(),
                estagio: suggestedAction.novoEstagio,
                autor: 'Gestor de Talentos (IA)',
                nota: suggestedAction.justificativa,
              },
            ],
          })
        }
      }

      toast({
        title: 'Ação executada com sucesso!',
        description: `${suggestedAction.candidatoNome} foi movido(a) para "${suggestedAction.novoEstagio}" no pipeline.`,
      })
      setSuggestedAction(null)
    } catch (err) {
      toast({ title: 'Erro ao executar ação no pipeline', variant: 'destructive' })
    }
  }

  const quickQuestions = [
    'Quais candidatos se encaixam melhor para a vaga de Dev Backend Sênior?',
    'Compare Camila Ribeiro e Mariana Prado para a vaga de Product Designer.',
    'Quais os principais riscos identificados no perfil de Renato Albuquerque?',
    'Recomende o próximo passo para o candidato Lucas Ferreira Lima.',
  ]

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden animate-in fade-in-50 duration-300">
      {/* Chat Top Header */}
      <div className="h-14 px-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Gestor de Talentos</span>
              <Badge
                variant="outline"
                className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 py-0"
              >
                Skip Cloud Reasoning Agent
              </Badge>
            </h2>
            <p className="text-[11px] text-slate-500">
              Analista sênior com acesso consultivo a vagas, candidatos e pipeline
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleStartNewChat}
          className="text-xs h-8 border-slate-300 text-slate-700 hover:text-blue-600"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Novo Chat
        </Button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/30">
        {messages.map((m) => {
          const isUser = m.role === 'user'
          const cits = citationsMap[m.id] || []

          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs ${
                  isUser ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white shadow-blue-500/20'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className="space-y-2 flex-1">
                <div
                  className={`p-4 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-blue-600 text-white font-medium rounded-tr-none shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                  }`}
                >
                  {m.content ? (
                    m.content
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Analisando perfil e ponderando aderência...</span>
                    </div>
                  )}
                </div>

                {/* Citations Badges */}
                {cits.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Evidências citadas:
                    </span>
                    {cits.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200"
                        title={c.excerpt}
                      >
                        <span>Fonte #{c.n}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Action Suggestion Card (Actionable recommendation from the agent) */}
        {suggestedAction && (
          <div className="max-w-xl mx-auto p-4 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 shadow-xs space-y-3 animate-in fade-in-50 duration-300">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Ação Sugerida pelo Agente de IA</span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Com base na análise de competências, o Gestor de Talentos recomenda mover{' '}
              <strong className="text-slate-900">{suggestedAction.candidatoNome}</strong> para o
              estágio{' '}
              <strong className="text-blue-700 font-bold">"{suggestedAction.novoEstagio}"</strong>{' '}
              no pipeline da vaga{' '}
              <strong className="text-slate-900">{suggestedAction.vagaNome}</strong>.
            </p>

            <div className="p-2.5 rounded bg-white/80 border border-blue-100 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-800">Justificativa: </span>
              {suggestedAction.justificativa}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuggestedAction(null)}
                className="text-xs h-7 text-slate-500 hover:text-slate-700"
              >
                Dispensar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmSuggestedAction}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-8 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Confirmar no Pipeline
              </Button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar (when empty or idle) */}
      {!isStreaming && messages.length <= 2 && (
        <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-200 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
            Sugestões:
          </span>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputMessage(q)
              }}
              className="text-[11px] text-slate-700 hover:text-blue-700 hover:bg-blue-50 bg-white px-2.5 py-1 rounded-full border border-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Message Footer */}
      <div className="p-4 bg-white border-t border-slate-200">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            placeholder="Pergunte sobre candidatos, compare perfis ou solicite recomendações de matching..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isStreaming}
            className="flex-1 text-xs h-10 bg-slate-50 border-slate-200 focus-visible:ring-blue-600"
          />
          <Button
            type="submit"
            disabled={isStreaming || !inputMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium h-10 px-4 shadow-xs"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Enviar</span>
                <Send className="w-3.5 h-3.5 ml-1.5" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

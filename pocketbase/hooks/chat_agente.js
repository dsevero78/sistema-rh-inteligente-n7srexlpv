routerAdd(
  'POST',
  '/backend/v1/chat/mensagem',
  (e) => {
    try {
      const authUser = e.auth
      if (!authUser || !authUser.id) {
        return e.json(401, { error: 'Autenticação obrigatória' })
      }

      const body = e.requestInfo().body || {}
      const sessao = body.sessao || 'sessao_' + authUser.id
      const mensagem = (body.mensagem || '').trim()

      if (!mensagem) {
        return e.json(400, { error: 'Mensagem é obrigatória' })
      }

      // Save user message to chat_mensagens
      const chatCol = $app.findCollectionByNameOrId('chat_mensagens')
      const userMsgRec = new Record(chatCol)
      userMsgRec.set('usuario', authUser.id)
      userMsgRec.set('sessao', sessao)
      userMsgRec.set('papel', 'user')
      userMsgRec.set('conteudo', mensagem)
      $app.save(userMsgRec)

      // Call the native agent
      const conv = $ai.agent('gestor-de-talentos').getOrCreateConversation({
        user_id: authUser.id,
        id: body.conversation_id || null,
        title: mensagem.substring(0, 40),
      })

      const iter = $ai.agent('gestor-de-talentos').chat({
        user_id: authUser.id,
        conversation_id: conv.id,
        message: mensagem,
        stream: true,
      })

      e.response.header().set('Content-Type', 'text/event-stream')
      e.response.header().set('Cache-Control', 'no-cache')
      e.response.header().set('X-Conversation-Id', conv.id)
      e.response.header().set('X-Session-Id', sessao)

      $response.stream(e, iter)
      return
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro no processamento do agente' })
    }
  },
  $apis.requireAuth(),
)

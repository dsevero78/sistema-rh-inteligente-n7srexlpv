/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de segurança para interceptar alterações na coleção users e impedir
 * escalada de privilégios direta ou indireta via API.
 *
 * Regras:
 * - Somente perfil 'RH / Recrutador' pode alterar campos de autorização:
 *   'cargo_funcao', 'empresa', 'area'
 * - Usuários comuns não-RH (ex: 'Gestor Contratante', 'Diretoria / Executivo')
 *   não podem alterar 'cargo_funcao', 'empresa' ou 'area' de si mesmos nem de outros.
 * - Usuários comuns não-RH não podem alterar cadastros de outros usuários.
 */
onRecordBeforeUpdate((e) => {
  const req = e.httpContext ? e.httpContext.requestInfo() : null
  const authRecord = e.httpContext ? e.httpContext.auth : null

  // Se não houver contexto HTTP (ex: migração ou cron interno do PocketBase), permite
  if (!req || !authRecord) {
    return
  }

  const solicitanteCargo = authRecord.getString('cargo_funcao') || ''
  const isRh = solicitanteCargo === 'RH / Recrutador'
  const solicitanteId = authRecord.id
  const targetId = e.record.id

  // 1. Usuário comum tentando alterar outro usuário
  if (!isRh && solicitanteId !== targetId) {
    throw new ForbiddenError(
      'Apenas usuários com perfil RH / Recrutador podem gerenciar outros usuários.',
    )
  }

  // 2. Verificação de alteração de campos sensíveis de autorização por não-RH
  if (!isRh) {
    const originalRecord = e.record.original()
    if (originalRecord) {
      const origCargo = originalRecord.getString('cargo_funcao') || ''
      const novoCargo = e.record.getString('cargo_funcao') || ''
      if (origCargo !== novoCargo) {
        throw new ForbiddenError('Você não tem permissão para alterar o campo cargo_funcao.')
      }

      const origEmpresa = originalRecord.getString('empresa') || ''
      const novaEmpresa = e.record.getString('empresa') || ''
      if (origEmpresa !== novaEmpresa) {
        throw new ForbiddenError('Você não tem permissão para alterar a BU / Empresa vinculada.')
      }

      const origArea = originalRecord.getString('area') || ''
      const novaArea = e.record.getString('area') || ''
      if (origArea !== novaArea) {
        throw new ForbiddenError('Você não tem permissão para alterar a Área vinculada.')
      }
    }
  }
}, 'users')

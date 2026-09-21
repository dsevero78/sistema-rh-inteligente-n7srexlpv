import React, { useState, useEffect } from 'react'
import {
  Users,
  Shield,
  Building2,
  Layers,
  Edit2,
  CheckCircle2,
  Search,
  X,
  Mail,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { empresasService, Empresa, Area } from '@/services/empresasService'
import { useAuth } from '@/contexts/AuthContext'

interface UsuarioGestao {
  id: string
  name: string
  email: string
  cargo_funcao?: string
  empresa?: string
  empresa_nome?: string
  area?: string
  area_nome?: string
  created?: string
}

interface AbaGestaoUsuariosProps {
  empresas: Empresa[]
  areas: Area[]
}

export function AbaGestaoUsuarios({ empresas, areas }: AbaGestaoUsuariosProps) {
  const { user: currentUser, refreshUser } = useAuth()
  const [usuarios, setUsuarios] = useState<UsuarioGestao[]>([])
  const [loading, setLoading] = useState(true)
  const [termoBusca, setTermoBusca] = useState('')
  const [filtroBu, setFiltroBu] = useState<string>('todos')

  // Modal de edição de escopo
  const [modalAberta, setModalAberta] = useState(false)
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<UsuarioGestao | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formCargo, setFormCargo] = useState('Gestor Contratante')
  const [formEmpresa, setFormEmpresa] = useState<string>('none')
  const [formArea, setFormArea] = useState<string>('none')
  const [salvando, setSalvando] = useState(false)

  const carregarUsuarios = async () => {
    try {
      setLoading(true)
      const list = await empresasService.listarUsuariosGestao()
      setUsuarios(list)
    } catch (e) {
      console.error(e)
      toast({
        title: 'Erro ao carregar usuários',
        description: 'Não foi possível carregar a lista de gestores e RH.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarUsuarios()
  }, [])

  const abrirEdicao = (u: UsuarioGestao) => {
    setUsuarioEmEdicao(u)
    setFormNome(u.name || '')
    setFormCargo(u.cargo_funcao || 'Gestor Contratante')
    setFormEmpresa(u.empresa || 'none')
    setFormArea(u.area || 'none')
    setModalAberta(true)
  }

  const areasFiltradasParaEmpresa = areas.filter(
    (a) => formEmpresa !== 'none' && a.empresa === formEmpresa,
  )

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuarioEmEdicao) return

    try {
      setSalvando(true)
      await empresasService.atualizarEscopoUsuario(usuarioEmEdicao.id, {
        name: formNome,
        cargo_funcao: formCargo,
        empresa: formEmpresa !== 'none' ? formEmpresa : '',
        area: formArea !== 'none' ? formArea : '',
      })

      toast({
        title: 'Escopo atualizado com sucesso!',
        description: `Vínculo de BU e Área de ${formNome} atualizados.`,
      })

      setModalAberta(false)
      await carregarUsuarios()
      if (currentUser?.id === usuarioEmEdicao.id) {
        await refreshUser()
      }
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar escopo',
        description: err.message || 'Falha ao atualizar o usuário.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const usuariosFiltrados = usuarios.filter((u) => {
    if (filtroBu !== 'todos' && u.empresa !== filtroBu) return false
    if (!termoBusca.trim()) return true
    const termo = termoBusca.toLowerCase()
    return (
      u.name.toLowerCase().includes(termo) ||
      u.email.toLowerCase().includes(termo) ||
      (u.cargo_funcao && u.cargo_funcao.toLowerCase().includes(termo)) ||
      (u.empresa_nome && u.empresa_nome.toLowerCase().includes(termo))
    )
  })

  return (
    <div className="space-y-4">
      {/* Informações sobre regras de escopo */}
      <div className="bg-slate-50 dark:bg-[#11162B] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-[#E9530E]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Controle de Acesso Escopado por Líder de BU
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Usuários com perfil{' '}
              <strong className="text-slate-700 dark:text-slate-200">Gestor Contratante</strong>{' '}
              acessam e lançam horas apenas para os prestadores/colaboradores da sua BU (e área, se
              restrita). Perfis de{' '}
              <strong className="text-slate-700 dark:text-slate-200">RH / Recrutador</strong>{' '}
              possuem visão consolidada de todo o Grupo Econômico.
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white dark:bg-[#151B2E] p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar por nome, email ou cargo..."
            className="pl-9 bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-slate-700 text-sm"
          />
          {termoBusca && (
            <button
              onClick={() => setTermoBusca('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline whitespace-nowrap">
            Filtrar BU:
          </span>
          <Select value={filtroBu} onValueChange={setFiltroBu}>
            <SelectTrigger className="w-full sm:w-[220px] bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-slate-700 text-xs">
              <SelectValue placeholder="Todas as BUs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as BUs / Matriz</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome_fantasia}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white dark:bg-[#151B2E] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Carregando usuários e líderes de BU...
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Nenhum usuário encontrado com os filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#11162B] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Perfil / Função</th>
                  <th className="py-3 px-4">BU (Empresa) Vinculada</th>
                  <th className="py-3 px-4">Área Específica</th>
                  <th className="py-3 px-4">Escopo Efetivo</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {usuariosFiltrados.map((u) => {
                  const isGestor = u.cargo_funcao === 'Gestor Contratante'
                  const empresaObj = empresas.find((e) => e.id === u.empresa)

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3" />
                          {u.email}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant="secondary"
                          className={
                            isGestor
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-medium'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium'
                          }
                        >
                          {u.cargo_funcao || 'RH / Recrutador'}
                        </Badge>
                      </td>

                      <td className="py-3 px-4">
                        {empresaObj ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: empresaObj.logo_cor || '#0D9488' }}
                            />
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {empresaObj.nome_fantasia}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">
                            {isGestor ? 'Não atribuída (sem BU)' : 'Holding / Todas as BUs'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {u.area_nome ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            <Layers className="w-3 h-3 text-slate-400" />
                            {u.area_nome}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            {empresaObj ? 'Todas as áreas da BU' : '—'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {isGestor ? (
                          empresaObj ? (
                            <Badge
                              variant="outline"
                              className="border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 text-[10px]"
                            >
                              Restrito à BU {empresaObj.sigla || empresaObj.nome_fantasia}
                              {u.area_nome ? ` (${u.area_nome})` : ''}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">
                              Pendente vínculo de BU
                            </Badge>
                          )
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 text-[10px]"
                          >
                            Consolidado (Todas as BUs)
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirEdicao(u)}
                          className="h-8 text-xs text-[#E9530E] hover:text-[#d44808] hover:bg-orange-50 dark:hover:bg-orange-950/20"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Configurar BU
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para configurar Escopo de BU do Usuário */}
      <Dialog open={modalAberta} onOpenChange={setModalAberta}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <UserCheck className="w-5 h-5 text-[#E9530E]" />
              Vínculo de BU & Área do Usuário
            </DialogTitle>
            <DialogDescription className="text-xs">
              Defina a qual BU e Área este usuário pertence para restringir os lançamentos e
              aprovações de horas.
            </DialogDescription>
          </DialogHeader>

          {usuarioEmEdicao && (
            <form onSubmit={handleSalvar} className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nome do Usuário
                </label>
                <Input
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Email
                </label>
                <Input
                  value={usuarioEmEdicao.email}
                  disabled
                  className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Perfil de Acesso
                </label>
                <Select value={formCargo} onValueChange={setFormCargo}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gestor Contratante">
                      Gestor Contratante (Líder de BU — Escopo Restrito)
                    </SelectItem>
                    <SelectItem value="RH / Recrutador">
                      RH / Recrutador (Acesso Consolidado a Todas as BUs)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  BU / Empresa Responsável <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formEmpresa}
                  onValueChange={(val) => {
                    setFormEmpresa(val)
                    setFormArea('none') // Reseta área ao mudar BU
                  }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione a BU..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {formCargo === 'Gestor Contratante'
                        ? 'Nenhuma selecionada (Gestor sem BU)'
                        : 'Holding / Todas as BUs (Sem restrição)'}
                    </SelectItem>
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.sigla ? `[${e.sigla}] ` : ''}
                        {e.nome_fantasia} ({e.tipo === 'Holding / Matriz' ? 'Holding' : 'BU'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formCargo === 'Gestor Contratante' && formEmpresa === 'none' && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    Aviso: Líderes de BU precisam de uma empresa vinculada para visualizar seus
                    prestadores em Horas & Competências.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Área Específica da BU (Opcional)
                </label>
                <Select
                  value={formArea}
                  onValueChange={setFormArea}
                  disabled={formEmpresa === 'none'}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Todas as áreas da BU selecionada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Todas as áreas da BU</SelectItem>
                    {areasFiltradasParaEmpresa.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Selecione uma área se este gestor liderar apenas um departamento específico (ex:
                  Engenharia).
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalAberta(false)}
                  disabled={salvando}
                  size="sm"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={salvando}
                  size="sm"
                  className="bg-[#E9530E] hover:bg-[#d44808] text-white"
                >
                  {salvando ? 'Salvando...' : 'Salvar Escopo'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

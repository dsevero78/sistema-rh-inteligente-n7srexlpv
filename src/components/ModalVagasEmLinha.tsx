import React, { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Loader2,
  Sparkles,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export interface LinhaVagaRapida {
  id: string
  titulo: string
  departamento: string
  modalidade: 'Remoto' | 'Presencial' | 'Híbrido'
  localizacao: string
  faixa_salarial: string
  orcamento_mensal: string
  requisitos_principais: string
}

interface ModalVagasEmLinhaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSucesso?: () => void
}

const DEPARTAMENTOS_SUGERIDOS = [
  'Tecnologia',
  'Produto',
  'Marketing',
  'Recursos Humanos',
  'Vendas & Comercial',
  'Financeiro',
  'Operações',
  'Jurídico',
]

export default function ModalVagasEmLinha({
  open,
  onOpenChange,
  onSucesso,
}: ModalVagasEmLinhaProps) {
  const { toast } = useToast()
  const [salvando, setSalvando] = useState(false)

  const [linhas, setLinhas] = useState<LinhaVagaRapida[]>([
    {
      id: '1',
      titulo: '',
      departamento: 'Tecnologia',
      modalidade: 'Híbrido',
      localizacao: 'São Paulo, SP',
      faixa_salarial: 'R$ 8.000 - R$ 11.000',
      orcamento_mensal: '11000',
      requisitos_principais: 'React, TypeScript, Node.js',
    },
    {
      id: '2',
      titulo: '',
      departamento: 'Marketing',
      modalidade: 'Remoto',
      localizacao: 'São Paulo, SP',
      faixa_salarial: 'R$ 6.000 - R$ 8.000',
      orcamento_mensal: '8000',
      requisitos_principais: 'Google Ads, Meta Ads, SEO',
    },
  ])

  const adicionarLinha = () => {
    const novaLinha: LinhaVagaRapida = {
      id: Math.random().toString(36).substring(2, 9),
      titulo: '',
      departamento: 'Tecnologia',
      modalidade: 'Híbrido',
      localizacao: 'São Paulo, SP',
      faixa_salarial: '',
      orcamento_mensal: '',
      requisitos_principais: '',
    }
    setLinhas([...linhas, novaLinha])
  }

  const duplicarLinha = (idx: number) => {
    const base = linhas[idx]
    const copia: LinhaVagaRapida = {
      ...base,
      id: Math.random().toString(36).substring(2, 9),
      titulo: base.titulo ? `${base.titulo} (Cópia)` : '',
    }
    const atualizadas = [...linhas]
    atualizadas.splice(idx + 1, 0, copia)
    setLinhas(atualizadas)
  }

  const removerLinha = (id: string) => {
    if (linhas.length <= 1) {
      toast({
        title: 'Mínimo de 1 linha',
        description: 'Mantenha ao menos uma linha no cadastro rápido.',
      })
      return
    }
    setLinhas(linhas.filter((l) => l.id !== id))
  }

  const atualizarCampo = (id: string, campo: keyof LinhaVagaRapida, valor: string) => {
    setLinhas((prev) => prev.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)))
  }

  const carregarExemplo = () => {
    setLinhas([
      {
        id: '1',
        titulo: 'Desenvolvedor Frontend React Pleno',
        departamento: 'Tecnologia',
        modalidade: 'Híbrido',
        localizacao: 'São Paulo, SP',
        faixa_salarial: 'R$ 8.500 - R$ 10.500',
        orcamento_mensal: '10500',
        requisitos_principais: 'React, TypeScript, Tailwind, Git',
      },
      {
        id: '2',
        titulo: 'Analista de Dados & BI',
        departamento: 'Produto',
        modalidade: 'Remoto',
        localizacao: 'Brasil (Remoto)',
        faixa_salarial: 'R$ 7.500 - R$ 9.500',
        orcamento_mensal: '9500',
        requisitos_principais: 'SQL, Power BI, Python, Metabase',
      },
      {
        id: '3',
        titulo: 'Coordenador(a) Comercial B2B',
        departamento: 'Vendas & Comercial',
        modalidade: 'Presencial',
        localizacao: 'São Paulo, SP',
        faixa_salarial: 'R$ 10.000 - R$ 13.000',
        orcamento_mensal: '13000',
        requisitos_principais: 'Vendas complexas, CRM HubSpot, Liderança de SDRs',
      },
    ])
    toast({ title: '3 vagas de exemplo preenchidas no grid.' })
  }

  const handleSalvarTudo = async () => {
    // Validar linhas preenchidas
    const preenchidas = linhas.filter((l) => l.titulo.trim().length > 0)
    if (preenchidas.length === 0) {
      toast({
        title: 'Preencha o título das vagas',
        description: 'Informe ao menos o cargo de uma vaga para cadastrar.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    let totalCriadas = 0
    const erros: string[] = []

    for (const l of preenchidas) {
      try {
        const reqArray = l.requisitos_principais
          ? l.requisitos_principais
              .split(/[,;\n]/)
              .map((s) => s.trim())
              .filter(Boolean)
          : []
        const habArray = reqArray.map((r) => ({ nome: r, peso: 5 }))
        const orcamentoNum =
          parseFloat(l.orcamento_mensal.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0

        await pb.collection('vagas').create({
          titulo: l.titulo.trim(),
          departamento: l.departamento || 'Tecnologia',
          modalidade: l.modalidade || 'Híbrido',
          localizacao: l.localizacao || 'São Paulo, SP',
          faixa_salarial: l.faixa_salarial || '',
          orcamento_mensal: orcamentoNum,
          descricao: `Vaga de ${l.titulo.trim()} cadastrada via entrada rápida para a área de ${l.departamento}.`,
          status: 'Ativa',
          requisitos_obrigatorios: reqArray,
          requisitos_desejaveis: [],
          habilidades_tecnicas: habArray,
          competencias_comportamentais: ['Comunicação', 'Trabalho em equipe', 'Autonomia'],
        })
        totalCriadas++
      } catch (err: any) {
        console.error(`Erro ao salvar vaga "${l.titulo}":`, err)
        erros.push(`"${l.titulo}": ${err?.message || 'Falha ao salvar'}`)
      }
    }

    setSalvando(false)

    if (totalCriadas > 0) {
      toast({
        title: `${totalCriadas} vagas cadastradas com sucesso!`,
        description: 'As novas vagas já estão ativas e visíveis no painel.',
      })
      // Disparar atualização global
      window.dispatchEvent(new CustomEvent('souyess_meu_dia_updated'))
      if (onSucesso) onSucesso()
      onOpenChange(false)
    }

    if (erros.length > 0) {
      toast({
        title: 'Algumas vagas falharam',
        description: erros.join(', '),
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-6 bg-white dark:bg-[#1A2240] dark:border-[#2E3A6E] font-sans">
        <DialogHeader className="border-b border-slate-100 dark:border-[#2E3A6E] pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-[10px] uppercase font-bold tracking-widest text-[#E9530E] bg-[#FEF1EA] dark:bg-[#E9530E]/20 px-2 py-0.5 rounded border border-[#FBDCC9] dark:border-[#E9530E]/30">
                  Entrada Rápida em Lote
                </span>
              </div>
              <DialogTitle className="font-display text-xl font-bold text-[#212B55] dark:text-[#F7F8FB] mt-1">
                Cadastro Rápido de Vagas em Linha (Grid)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Cadastre múltiplas vagas simultaneamente direto pela tela, sem precisar de
                planilhas.
              </DialogDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={carregarExemplo}
              className="text-xs border-[#FBDCC9] dark:border-[#E9530E]/30 text-[#E9530E] bg-[#FEF1EA] dark:bg-[#E9530E]/10 font-semibold self-start sm:self-center"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-[#E9530E]" />
              Preencher Exemplo
            </Button>
          </div>
        </DialogHeader>

        {/* Grid de Linhas Editáveis */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
          <div className="border border-slate-200 dark:border-[#2E3A6E] rounded-xl overflow-hidden bg-white dark:bg-[#11162B]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-[#141B34] text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-[#2E3A6E] sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 min-w-[200px]">Título da Vaga *</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Departamento *</th>
                  <th className="py-2.5 px-3 min-w-[120px]">Modalidade</th>
                  <th className="py-2.5 px-3 min-w-[130px]">Faixa Salarial</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Requisitos / Stacks (vírgula)</th>
                  <th className="py-2.5 px-3 w-16 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#2E3A6E]">
                {linhas.map((linha, idx) => (
                  <tr
                    key={linha.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-[#1A2240]/60 transition-colors"
                  >
                    <td className="p-2">
                      <Input
                        placeholder="Ex: Engenheiro Backend Sênior"
                        value={linha.titulo}
                        onChange={(e) => atualizarCampo(linha.id, 'titulo', e.target.value)}
                        className="h-8 text-xs bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E]"
                      />
                    </td>
                    <td className="p-2">
                      <Select
                        value={linha.departamento}
                        onValueChange={(val) => atualizarCampo(linha.id, 'departamento', val)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E]">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-[#1A2240] dark:border-[#2E3A6E]">
                          {DEPARTAMENTOS_SUGERIDOS.map((dept) => (
                            <SelectItem key={dept} value={dept} className="text-xs">
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Select
                        value={linha.modalidade}
                        onValueChange={(val: any) => atualizarCampo(linha.id, 'modalidade', val)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-[#1A2240] dark:border-[#2E3A6E]">
                          <SelectItem value="Remoto" className="text-xs">
                            Remoto
                          </SelectItem>
                          <SelectItem value="Híbrido" className="text-xs">
                            Híbrido
                          </SelectItem>
                          <SelectItem value="Presencial" className="text-xs">
                            Presencial
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Input
                        placeholder="Ex: R$ 8.000 - 10.000"
                        value={linha.faixa_salarial}
                        onChange={(e) => atualizarCampo(linha.id, 'faixa_salarial', e.target.value)}
                        className="h-8 text-xs bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E]"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        placeholder="Ex: React, Node, AWS"
                        value={linha.requisitos_principais}
                        onChange={(e) =>
                          atualizarCampo(linha.id, 'requisitos_principais', e.target.value)
                        }
                        className="h-8 text-xs bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E]"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => duplicarLinha(idx)}
                          className="h-7 w-7 text-slate-500 hover:text-slate-900"
                          title="Duplicar linha"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removerLinha(linha.id)}
                          className="h-7 w-7 text-rose-500 hover:bg-rose-50"
                          title="Excluir linha"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={adicionarLinha}
            className="text-xs border-dashed border-slate-300 dark:border-[#2E3A6E] font-semibold w-full h-9"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-[#E9530E]" />
            Adicionar Nova Linha no Grid
          </Button>
        </div>

        <DialogFooter className="border-t border-slate-100 dark:border-[#2E3A6E] pt-4 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {linhas.filter((l) => l.titulo.trim().length > 0).length} vaga(s) pronta(s) para
            cadastro
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={salvando}
              onClick={handleSalvarTudo}
              className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-bold shadow-xs px-5"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Gravando Vagas...
                </>
              ) : (
                'Salvar Vagas no Sistema'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

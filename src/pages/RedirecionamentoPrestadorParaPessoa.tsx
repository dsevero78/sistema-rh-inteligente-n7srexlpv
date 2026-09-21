import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Clock } from 'lucide-react'

/**
 * Componente de Redirecionamento Unificado:
 * Garante que qualquer acesso às URLs legadas (/prestadores, /prestadores/:id, /prestadores-pj, /prestadores-pj/:id)
 * seja resolvido para a ficha vitalícia da pessoa correspondente em /pessoas/:id#vinculos.
 */
export const RedirecionamentoPrestadorParaPessoa: React.FC = () => {
  const params = useParams<{ id?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [resolvendo, setResolvendo] = useState(true)

  const prestadorId = params.id || searchParams.get('id')

  useEffect(() => {
    let cancelado = false

    async function redirecionar() {
      // Se não houver ID especificado, vai para o diretório de pessoas
      if (!prestadorId) {
        navigate('/pessoas', { replace: true })
        return
      }

      try {
        // 0. Se o próprio ID já for o ID de uma pessoa na coleção `pessoas`, redirecionar direto
        const pessoaDireta = await pb
          .collection('pessoas')
          .getOne(prestadorId)
          .catch(() => null)

        if (!cancelado && pessoaDireta) {
          navigate(`/pessoas/${pessoaDireta.id}`, { replace: true })
          return
        }

        // 1. Tentar encontrar diretamente uma pessoa cujo `prestador_origem` seja este ID
        const pessoaPorOrigem = await pb
          .collection('pessoas')
          .getFirstListItem(`prestador_origem = '${prestadorId}'`)
          .catch(() => null)

        if (!cancelado && pessoaPorOrigem) {
          navigate(`/pessoas/${pessoaPorOrigem.id}`, { replace: true })
          return
        }

        // 2. Tentar buscar os dados do prestador PJ para fazer match por CNPJ, email ou razão social
        const prestadorRecord = await pb
          .collection('prestadores_pj')
          .getOne(prestadorId)
          .catch(() => null)

        if (prestadorRecord) {
          // Tentar por CNPJ
          if (prestadorRecord.cnpj) {
            const pessoaPorCnpj = await pb
              .collection('pessoas')
              .getFirstListItem(`cpf_cnpj = '${prestadorRecord.cnpj}'`)
              .catch(() => null)

            if (!cancelado && pessoaPorCnpj) {
              navigate(`/pessoas/${pessoaPorCnpj.id}`, { replace: true })
              return
            }
          }

          // Tentar por email de contato
          if (prestadorRecord.contato_email) {
            const pessoaPorEmail = await pb
              .collection('pessoas')
              .getFirstListItem(`email = '${prestadorRecord.contato_email}'`)
              .catch(() => null)

            if (!cancelado && pessoaPorEmail) {
              navigate(`/pessoas/${pessoaPorEmail.id}`, { replace: true })
              return
            }
          }

          // Tentar por nome fantasia / razão social
          const nomeBusca = (
            prestadorRecord.nome_fantasia ||
            prestadorRecord.razao_social ||
            ''
          ).trim()
          if (nomeBusca) {
            const pessoaPorNome = await pb
              .collection('pessoas')
              .getFirstListItem(`nome ~ '${nomeBusca}'`)
              .catch(() => null)

            if (!cancelado && pessoaPorNome) {
              navigate(`/pessoas/${pessoaPorNome.id}`, { replace: true })
              return
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao resolver redirecionamento prestador -> pessoa:', err)
      }

      // Se não encontrou pessoa específica, vai para a lista de pessoas
      if (!cancelado) {
        navigate('/pessoas', { replace: true })
      }
    }

    redirecionar().finally(() => {
      if (!cancelado) setResolvendo(false)
    })

    return () => {
      cancelado = true
    }
  }, [prestadorId, navigate])

  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <Clock className="w-8 h-8 animate-spin text-[#E9530E] mb-3" />
      <h3 className="text-base font-bold text-[#212B55] dark:text-[#F7F8FB] font-display">
        Redirecionando para a Ficha Unificada de Pessoas...
      </h3>
      <p className="text-xs text-muted-foreground mt-1 font-sans">
        A gestão de prestadores PJ agora faz parte do ciclo de vida vitalício em Pessoas.
      </p>
    </div>
  )
}

export default RedirecionamentoPrestadorParaPessoa

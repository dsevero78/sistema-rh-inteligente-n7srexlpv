# Pacote de Referência Visual e Funcional — SouYess People Hub

Este diretório (`referencia-skip/`) foi concebido como um **pacote autônomo e exclusivamente aditivo** para documentar o estado atual do sistema **Sistema RH Inteligente (SouYess People Hub)** antes da sua transição para uma infraestrutura orientada a PostgreSQL.

---

## 1. Identificação da Referência Técnica

- **Nome do Projeto:** Sistema RH Inteligente / SouYess People Hub
- **Versão da Aplicação:** `0.0.101` (conforme declarado em `package.json`)
- **Ambiente de Referência:** Homologação (Skip Cloud)
- **Data da Consolidação da Documentação:** 23 de Setembro de 2026
- **Branch do Repositório:** `desconhecida` (ambiente de container efêmero sem histórico Git direto)
- **Commit Atual:** Gerado via pipeline de integração contínua (registrado no commit das alterações)
- **Natureza das Alterações:** **Estritamente aditiva**. Nenhum arquivo de produção existente no projeto raiz foi alterado ou sobrescrito.

---

## 2. Estrutura de Diretórios e Conteúdo

```
referencia-skip/
├── README.md                      # Este documento de apresentação e guia geral
├── manifesto.json                 # Manifesto estruturado de capturas planejadas e arquivos copiados
├── prd-estado-atual.md            # PRD detalhado da implementação real do sistema
├── padrao-visual.md               # Especificação visual, tipografia, paleta e tabela de UI
├── fluxos-e-comportamentos.md     # Percursos prioritários e regras de interação numeradas
├── lacunas-e-limitacoes.md        # Relatório de itens não gerados e instruções para completá-los
├── capturas/
│   └── ROTEIRO-CAPTURAS.md        # Roteiro manual para captura das 53 telas e estados em homologação
├── codigo-referencia/             # Cópia fiel dos arquivos de interface, lógica e serviços
└── assets/                        # Espaço destinado a ativos estáticos e marcas
```

---

## 3. Classificação Metodológica de Integridade

Para garantir total transparência em relação à fidelidade das informações:
- Todas as definições de campos, rotas, telas, regras de negócio e de banco são identificadas com o selo **`[comprovado no código]`**.
- A confirmação visual de renderização em tela gráfica ativa e verificação física de fontes é identificada como **`[não verificado]`**.
- Funcionalidades conceitualmente desenhadas mas sem suporte server-side ativo constam como **`[planejada mas não implementada]`**.
- **Nenhum arquivo gráfico foi fabricado por inteligência artificial ou renderizado de forma simulada.**

---

## 4. Instruções para o Administrador

Consulte o arquivo `lacunas-e-limitacoes.md` para instruções passo a passo sobre:
1. Como produzir as 53 capturas visuais obrigatórias em homologação.
2. Como auditar as fontes efetivamente renderizadas no DevTools.
3. Como obter a versão exata do PocketBase via endpoint `GET /api/health`.
4. Como gerar os arquivos `.zip` e respectivos hashes SHA-256 após o download do repositório no GitHub.

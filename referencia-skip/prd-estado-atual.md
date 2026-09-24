# PRD do Estado Atual da Implementação — SouYess People Hub

> **Classificação Metodológica e Rótulos Obrigatórios:**  
> Todas as informações contidas neste documento foram categorizadas rigorosamente de acordo com os seguintes critérios:
>
> - `[comprovado no código]`: Verificado e auditado diretamente no código-fonte, rotas, tipos TypeScript, serviços e migrações do repositório.
> - `[não verificado]`: Dependente de execução gráfica ativa, renderização de tela no navegador ou testes manuais de ponta a ponta não observados nesta cadeia.
> - `[planejada mas não implementada]`: Funcionalidade citada em documentações conceituais ou com esqueleto técnico, mas sem persistência, regras ou telas completas no código atual.  
>   _(Nota: O rótulo `[observada na aplicação]` não foi empregado, visto que esta cadeia de ferramentas opera sem interface gráfica renderizada)._

---

## 1. Visão Geral da Arquitetura Atual

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix UI), Lucide Icons. `[comprovado no código]`
- **Backend Atual:** Skip Cloud (PocketBase 0.23+ com banco SQLite embarcado). `[comprovado no código]`
- **Camada de Autenticação:** PocketBase AuthStore persistido em `localStorage`, complementado por mecanismo de contingência e recuperação de sessão em caso de instabilidade (`sessionBackup.ts`). `[comprovado no código]`
- **Alvo da Migração Futura:** Banco de dados relacional PostgreSQL com backend dedicado.

---

## 2. Inventário e PRD por Tela Relevante

### 2.1 Tela de Autenticação / Login

- **Rota:** `/login` `[comprovado no código]`
- **Posição no Menu:** Não consta no menu (rota pública raiz de autenticação). `[comprovado no código]`
- **Finalidade:** Permitir a entrada segura de usuários no sistema e restaurar o token de sessão JWT corporativo.
- **Campos e Significado:**
  - E-mail corporativo (`email`): Identificador único do usuário.
  - Senha corporativa (`password`): Senha de acesso.
  - Cartão de perfis demonstrativos: Permite auto-preenchimento rápido para perfil RH e Gestor em ambiente de homologação. `[comprovado no código]`
- **Ações e Transições de Estado:**
  - `handleSubmit`: Invoca `authWithPassword(email, password)`. Em caso de sucesso, armazena token e redireciona para a página solicitada ou `/dashboard`.
  - Tratamento de erro: Exibe mensagem de credenciais inválidas. `[comprovado no código]`
- **Regras de Negócio e Permissões:**
  - Qualquer usuário pode tentar autenticar via `/api/collections/users/auth-with-password`. `[comprovado no código]`
- **Tratamento de Dados Ausentes:** Campos validados no formulário (`required`). `[comprovado no código]`
- **Dependências:** `src/pages/auth/Login.tsx`, `src/contexts/AuthContext.tsx`, `pb.collection('users')`. `[comprovado no código]`
- **Limitações Conhecidas:** A autenticação é direta contra a coleção `users` do PocketBase. `[comprovado no código]`

---

### 2.2 Módulo Pessoas — Lista Geral

- **Rota:** `/pessoas` `[comprovado no código]`
- **Posição no Menu:** Menu Lateral -> Grupo "Pessoas & Contratos" -> "Pessoas". `[comprovado no código]`
- **Finalidade:** Fornecer visão unificada de todo o quadro de colaboradores da organização (profissionais CLT, prestadores PJ, sócios e terceiros) em uma única tabela vitalícia. `[comprovado no código]`
- **Campos e Significado:**
  - `nome`: Nome completo ou razão social do profissional.
  - `cpf_cnpj`: Documento oficial de identificação.
  - `tipo_pessoa`: 'PF' ou 'PJ'.
  - `modalidade`: 'CLT', 'PJ', 'Socio', 'Estagio'.
  - `situacao_contrato`: 'Vigente', 'Em integracao', 'Suspenso', 'Encerrado', 'Rescindido'.
  - `empresa` / `area`: Unidade de negócio e departamento aos quais o colaborador está vinculado.
  - `gestor_imediato`: Referência à pessoa responsável pela liderança direta.
  - `horas_base_mensal`: Carga horária mensal acordada (relevante para capacidade).
  - `valor_mensal`: Remuneração contratada mensal. `[comprovado no código]`
- **Ações e Transições de Estado:**
  - Filtrar por busca textual, modalidade, BU, situação e área.
  - Clicar na linha: Redireciona para `/pessoas/:id`.
  - Abrir "Novo Cadastro de Pessoa": Modal com formulário cadastral.
  - Abrir "Aproveitar Fontes": Modal para importar ou vincular candidatos aprovados e prestadores existentes. `[comprovado no código]`
- **Regras de Negócio e Permissões:**
  - **Regra de API do PocketBase (`@request.auth`):**
    - Administrador/RH (`role = 'rh'` ou `'admin'`): Acesso total de leitura e escrita a todas as empresas do grupo.
    - Gestor de BU (`role = 'gestor'`): O filtro da API restringe a leitura aos colaboradores vinculados à mesma empresa/BU associada ao usuário (`empresa = @request.auth.empresa`). `[comprovado no código]`
- **Tratamento de Dados Ausentes:** Valores nulos de cargo ou BU exibem "Não atribuído" ou traço `-`. `[comprovado no código]`
- **Dependências:** `src/pages/PessoasListaPage.tsx`, `src/services/pessoasService.ts`, coleções `pessoas`, `empresas`, `areas`. `[comprovado no código]`
- **Limitações Conhecidas:** Falta de proteção server-side de campos sensíveis de remuneração; o mascaramento de valores sensíveis na API ainda é apenas de diagnóstico (ver seção de Segurança). `[comprovado no código]`

---

### 2.3 Módulo Pessoas — Ficha Vitalícia e Detalhes

- **Rota:** `/pessoas/:id` `[comprovado no código]`
- **Posição no Menu:** Sub-rota de `/pessoas` (não listada diretamente no menu). `[comprovado no código]`
- **Finalidade:** Centralizar todos os dados cadastrais, contratuais, histórico de movimentações, documentos anexos (cofre) e períodos de descanso de uma pessoa. `[comprovado no código]`
- **Abas Disponíveis:**
  1. `Visão Geral / Resumo`: Dados pessoais, endereço, contatos e crachá funcional.
  2. `Documentos (Cofre)`: Arquivos enviados (certidões, contratos assinados, atos constitutivos).
  3. `Contratos & Vínculos`: Histórico de contratos (CLT/PJ) e transições.
  4. `Férias & Descanso`: Períodos aquisitivos CLT e agendamento de descanso de 30 dias para prestadores PJ.
  5. `Horas & Apontamentos`: Histórico de horas apontadas e aprovadas para o colaborador.
  6. `Benefícios`: Benefícios ativos e custos associados ao vínculo. `[comprovado no código]`
- **Ações e Transições:**
  - Modo Edição: Alterna para campos editáveis e grava via `pessoasService.atualizarPessoa()`.
  - Upload de Documento: Grava arquivo com metadados de vencimento na coleção `documentos_pessoa`.
  - Programar Descanso/Férias: Cria registro em `programacao_descanso`. `[comprovado no código]`
- **Regras de Negócio e Permissões:**
  - Regra de Acesso de Gestor: Um gestor só pode carregar e visualizar fichas de colaboradores de sua própria BU. `[comprovado no código]`
  - Cofre de Documentos: Gestores da mesma BU podem visualizar documentos anexados (Regra da Etapa 1). `[comprovado no código]`
- **Dependências:** `src/pages/PessoaDetalhesPage.tsx`, serviços associados de pessoas, documentos, contratos e férias. `[comprovado no código]`

---

### 2.4 Planejamento da Força de Trabalho — Workspace e Planos

- **Rota:** `/planejamento-forca` `[comprovado no código]`
- **Posição no Menu:** Menu Lateral -> Grupo "Planejamento & Estrutura" -> "Planejamento da Força". `[comprovado no código]`
- **Finalidade:** Dimensionar postos de trabalho, calcular orçamentos futuros, simular cenários de contratação e acompanhar aprovações formais de headcount. `[comprovado no código]`
- **Sub-abas do Workspace:**
  1. `Visão Geral`: Painel executivo com metas de folha, total de posições e status de aprovação.
  2. `Demandas & Posições`: Cadastro e dimensionamento de necessidades e vagas planejadas com campos de criticidade e modalidade de trabalho.
  3. `Capacidade & Alocações`: Gestão fina de dedicação operacional e disponibilidade de colaboradores.
  4. `Custos Consolidados`: Projeção de impacto orçamentário mensal e anual.
  5. `Cenários Comparativos`: Ferramenta de trade-off com inteligência artificial para avaliar alternativas de preenchimento.
  6. `Histórico & Governança`: Auditoria de aprovações, revisões de versão e snapshots congelados em JSON. `[comprovado no código]`
- **Campos Principais:**
  - `codigo`: Identificador corporativo do plano (ex.: `PLANO-2026-TECH-01`).
  - `situacao`: `rascunho`, `em_analise`, `aprovado`, `em_revisao`, `arquivado`.
  - `versao`: Versão do plano (ex.: `1.0`, `1.1`).
  - `periodo_inicio` e `periodo_fim`: Janela de vigência do plano. `[comprovado no código]`
- **Ações e Transições de Estado:**
  - Submeter Plano: Transição de `rascunho` para `em_analise`.
  - Aprovar Plano: Gera snapshot JSON imutável, congela a versão e avança para status `aprovado`.
  - Iniciar Revisão: Cria um novo rascunho versionado incrementando o número menor (ex.: `1.0` -> `1.1`). `[comprovado no código]`
- **Regras de Negócio e Permissões:**
  - Apenas perfis RH e Direção possuem autorização para aprovar planos e gerar snapshots de auditoria. `[comprovado no código]`
- **Dependências:** `src/pages/PlanejamentoForcaPage.tsx`, `src/services/planejamentoForcaService.ts`, coleções `planos_capacidade`, `demandas_planejadas`, `posicoes_planejadas`. `[comprovado no código]`

---

### 2.5 Capacidade, Alocações e Ocupações

- **Localização:** Sub-aba dentro de `/planejamento-forca` (`src/components/planejamento/AbaCapacidadeAlocacoes.tsx`). `[comprovado no código]`
- **Finalidade:** Calcular e demonstrar a memória de cálculo de horas de trabalho disponíveis, alocar profissionais em projetos organizacionais e associar pessoas às posições planejadas. `[comprovado no código]`
- **A Memória de Cálculo em 6 Camadas:**
  1. _Camada 1 — Capacidade Bruta:_ Carga horária base mensal (horas_base_mensal ou 100%).
  2. _Camada 2 — Indisponibilidades:_ Abatimento de férias CLT aprovadas e dias de descanso remunerado PJ agendados.
  3. _Camada 3 — Capacidade Líquida:_ Capacidade Bruta menos Indisponibilidades.
  4. _Camada 4 — Reserva Operacional:_ Percentual ou horas reservadas para sustentação/imprevistos.
  5. _Camada 5 — Alocações Confirmadas:_ Somatório de horas ou percentual comprometido em projetos vigentes.
  6. _Camada 6 — Capacidade Disponível:_ Saldo remanescente livre para novos projetos. `[comprovado no código]`
- **Tratamento de Dados Ausentes:** Caso o colaborador não tenha carga horária informada no contrato ou na ficha, o cálculo é interrompido para aquele registro e sinalizado com o status visual `CAPACIDADE NÃO DETERMINADA`. `[comprovado no código]`
- **Regras de Negócio e Permissões:**
  - **Bloqueio de Sobrealocação (`BLOQUEIO_CAPACIDADE`):** O sistema impede que a soma das alocações de disponibilidade ultrapasse 100% da capacidade líquida do colaborador, exigindo justificativa de exceção registrada. `[comprovado no código]`
- **Dependências:** `src/services/capacidadeService.ts`, coleções `alocacoes_capacidade`, `projetos_capacidade`, `ocupacoes_posicao`. `[comprovado no código]`

---

### 2.6 Estrutura Organizacional, Empresas e Unidades

- **Rota:** `/empresas` `[comprovado no código]`
- **Posição no Menu:** Menu Lateral -> Grupo "Planejamento & Estrutura" -> "Empresas & Unidades". `[comprovado no código]`
- **Finalidade:** Gerenciar a arquitetura multi-empresa do grupo empresarial, cadastrando a holding central, filiais operacionais, unidades de negócio (BUs), departamentos/áreas e associando escopos de visualização a usuários do sistema. `[comprovado no código]`
- **Campos Principais:**
  - `razao_social`, `nome_fantasia`, `cnpj`: Identificação civil da pessoa jurídica.
  - `tipo_empresa`: `holding`, `filial`, `bu_operacional`.
  - `cor_identificacao`: Cor institucional em hexadecimal usada nos crachás do sistema.
  - `areas`: Relação de departamentos hierárquicos vinculados. `[comprovado no código]`
- **Ações e Transições:**
  - Criar/editar empresa com validação de algoritmo de dígitos verificadores de CNPJ.
  - Criar/editar departamentos e vincular responsáveis.
  - Gerenciar usuários e seus respectivos escopos de acesso por BU. `[comprovado no código]`
- **Dependências:** `src/pages/EmpresasUnidadesPage.tsx`, `src/services/empresasService.ts`, coleções `empresas`, `areas`, `users`. `[comprovado no código]`

---

### 2.7 Catálogos Corporativos e Motor de Normalização

- **Rota:** `/catalogos` e `/normalizacao` `[comprovado no código]`
- **Posição no Menu:** Menu Lateral -> Grupo "Planejamento & Estrutura" -> "Catálogos & Normalização". `[comprovado no código]`
- **Finalidade:** Estabelecer a tabela canônica de cargos, competências técnicas/comportamentais e centros de custo do grupo, com motor de normalização para termos legados vindos de planilhas. `[comprovado no código]`
- **Campos e Regras:**
  - Cargos com códigos únicos, senioridade e competências obrigatórias associadas.
  - Competências com escala de proficiência de 1 a 5.
  - Motor de normalização: Identifica strings livres (ex.: "Dev Sênior", "Programador Sr") e sugere a correspondência com o cargo oficial ("Desenvolvedor Full Stack Sênior"), permitindo ao RH aprovar, rejeitar ou reverter a correspondência. `[comprovado no código]`
- **Dependências:** `src/pages/CatalogosNormalizacaoPage.tsx`, `src/services/catalogosService.ts`, coleções `cargos_corporativos`, `competencias_corporativas`, `mapeamento_normalizacao`. `[comprovado no código]`

---

### 2.8 Organograma Corporativo e Hierarquia

- **Rota:** `/organograma` `[comprovado no código]`
- **Posição no Menu:** Menu Lateral -> Grupo "Planejamento & Estrutura" -> "Organograma". `[comprovado no código]`
- **Finalidade:** Prover visualização gráfica interativa da estrutura hierárquica e das linhas de subordinação da organização. `[comprovado no código]`
- **Modos de Exibição:**
  1. `Árvore Hierárquica`: Nós expansíveis e retráteis com contagem de liderados.
  2. `Visão em Tabela`: Listagem tabular hierárquica paginada e filtrável.
  3. `Visão PJ × BU`: Matriz analítica para visualização da alocação de pessoas jurídicas nas unidades de negócio. `[comprovado no código]`
- **Parâmetro de Data de Referência:** Permite selecionar uma data de corte no calendário para reconstituir o organograma histórico daquela data. `[comprovado no código]`
- **Dependências:** `src/pages/OrganogramaPage.tsx`, `src/services/organogramaService.ts`, coleções `pessoas`, `empresas`. `[comprovado no código]`

---

## 3. Segurança, Permissões e Regras de API

### 3.1 Regras de API Implementadas no PocketBase (Migração `1741500040`)

No PocketBase atual, as regras declaradas em `pocketbase/migrations/1741500040_seguranca_regras_api_escopo_bu.js` definem: `[comprovado no código]`

- **Coleção `pessoas`:**
  - `listRule` e `viewRule`: `@request.auth.role = 'rh' || @request.auth.role = 'admin' || (@request.auth.role = 'gestor' && empresa = @request.auth.empresa)`
  - `createRule`, `updateRule`, `deleteRule`: `@request.auth.role = 'rh' || @request.auth.role = 'admin'`
- **Coleção `documentos_pessoa`:**
  - Gestores da mesma BU podem visualizar os documentos da pessoa (`@request.auth.role = 'gestor' && pessoa.empresa = @request.auth.empresa`). `[comprovado no código]`
- **Coleção `planos_capacidade`:**
  - Visível para RH/Admin de todo o grupo e para Gestores apenas se o plano pertencer à sua respectiva BU. `[comprovado no código]`

### 3.2 Pendência Crítica de Segurança Server-Side

- **Proteção de Valores Sensíveis (Salários e Remunerações):**  
  Atualmente, o arquivo `pocketbase/hooks/seguranca_valores_mascaramento.js` é apenas um endpoint de **diagnóstico de sintaxe de hooks** (`/backend/v1/test-enrich-check`).  
  **Estado:** `[planejada mas não implementada]`  
  Não há interceptador server-side (`onRecordEnrich` ou `onRecordsListRequest`) em produção que mascare ou suprima os campos `valor_mensal` ou `remuneracao` na resposta JSON para perfis que não sejam RH. A suíte de testes do repositório confirma esse comportamento.

---

## 4. Auditoria de Migrações do Banco de Dados

### 4.1 Migrações Existentes no Repositório (`pocketbase/migrations/`)

- `1741500001_criar_colecoes_rh_etapa1.js` `[comprovado no código]`
- `1741500003_vagas_candidatos_relacoes.js` `[comprovado no código]`
- `1741500020_seguranca_usuarios_escopo_bu.js` `[comprovado no código]`
- `1741500030_planejamento_forca_trabalho.js` `[comprovado no código]`
- `1741500040_seguranca_regras_api_escopo_bu.js` `[comprovado no código]`

### 4.2 Migrações Aplicadas no Servidor Sem Arquivo no Repositório (Divergências Críticas)

A inspeção da tabela interna de controle de migrações do PocketBase via `list_migrations` revelou que os seguintes arquivos foram executados diretamente no servidor remoto e **não possuem o correspondente arquivo `.js` no repositório**: `[comprovado no código]`

1. `0008_rotinas_integracao` (Aplicada em 2026-03-09 04:36)
2. `1741500002` (Aplicada em 2026-03-09 05:07)
3. `1741500010_seed_usuarios_iniciais` (Aplicada em 2026-03-09 05:27)
4. `1741500011_seed_empresas_areas` (Aplicada em 2026-03-09 05:27)
5. `1741500012_seed_pessoas_iniciais` (Aplicada em 2026-03-09 05:27)
6. `1741500021_seed_usuarios_gestores` (Aplicada em 2026-03-09 06:17)
7. `1741500022_seed_areas_unidades` (Aplicada em 2026-03-09 06:17)
8. `1741500023_seed_pessoas_adicionais` (Aplicada em 2026-03-09 06:17)

_Impacto para a Migração PostgreSQL:_ Os esquemas gerados por essas migrações devem ser extraídos a partir da estrutura viva do banco (`src/lib/pocketbase/schema.json` e tabelas existentes), não confiando apenas na pasta `pocketbase/migrations/`.

---

## 5. Divergências Documentais (Código vs `docs/`)

1. **Unificação de Prestadores PJ em Pessoas:**  
   Em documentos anteriores em `docs/`, os prestadores de serviços PJ eram tratados como uma entidade separada (`/prestadores-pj`). No código atual, a rota redireciona para `/pessoas`, onde a entidade `pessoas` unificou colaboradores CLT e prestadores PJ sob o mesmo modelo relacional. `[comprovado no código]`
2. **Governança de Categorias de Documentos:**  
   Não há enumeração estrita travada no banco para as categorias de documentos anexados; a lista é tratada no frontend através de constantes livres no TypeScript (`TipoDocumentoPessoa`). `[comprovado no código]`

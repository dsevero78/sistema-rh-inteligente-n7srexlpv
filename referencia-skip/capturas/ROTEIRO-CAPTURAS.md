# Roteiro de Capturas Visuais de Interface — Homologação

> **Aviso Importante e Classificação Metodológica:**  
> Nesta cadeia de ferramentas automatizada de desenvolvimento, **não há navegador com display gráfico ativo (Chromium/Puppeteer headless indisponível)**. Nenhuma imagem gráfica foi fabricada, simulada ou gerada por IA.  
> Este roteiro estabelece o protocolo operacional para que o **administrador de sistemas / analista de QA** realize as capturas de tela manuais a partir do ambiente de **Homologação** no preview oficial da aplicação, garantindo fidelidade absoluta para a futura reprodução em PostgreSQL.

---

## 1. Instruções para Execução e Registro de Metadados

Para cada captura realizada, registre estritamente a ficha técnica de metadados:

1. **Navegador e Versão:** ex.: _Google Chrome 123.0.6312.86 (Official Build) arm64_ ou _Firefox 124.0.1_.
2. **Sistema Operacional:** ex.: _macOS Sonoma 14.4_ ou _Ubuntu 22.04 LTS_.
3. **Viewport e Zoom:**
   - Larguras obrigatórias: **1440 px** (Desktop Amplo), **1280 px** (Desktop Padrão), **768 px** (Tablet / Drawer Aberto) e **390 px** (Mobile / iPhone 14/15).
   - Nível de Zoom: **100% estrito** (sem zoom de acessibilidade ou escala do SO).
   - Registre a altura do viewport utilizada (ex.: `1440x900`, `1280x800`, `768x1024`, `390x844`).
4. **Device Pixel Ratio (DPR):** Registre se a captura foi tirada em DPR 1x ou DPR 2x (Retina/High-DPI).
5. **Fontes Efetivamente Renderizadas (Inspeção DevTools):**
   - No Chrome/Edge: abra o DevTools (`F12` / `Cmd+Option+I`) -> Aba **Elements** -> Painel lateral **Computed** -> Role até a seção **Rendered Fonts**.
   - Identifique quais famílias foram _efetivamente usadas_ para desenhar os glifos (ex.: `Inter`, `Montserrat`, `JetBrains Mono` baixadas via Google Fonts, ou se houve fallback para fonte do sistema como `BlinkMacSystemFont` ou `Segoe UI`).
   - _Nota:_ Fontes apenas declaradas no CSS (`@font-face` ou `@import`) diferem das fontes renderizadas se houver bloqueio de rede ou falha de carregamento.
6. **Política de Dados:**
   - Utilize **exclusivamente os dados de demonstração pré-existentes** no banco de homologação (ex.: `Carlos Mendonça`, `Mariana Siqueira`, `Renato Albuquerque`, `Juliana Mendes Castro`, `Camila Vasconcelos`, `Dr. Eduardo Silveira`, `Lucas Ferreira Lima`).
   - **NÃO crie** colaboradores com dados pessoais reais (CPF, e-mail pessoal, endereço residencial ou documentos civis).
   - **NÃO exclua** os registros de homologação existentes.

---

## 2. Inventário de Rotas Reais e Divergências Verificadas

A verificação estrita do roteador central do sistema (`src/App.tsx`) contra o menu lateral (`src/components/Layout.tsx`) confirmou:

| Rota Real no Roteador             | Componente de Página                                | Status da Rota       | Observação de Divergência / Redirecionamento                                                                                       |
| :-------------------------------- | :-------------------------------------------------- | :------------------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| `/login`                          | `src/pages/auth/Login.tsx`                          | Ativa                | Página pública de autenticação corporativa com credenciais pré-carregadas.                                                         |
| `/dashboard`                      | `src/pages/Dashboard.tsx`                           | Ativa                | Painel geral de recrutamento e vagas.                                                                                              |
| `/meu-dia`                        | `src/pages/MeuDia.tsx`                              | Ativa                | Central unificada de rotina e pendências diárias.                                                                                  |
| `/pessoas`                        | `src/pages/PessoasListaPage.tsx`                    | Ativa                | Lista unificada vitalícia de pessoas (CLT e PJ).                                                                                   |
| `/pessoas/:id`                    | `src/pages/PessoaDetalhesPage.tsx`                  | Ativa                | Ficha completa vitalícia, cofre de documentos, abas contratuais.                                                                   |
| `/planejamento-forca`             | `src/pages/PlanejamentoForcaPage.tsx`               | Ativa                | Planejamento da Força de Trabalho (workspace e 6 sub-abas).                                                                        |
| `/organograma`                    | `src/pages/OrganogramaPage.tsx`                     | Ativa                | Organograma corporativo com visualização em Árvore, Tabela e PJ×BU.                                                                |
| `/empresas`                       | `src/pages/EmpresasUnidadesPage.tsx`                | Ativa                | Gestão multi-empresa (Holding e BUs), áreas e usuários com escopo.                                                                 |
| `/catalogos` e `/normalizacao`    | `src/pages/CatalogosNormalizacaoPage.tsx`           | Ativa                | Catálogo corporativo de cargos, competências, centros de custo e normalização.                                                     |
| `/contratos`                      | `src/pages/ContratosDashboardPage.tsx`              | Ativa                | Painel centralizado de contratos PJ e CLT, minutas e assinaturas.                                                                  |
| `/horas-competencias`             | `src/pages/HorasCompetenciasPage.tsx`               | Ativa                | Apontamento de horas, validação RH e fechamento de NFs em lote.                                                                    |
| `/gestor`                         | `src/pages/GestorPortal.tsx`                        | Ativa                | Portal do Gestor Contratante com escopo restrito de sua BU.                                                                        |
| `/prestadores`                    | `src/pages/RedirecionamentoPrestadorParaPessoa.tsx` | **Redirecionamento** | **Divergência registrada:** Rota histórica de prestadores PJ redireciona automaticamente para `/pessoas` (unificação de cadastro). |
| `/prestadores-pj`                 | `src/pages/RedirecionamentoPrestadorParaPessoa.tsx` | **Redirecionamento** | Redireciona para `/pessoas`.                                                                                                       |
| `/vagas` e `/vagas/:id`           | `src/pages/Vagas.tsx`, `VagaDetalhes.tsx`           | Ativa                | Gestão de vagas e processo seletivo.                                                                                               |
| `/candidatos` e `/candidatos/:id` | `src/pages/Candidatos.tsx`, `CandidatoDetalhes.tsx` | Ativa                | Gestão de candidatos, fit cultural e análise de vídeo por IA.                                                                      |

---

## 3. Roteiro Detalhado de Capturas por Tela Prioritária

### 3.1 Tela de Login e Layout Global

- **Rota:** `/login`
  - **Captura 01 — Login Desktop (1440px):** Tela inteira com cartão SouYess centralizado, gradiente de borda, geometria de fundo, credenciais pré-carregadas visíveis no card auxiliar.
  - **Captura 02 — Login Mobile (390px):** Layout adaptado responsivo em coluna única, sem quebra de texto.
  - **Captura 03 — Login Erro de Validação (1280px):** Submissão com campos em branco exibindo alertas em vermelho (`#D5392C`).
- **Layout Global (qualquer rota autenticada, ex.: `/dashboard`):**
  - **Captura 04 — Menu Lateral Expandido (1440px):** Sidebar escura institucional (260px) com gradiente `#11162B` -> `#1A2240`, logo SouYess RH, grupos colapsáveis e badges.
  - **Captura 05 — Menu Lateral Mobile / Drawer (390px e 768px):** Menu acionado via botão hambúrguer cobrindo 280px com backdrop escurecido.
  - **Captura 06 — Menu Lateral com Perfil Gestor (1280px):** Logado como `gestor@empresa.com`, evidenciando itens restritos aos quais o líder de BU tem acesso.

---

### 3.2 Módulo Pessoas (Cadastro Unificado Vitalício)

- **Rota:** `/pessoas` (Lista de Pessoas)
  - **Captura 07 — Lista Pessoas Preenchida (1440px e 1280px):** Visão completa da tabela de colaboradores e prestadores, com badges de modalidade (`CLT`, `PJ`), situação do contrato (`Vigente`, `Em integração`), indicadores de cabeçalho (total, CLT, PJ, folha total).
  - **Captura 08 — Filtros de Pessoas Aplicados (1440px):** Filtro por modalidade `PJ` e por BU `SouYess Tecnologia` ativo, exibindo contagem e chips de filtro.
  - **Captura 09 — Modal Novo Cadastro de Pessoa (1280px):** Modal aberto com formulário de campos cadastrais (Nome, CPF/CNPJ, tipo PF/PJ, modalidade, gestor, horas base, valor contratado, empresa e área).
  - **Captura 10 — Modal Aproveitar Fontes (1280px):** Modal "Aproveitar Fontes (PJ / Candidatos / Integração)" com abas de seleção rápida de prestadores, candidatos e rotinas prontas para unificação.
  - **Captura 11 — Lista Pessoas Vazia (1280px):** Busca por termo inexistente ("XYZ999") demonstrando o estado visual de lista vazia.
  - **Captura 12 — Lista Pessoas Mobile (390px):** Adaptação em cartões verticais sem estouro de largura.
- **Rota:** `/pessoas/:id` (Ficha Vitalícia de Colaborador — Exemplo: `yrk1td6xkivtcmt` - Renato Albuquerque ou `67n00jzfxy3x9yr` - Camila Vasconcelos)
  - **Captura 13 — Ficha Detalhes Aba Resumo/Geral (1440px):** Cabeçalho com avatar, crachá funcional, BU, cargo, valor mensal (comportamento de exibição para perfil RH).
  - **Captura 14 — Ficha Detalhes Aba Documentos / Cofre (1440px):** Lista de arquivos anexados reais, chips de status (`Válido`, `Vencendo`, `Vencido`), botão de upload e pré-visualização.
  - **Captura 15 — Modal Upload de Documento (1280px):** Modal de envio de arquivo para o cofre com seletor de tipo de documento e datas de emissão/vencimento.
  - **Captura 16 — Ficha Detalhes Aba Contratos & Vínculos (1440px):** Histórico de contratos e transições CLT/PJ.
  - **Captura 17 — Ficha Detalhes Aba Férias CLT / Descanso PJ (1440px):** Saldo de dias, períodos aquisitivos e programações agendadas.
  - **Captura 18 — Ficha Detalhes em Edição (1280px):** Modo de formulário editável ativo, destacando botões "Salvar Alterações" e "Cancelar".
  - **Captura 19 — Bloqueio de Acesso por Escopo de BU (1280px):** Acesso de líder da BU Tecnologia a colaborador exclusivo da BU Mídia, demonstrando retorno visual de bloqueio ou redirecionamento seguro.

---

### 3.3 Módulo Planejamento da Força de Trabalho

- **Rota:** `/planejamento-forca`
  - **Captura 20 — Workspace de Planejamento (1440px e 1280px):** Plano selecionado (ex.: `PLANO-2026-TECH-01`), cabeçalho de governança, seletor de versão (`v1.0 - Aprovado`), botões de governança ("Iniciar Nova Revisão", "Submeter").
  - **Captura 21 — Modo Lista Gerencial de Planos (1440px):** Alternância para o modo 'lista', apresentando todos os planos cadastrados, filtros por BU e situação (`Rascunho`, `Em análise`, `Aprovado`).
  - **Captura 22 — Sub-aba 1: Visão Geral (1440px):** Indicadores agregados, folha estimada, posições demandadas, metas orçamentárias.
  - **Captura 23 — Sub-aba 2: Demandas e Posições (1440px):** Tabela de postos dimensionados, criticidade (`Crítica`, `Alta`, `Média`), modalidade (`Remoto`, `Híbrido`), tipo (`Nova Posição`, `Substituição`).
  - **Captura 24 — Modal Nova Posição em Lote (1280px):** Formulário de dimensionamento de postos com campo de criação em lote (ex.: gerar 3 posições idênticas sequenciais).
  - **Captura 25 — Modal Registrar Demanda de Negócio (1280px):** Formulário com problema/necessidade, resultado esperado, grau de confirmação e referência informativa a projeto de cliente.
  - **Captura 26 — Sub-aba 4: Custos Consolidados (1440px):** Folha mensal recorrente, custos pontuais e comparativo com limite orçamentário departamental.
  - **Captura 27 — Sub-aba 5: Cenários Comparativos (1440px):** Simulador de alternativas (`realocar_capacidade`, `contratar_clt`, etc.) e painel de apoio de IA com premissas.
  - **Captura 28 — Sub-aba 6: Histórico, Aprovações e Rastreabilidade (1440px):** Trilha de auditoria, snapshot imutável em JSON e tabela de solicitações de contratação vinculadas.
  - **Captura 29 — Modal Snapshot Imutável (1280px):** Visualizador do snapshot congelado de aprovação do plano com hash criptográfico.
  - **Captura 30 — Workspace Mobile (390px):** Disposição das abas e cartões de custos em tela compacta.

---

### 3.4 Sub-módulo Capacidade, Alocações e Ocupações

- **Localização:** Sub-aba "Capacidade e Alocações" em `/planejamento-forca` (componente `AbaCapacidadeAlocacoes.tsx`)
  - **Captura 31 — Memória de Cálculo de Capacidade em Camadas (1440px):** Cartões de colaboradores demonstrando os 6 níveis de cálculo: 1. Cap. Bruta -> 2. Indisponibilidades -> 3. Cap. Líquida -> 4. Reserva Operacional -> 5. Alocações Confirmadas -> 6. Disponível para Novas Alocações.
  - **Captura 32 — Indicação de Capacidade Não Determinada (1440px):** Cartão com alerta ambar para colaborador com dados contratuais incompletos ("CAPACIDADE NÃO DETERMINADA").
  - **Captura 33 — Sub-aba Alocações (1440px):** Lista de alocações com distinção entre modalidade _Disponibilidade_ (horas/%) e _Escopo_ (marcos/entregáveis sem dedução de horas).
  - **Captura 34 — Modal Propor Nova Alocação (1280px):** Formulário com seleção de colaborador, projeto/destino, período e percentual de dedicação.
  - **Captura 35 — Alerta de Bloqueio Server-Side de Sobrealocação (1280px):** Tentativa de alocar colaborador acima de 100% acionando modal de bloqueio ou solicitação de justificativa de exceção.
  - **Captura 36 — Sub-aba Gestão de Projetos (1440px):** Tabela de projetos mínimos como destinos organizacionais de alocação.
  - **Captura 37 — Sub-aba Ocupações de Posições (1440px):** Vinculação entre posições do plano aprovado e pessoas reais contratadas ou promovidas.
  - **Captura 38 — Sub-aba Matriz de Competências por Ocupante (1440px):** Cruzamento de exigências da posição contra o perfil avaliado do ocupante.

---

### 3.5 Estrutura Organizacional, Empresas e Unidades

- **Rota:** `/empresas` (componente `EmpresasUnidadesPage.tsx`)
  - **Captura 39 — Painel Multi-Empresa (1440px e 1280px):** Cartões da Holding Matriz e das filiais/BUs operacionais (Tecnologia, Vértice Mídia, Operações), com CNPJs, cores institucionais e contagem de áreas/vínculos.
  - **Captura 40 — Modal Nova Empresa / BU (1280px):** Formulário de cadastro de unidade com validação de CNPJ, razão social, sigla e seleção de empresa-mãe.
  - **Captura 41 — Modal Gestão de Áreas Departamentais (1280px):** Lista de áreas de uma BU específica (ex.: Engenharia, Produto, Growth) com formulário de nova área e responsável.
  - **Captura 42 — Aba Gestão de Usuários e Escopos (1440px):** Relação de usuários do sistema (`RH / Recrutador`, `Gestor Contratante`), com suas respectivas BUs vinculadas e perfis de permissão.

---

### 3.6 Catálogos Corporativos e Motor de Normalização

- **Rota:** `/catalogos` (componente `CatalogosNormalizacaoPage.tsx`)
  - **Captura 43 — Catálogo de Cargos (1440px):** Tabela de cargos corporativos com códigos oficiais e competências de referência associadas.
  - **Captura 44 — Catálogo de Competências e Proficiências (1440px):** Matriz de competências técnicas e comportamentais com níveis de proficiência (1 a 5).
  - **Captura 45 — Catálogo de Centros de Custo (1440px):** Lista de centros de custo segregados por BU.
  - **Captura 46 — Painel de Normalização de Termos Legados (1440px):** Lista de correspondências detectadas, indicando status (`Pendente`, `Aplicada`, `Rejeitada`), texto original vs catálogo oficial, botões de ação do RH ("Aprovar", "Rejeitar", "Desfazer").
  - **Captura 47 — Modal Criação de Cargo com Competências (1280px):** Formulário de novo cargo oficial com seleção múltipla de competências vinculadas.

---

### 3.7 Organograma Corporativo e Hierarquia

- **Rota:** `/organograma` (componente `OrganogramaPage.tsx`)
  - **Captura 48 — Organograma em Árvore Hierárquica Expandida (1440px e 1280px):** Árvore de posições com nós recolhíveis/expandíveis, identificação de líderes de topo, subordinados imediatos, crachás de modalidade CLT/PJ e contagem de liderados.
  - **Captura 49 — Organograma com Ramo Recolhido (1440px):** Demonstração do nó contraído exibindo badge de liderados ocultos.
  - **Captura 50 — Organograma Visão em Tabela (1440px):** Aba "Visão em Tabela" com listagem tabular paginada de vínculos hierárquicos e filtros de busca.
  - **Captura 51 — Organograma Visão PJ × BU (1440px):** Aba analítica evidenciando a separação conceitual entre Pessoas Jurídicas (CNPJ formal) e Unidades de Negócio (BU operacional).
  - **Captura 52 — Seletor de Data de Referência do Organograma (1280px):** Demonstração da filtragem temporal por vigência de subordinação hierárquica.
  - **Captura 53 — Organograma Mobile (390px):** Árvore adaptada em fluxo vertical sem quebra horizontal.

---

## 4. Roteiro de Gravação de Vídeos de Comportamento (Procedimento do Operador)

Caso o administrador disponha de gravador de tela (ex.: OBS Studio, QuickTime Player ou ferramenta nativa do navegador):

1. **Parâmetros de Gravação:**
   - Resolução recomendada: `1920x1080` a 60 fps ou `1440x900` a 30 fps.
   - Formato: MP4 / H.264, sem áudio confidencial.
   - Cursor: mouse com destaque de clique visível.
2. **Percursos Prioritários a Gravar:**
   - **Vídeo A (Pessoas):** Navegar para `/pessoas` -> Aplicar filtro de modalidade "PJ" -> Buscar "Camila" -> Clicar na linha da tabela -> Abrir ficha `/pessoas/:id` -> Alternar entre abas "Resumo", "Documentos", "Contratos", "Descanso PJ" -> Clicar em "Editar" -> Alterar um dado fictício -> Clicar em "Cancelar" -> Retornar à lista.
   - **Vídeo B (Planejamento):** Navegar para `/planejamento-forca` -> Selecionar `PLANO-2026-TECH-01` -> Navegar pelas 6 abas -> Abrir modal de Nova Posição -> Fechar modal sem salvar -> Simular troca de versão para visualização de snapshot.
   - **Vídeo C (Capacidade e Alocações):** Na sub-aba "Capacidade", alterar o mês analisado (ex.: de `2026-10` para `2026-11`) -> Observar recomputação dinâmica da memória de cálculo -> Clicar em "Propor Nova Alocação" -> Selecionar colaborador -> Fechar modal.
   - **Vídeo D (Organograma):** Navegar para `/organograma` -> Recolher e re-expandir ramo da diretoria -> Selecionar um colaborador no painel lateral -> Trocar para visão em Tabela -> Trocar para visão PJ × BU.

---

## 5. Resumo de Verificação e Conclusão

- Todas as rotas indicadas correspondem **exatamente às rotas ativas em `src/App.tsx`**.
- Os dados exigidos baseiam-se **estritamente nos registros não sensíveis de homologação**.
- Nenhuma captura falsa foi gerada; o presente roteiro é o instrumento formal para a captura assistida em homologação.

# Fluxos e Comportamentos da Interface — SouYess People Hub

> **Classificação Metodológica e Aviso:**  
> **Identificado estritamente no código, não observado em renderização ativa.**  
> Esta cadeia de ferramentas não dispõe de subsistema de gravação de vídeo nem de tela gráfica interativa. As sequências de passos a seguir descrevem com precisão matemática o encadeamento de eventos, mutações de estado e comportamentos de interface declarados nos componentes React do projeto.

---

## 1. Percursos Prioritários Numerados

### Percurso A: Pessoas → Filtrar → Abrir Ficha → Editar → Cancelar → Voltar à Lista

- **Componentes envolvidos:** `src/pages/PessoasListaPage.tsx`, `src/pages/PessoaDetalhesPage.tsx`.

1. **Passo 1 (Usuário):** O usuário clica no item "Pessoas" no menu lateral (`/pessoas`).
   - **Comportamento da Tela:** O componente `PessoasListaPage` executa a query inicial em `pessoasService.listarPessoas()`. Enquanto os dados carregam, exibe skeleton loaders ou spinner de carregamento. Ao término, renderiza os cartões de KPIs superiores (Total de Pessoas, Ativos CLT, Ativos PJ, Folha Mensal) e a tabela com a listagem unificada de colaboradores.
2. **Passo 2 (Usuário):** O usuário clica no seletor de "Modalidade" e escolhe a opção `PJ`. Em seguida, seleciona no filtro de Unidade de Negócio a empresa `SouYess Tecnologia`.
   - **Comportamento da Tela:** O estado local `filtroModalidade` muda para `'PJ'` e `filtroEmpresa` para o ID da BU Tecnologia. A lista é filtrada imediatamente na memória do cliente (ou dispara nova requisição com filtro PocketBase), atualizando os contadores dos chips e reduzindo as linhas visíveis na tabela.
3. **Passo 3 (Usuário):** Na tabela, o usuário clica sobre a linha correspondente a "Camila Vasconcelos".
   - **Comportamento da Tela:** O manipulador `navigate('/pessoas/' + pessoa.id)` do React Router é disparado. A URL muda para `/pessoas/67n00jzfxy3x9yr`.
4. **Passo 4 (Usuário):** A tela `/pessoas/:id` carrega. O usuário visualiza o cabeçalho funcional, o crachá com avatar, o status contratual ("Vigente"), a BU e as abas de navegação.
   - **Comportamento da Tela:** O componente `PessoaDetalhesPage` busca os dados completos via `pessoasService.obterPessoaPorId()`, os documentos do cofre e os vínculos contratuais. Renderiza a aba ativa padrão (`visao-geral`).
5. **Passo 5 (Usuário):** O usuário clica no botão "Editar Perfil" (ícone de lápis) no cabeçalho da ficha.
   - **Comportamento da Tela:** O estado `modoEdicao` é alternado para `true`. Os textos estáticos de campos como Nome, Razão Social, CNPJ, E-mail Corporativo e Horas Base convertem-se em elementos `<Input />` e `<Select />` com os valores correntes populados. O cabeçalho passa a exibir uma barra de ações destacada com os botões "Salvar Alterações" e "Cancelar".
6. **Passo 6 (Usuário):** O usuário altera um dado cadastral (ex.: modifica a carga de horas semanais de 40 para 30) e, em seguida, decide não prosseguir e clica no botão "Cancelar".
   - **Comportamento da Tela:** O manipulador `handleCancelarEdicao()` reseta o formulário de volta para o estado original recebido da API, fecha o modo editável (`modoEdicao = false`), sem disparar nenhuma mutação de `update` contra o backend.
7. **Passo 7 (Usuário):** O usuário clica no botão com ícone de seta de retorno "Voltar para Lista" no topo da página.
   - **Comportamento da Tela:** O manipulador executa `navigate('/pessoas')`. O usuário retorna à listagem de pessoas.

---

### Percurso B: Planejamento → Abrir Plano → Trocar Versão → Navegar entre Abas

- **Componentes envolvidos:** `src/pages/PlanejamentoForcaPage.tsx`, `src/components/planejamento/AbaCapacidadeAlocacoes.tsx`, `AbaCenariosComparador.tsx`.

1. **Passo 1 (Usuário):** O usuário clica em "Planejamento da Força" no menu lateral (`/planejamento-forca`).
   - **Comportamento da Tela:** O componente carrega a lista de planos cadastrados (`planejamentoForcaService.listarPlanos()`). Se houver plano ativo, entra diretamente no modo `workspace`; se nenhum estiver pré-selecionado, renderiza a lista gerencial de planos com cards de status (`Rascunho`, `Em análise`, `Aprovado`).
2. **Passo 2 (Usuário):** O usuário seleciona o plano corporativo `PLANO-2026-TECH-01`.
   - **Comportamento da Tela:** O estado `planoAtivo` é definido com os dados do registro. A tela renderiza a barra superior de governança exibindo o código do plano, a versão atual (`v1.0`), o selo de status `Aprovado`, o botão "Alternar para Lista" e a régua de 6 sub-abas: `Geral`, `Demandas & Posições`, `Capacidade & Alocações`, `Custos`, `Cenários`, `Histórico & Aprovações`.
3. **Passo 3 (Usuário):** O usuário clica no dropdown de versões no cabeçalho do workspace e seleciona uma versão anterior ou o rascunho de revisão.
   - **Comportamento da Tela:** O componente busca a lista de revisões em `historico_versoes`. Se selecionada uma versão arquivada, os dados do snapshot imutável são injetados no estado, e a interface entra em modo de somente-leitura com tarja informativa "Visualizando Versão Histórica Congelada (Somente Leitura)".
4. **Passo 4 (Usuário):** O usuário clica na aba "Demandas & Posições".
   - **Comportamento da Tela:** A tela esconde a aba anterior e monta a tabela de demandas operacionais e postos de trabalho dimensionados, calculando o headcount total planejado, substituições e novas vagas abertas.
5. **Passo 5 (Usuário):** O usuário clica na aba "Capacidade & Alocações".
   - **Comportamento da Tela:** É renderizado o componente `AbaCapacidadeAlocacoes`, iniciando a busca assíncrona das pessoas elegíveis daquela BU, alocações vigentes no período e cálculo dinâmico da memória em 6 camadas.
6. **Passo 6 (Usuário):** O usuário clica na aba "Histórico & Aprovações".
   - **Comportamento da Tela:** É montada a linha do tempo de governança do plano, exibindo as aprovações formais de diretoria, carimbos de data/hora, assinaturas digitais registradas e o botão para inspecionar o snapshot criptográfico em JSON.

---

### Percurso C: Capacidade → Selecionar Período → Consultar Memória → Abrir Alocação

- **Componentes envolvidos:** `src/components/planejamento/AbaCapacidadeAlocacoes.tsx`, `src/services/capacidadeService.ts`.

1. **Passo 1 (Usuário):** Estando na aba de Capacidade, o usuário clica no seletor de "Mês de Referência" e altera de `2026-10` para `2026-11`.
   - **Comportamento da Tela:** O hook dispara a rotina `capacidadeService.calcularMemoriaCalculoPeriodo(empresaId, '2026-11')`. Uma animação de carregamento é apresentada nos cartões de capacidade.
2. **Passo 2 (Usuário):** A tela conclui o cálculo e atualiza os cartões de colaboradores.
   - **Comportamento da Tela:** Para cada pessoa elegível, a tela exibe a decomposição visual em 6 etapas:
     1. _Capacidade Bruta:_ Base contratada mensal (ex.: 168h ou 100%).
     2. _Indisponibilidades:_ Férias CLT aprovadas ou descanso remunerado PJ agendados para novembro/2026.
     3. _Capacidade Líquida:_ Bruta subtraída das indisponibilidades.
     4. _Reserva Operacional:_ Horas reservadas para manutenção e suporte não faturável.
     5. _Alocações Confirmadas:_ Somatório das porcentagens ou horas comprometidas em projetos daquele período.
     6. _Disponibilidade Restante:_ Saldo de horas ou porcentagem ainda livre para novas alocações.
   - Se o colaborador não possuir dados contratuais de horas cadastrados, a tela renderiza o cartão em tom amarelo âmbar com o selo explícito: `CAPACIDADE NÃO DETERMINADA — Dados contratuais incompletos`.
3. **Passo 3 (Usuário):** O usuário clica na sub-aba "Alocações" e clica no botão "Propor Nova Alocação".
   - **Comportamento da Tela:** Abre-se o modal `Dialog` com formulário de alocação: seletor de colaborador, seletor de projeto de destino, modalidade de alocação (`Disponibilidade` ou `Escopo/Entregáveis`), período (data início e fim) e carga horária ou percentual pretendido.
4. **Passo 4 (Usuário):** O usuário preenche uma alocação que ultrapassaria 100% da capacidade líquida do colaborador e clica em "Salvar Alocação".
   - **Comportamento da Tela:** O sistema detecta o conflito de sobrealocação. Em vez de persistir silenciosamente, o formulário intercepta a ação com a regra `BLOQUEIO_CAPACIDADE`: impede a gravação ou exige o preenchimento de justificativa formal de exceção antes de liberar o botão de envio.

---

### Percurso D: Organograma → Expandir Ramo → Selecionar Pessoa → Consultar Histórico

- **Componentes envolvidos:** `src/pages/OrganogramaPage.tsx`, `src/services/organogramaService.ts`.

1. **Passo 1 (Usuário):** O usuário acessa a rota `/organograma` através do menu lateral.
   - **Comportamento da Tela:** A tela chama `organogramaService.carregarDadosOrganograma(dataReferencia)`. Renderiza a visualização principal em formato de "Árvore Hierárquica" (`visao = 'arvore'`). No topo, exibe o nó raiz (ex.: Presidência / Diretoria Executiva) e, abaixo, os líderes de áreas e unidades.
2. **Passo 2 (Usuário):** O usuário identifica um nó de liderança com o badge indicador de "4 liderados diretos" e clica no botão expansor (+ / chevron).
   - **Comportamento da Tela:** O nó alterna seu estado no conjunto `nodosExpandidos`. Os ramos e cartões dos 4 liderados desdobram-se suavemente abaixo do gestor, exibindo cargo, BU e badge de modalidade (`CLT` em azul, `PJ` em roxo).
3. **Passo 3 (Usuário):** O usuário clica sobre o cartão de um colaborador específico na árvore.
   - **Comportamento da Tela:** A tela abre um painel lateral retrátil (Sheet/Drawer) com o "Resumo Funcional do Colaborador": foto/avatar, e-mail corporativo, gestor imediato formal, área de lotação, lista de liderados diretos e botão "Ver Ficha Completa" que direciona para `/pessoas/:id`.
4. **Passo 4 (Usuário):** O usuário clica no seletor de visão e escolhe "Visão em Tabela".
   - **Comportamento da Tela:** A visualização em nós gráficos é substituída por uma tabela paginada com colunas: Colaborador, Cargo, Gestor Imediato, BU / Empresa, Nível Hierárquico e Status. O campo de busca permite filtrar qualquer nó instantaneamente.
5. **Passo 5 (Usuário):** O usuário clica no seletor de visão "PJ × BU".
   - **Comportamento da Tela:** A tabela reorganiza-se em uma matriz analítica que evidencia a segregação entre o prestador PJ (empresa contratada) e a Unidade de Negócio operacional tomadora dos serviços.

---

## 2. Comportamentos Globais Identificados no Código

### 2.1 Preservação de Filtros e Navegação

- **Na lista de pessoas e tabelas:** Os filtros residem no estado local do React (`useState`). Ao navegar para outra rota e retornar via botão voltar do navegador, o estado é reinicializado com os filtros padrão, a menos que os parâmetros estejam sincronizados na URL (a maioria das telas utiliza estado em memória de componente).
- **No Workspace de Planejamento:** A seleção do plano ativo e da aba atual é armazenada no estado do componente pai (`PlanejamentoForcaPage`).

### 2.2 Proteção de Alterações Não Salvas

- Em modais de formulário (`ModalNovoCadastro`, `ModalNovaPosicao`, `ModalNovaAlocacao`), clicar no botão "Cancelar" ou no ícone "X" de fechar descarta o estado transitório do formulário sem solicitar confirmação em popup nativo, mantendo a base de dados íntegra.

### 2.3 Tratamento de Erros, Carregamento e Listas Vazias

- **Carregamento (Loading):** Skeletons com classes `animate-pulse bg-[#ECEEF4]` ou spinners centrais `Loader2` com cor `#E9530E`.
- **Listas Vazias (Empty States):** Componentes estilizados com ícones informativos suaves (`Inbox`, `Search`, `Users`), mensagens explicativas (ex.: "Nenhum colaborador encontrado com os filtros aplicados") e botões de ação para limpar filtros ou cadastrar novo item.
- **Erros de API:** Tratados via bloco `try/catch` que invoca `toast({ title: 'Erro', description: getErrorMessage(err), variant: 'destructive' })`.

### 2.4 Acessibilidade, Teclado e Foco

- Modais usam Radix UI Dialog com foco preso (`focus trap`), fechamento por tecla `Escape` e bloqueio de rolagem do body de fundo (`body lock`).
- Botões e campos possuem estilos de foco explícitos: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E9530E] focus-visible:ring-offset-2`.

# Padrão Visual e Design System — SouYess People Hub

> **Classificação Metodológica:**
>
> - **Fontes, Tokens de Cor e Dimensões no Código:** `[comprovado no código]` (extraídos diretamente de `index.html`, `src/main.css`, `tailwind.config.ts`, `components.json` e componentes primitivos em `src/components/ui/`).
> - **Fontes Efetivamente Renderizadas:** `[não verificado]` (depende da execução em navegador com renderização gráfica ativa e inspeção na aba DevTools > Computed > Rendered Fonts).

---

## 1. Tipografia e Fontes Declaradas

### 1.1 Declaração de Fontes no HTML (`index.html`)

- **URL Declarada no Google Fonts:**
  `https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=JetBrains+Mono:wght@400;500;700&family=Montserrat:ital,wght@0,300..800;1,300..800&display=swap`
- **Famílias Declaradas e Pesos:**
  1. **Inter:**
     - Tipo: Sans-serif (Interface primária e corpo de texto).
     - Pesos suportados: `100` a `900` (variável, com itálico e optical sizing 14-32).
  2. **Montserrat:**
     - Tipo: Display / Cabeçalhos institucionais (`font-display`).
     - Pesos suportados: `300` a `800` (variável, com itálico).
  3. **JetBrains Mono:**
     - Tipo: Monospaced (Valores monetários, hashes de governança, códigos, logs e chaves técnicas).
     - Pesos suportados: `400` (Regular), `500` (Medium), `700` (Bold).

### 1.2 Mapeamento de Fontes no Tailwind (`tailwind.config.ts`)

```ts
fontFamily: {
  sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
  display: ['Montserrat', 'Inter', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
}
```

### 1.3 Arquivos de Fontes Locais em `src/assets/`

- **Verificação no repositório:** Não existem arquivos `.woff`, `.woff2`, `.ttf` ou `.otf` locais na árvore do projeto.
- **Situação de Licença e Redistribuição:** O projeto depende de carregamento externo via CDN do Google Fonts (`fonts.googleapis.com`). Nenhuma cópia local foi realizada na pasta `referencia-skip/assets/` para evitar reprodução indevida ou dependência de binários não distribuídos. Na migração para PostgreSQL/novo ambiente, recomenda-se hospedar os arquivos WOFF2 localmente caso haja requisito de intranet ou conformidade estrita de rede.

---

## 2. Paleta Institucional e Tokens de Cor

As variáveis do tema baseiam-se em valores HSL mapeados no `:root` e `.dark` em `src/main.css`, complementados por cores hexadecimais estritas da identidade SouYess.

### 2.1 Identidade Central SouYess (Hexadecimal Estrito)

- **Laranja SouYess (Primária / Destaque Institucional):** `#E9530E`
  - Hover: `#C5430A`
  - Active: `#9B340A`
  - Fundo suave / Tint: `#FEF1EA` (5% a 15% opacidade)
- **Azul Marinho SouYess (Secundária / Corporativo):** `#212B55`
  - Tom escuro de fundo (Sidebar / Surface Dark): `#11162B`
  - Tom médio de superfície dark: `#1A2240`
  - Borda Dark: `#2E3A6E`
- **Vermelho Destrutivo (Alertas / Erros / Rescisões):** `#D5392C`
  - Hover: `#B52A1E`
- **Verde Sucesso / Ativo:** `#10B981` (Emerald 500) / `#059669` (Emerald 600)
- **Âmbar Atenção / Rascunho / Proposta:** `#F59E0B` (Amber 500) / `#D97706` (Amber 600)
- **Cinzas Neutros (Superfícies Claras):**
  - Fundo Geral Claro (`background`): `#F8F9FA` ou `hsl(210 20% 98%)`
  - Superfície de Cartão / Tabela (`card`): `#FFFFFF`
  - Bordas Neutras (`border`): `#E7EAF0` / `#D7DCE6`
  - Texto Principal (`foreground`): `#11162B`
  - Texto Secundário / Muted (`muted-foreground`): `#6B7384` / `#4D5566`

### 2.2 Variáveis CSS (`src/main.css`)

| Variável CSS           | Modo Claro (HSL)          | Modo Escuro (HSL) | Finalidade                          |
| :--------------------- | :------------------------ | :---------------- | :---------------------------------- |
| `--background`         | `210 20% 98%`             | `227 44% 11%`     | Fundo principal da página           |
| `--foreground`         | `227 45% 15%`             | `220 25% 97%`     | Texto padrão                        |
| `--card`               | `0 0% 100%`               | `227 42% 17%`     | Superfície de cartões e modais      |
| `--card-foreground`    | `227 45% 15%`             | `220 25% 97%`     | Texto sobre cartões                 |
| `--primary`            | `19 89% 48%` (`#E9530E`)  | `19 89% 52%`      | Cor de destaque / botão primário    |
| `--primary-foreground` | `0 0% 100%`               | `0 0% 100%`       | Texto sobre botão primário          |
| `--secondary`          | `227 44% 23%` (`#212B55`) | `227 40% 30%`     | Botões secundários corporativos     |
| `--muted`              | `220 18% 95%`             | `227 40% 18%`     | Fundos secundários suaves           |
| `--muted-foreground`   | `220 10% 46%`             | `224 20% 70%`     | Textos auxiliares e legendas        |
| `--border`             | `220 16% 90%`             | `227 40% 25%`     | Bordas de separação e cartões       |
| `--radius`             | `0.625rem` (10px)         | `0.625rem` (10px) | Raio de curvatura padrão dos cantos |

---

## 3. Tabela de Padrão Visual dos Elementos de Interface

A tabela a seguir consolida a auditoria estática de todos os blocos de interface fundamentais do sistema:

| Elemento                            | Arquivo de Origem              | Fonte / Peso / Tamanho                                                  | Cores (Fundo, Texto, Borda)                                                                                                     | Dimensões                                                               | Espaçamentos                                                    | Comportamento Responsivo                                                                                       |
| :---------------------------------- | :----------------------------- | :---------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------- | :-------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| **Botão Primário**                  | `src/components/ui/button.tsx` | Inter, 600 (Semibold), 14px (`text-sm`), tracking wide                  | Fundo: `#E9530E`<br>Texto: `#FFFFFF`<br>Hover: `#C5430A`<br>Focus Ring: `#E9530E`                                               | Altura: 40px (`h-10`)<br>Largura: Conteúdo ou `w-full`                  | `px-4 py-2`<br>Gap: 8px (`gap-2`)<br>Radius: 8px (`rounded-lg`) | Reduz para 32px (`h-8`, `text-xs`) com prop `size="sm"` ou estende em largura total em formulários mobile.     |
| **Botão Destrutivo**                | `src/components/ui/button.tsx` | Inter, 600, 14px                                                        | Fundo: `#D5392C`<br>Texto: `#FFFFFF`<br>Hover: `#B52A1E`                                                                        | Altura: 40px (`h-10`)                                                   | `px-4 py-2`<br>Radius: 8px                                      | Idem ao primário; utilizado em rescisões, exclusões e cancelamentos críticos.                                  |
| **Botão Outline**                   | `src/components/ui/button.tsx` | Inter, 600, 14px                                                        | Fundo: `#FFFFFF`<br>Borda: `#D7DCE6`<br>Texto: `#212B55`<br>Hover: `#F2F4F8`                                                    | Altura: 40px                                                            | `px-4 py-2`<br>Radius: 8px                                      | Em modo dark adota fundo `#1A2240` e borda `#2E3A6E`.                                                          |
| **Campo de Entrada (Input)**        | `src/components/ui/input.tsx`  | Inter, 400 (Regular), 14px (`text-sm`)                                  | Fundo: `#FFFFFF`<br>Borda: `#D7DCE6`<br>Texto: `#11162B`<br>Placeholder: `#98A0B0`<br>Focus: Borda `#E9530E`, ring `#E9530E/20` | Altura: 40px (`h-10`)<br>Largura: 100% (`w-full`)                       | `px-3.5 py-2`<br>Radius: 8px (`rounded-lg`)                     | Adapta-se a grades de 1 coluna em mobile (`sm:grid-cols-2 lg:grid-cols-3`).                                    |
| **Seletor (Select Trigger / Menu)** | `src/components/ui/select.tsx` | Inter, 400, 14px                                                        | Fundo: `bg-background`<br>Borda: `border-input`<br>Texto: `foreground`                                                          | Altura: 40px<br>Largura: 100%                                           | `px-3 py-2`<br>Menu: `max-h-96 min-w-[8rem]`                    | Menu posicionado via Radix Popper com prevenção de overflow de tela.                                           |
| **Cartão de Conteúdo (Card)**       | `src/components/ui/card.tsx`   | Título: Montserrat / Inter, 700 (Bold), 18px (`text-lg`)<br>Corpo: 14px | Fundo: `bg-card` (`#FFFFFF`)<br>Borda: `#D7DCE6`<br>Sombra: `shadow-[0_1px_3px_rgba(11,18,48,0.04)]`                            | Largura: 100%                                                           | Header/Content: `p-6`<br>Radius: 12px (`rounded-xl`)            | Em mobile, o padding reduz frequentemente para `p-4` nas páginas específicas.                                  |
| **Abas de Navegação (Tabs)**        | `src/components/ui/tabs.tsx`   | Inter, 600 (Semibold), 12px (`text-xs`), uppercase, tracking wider      | Container: `#ECEEF4`<br>Texto inativo: `#4D5566`<br>Ativo: Fundo `#FFFFFF`, texto `#E9530E`                                     | Altura da barra: 40px (`h-10`)                                          | Trigger: `px-3.5 py-1.5`<br>Radius trigger: 6px (`rounded-md`)  | Em telas compactas, utiliza overflow-x horizontal com barra deslizante oculta (`overflow-x-auto`).             |
| **Modal / Diálogo (Dialog)**        | `src/components/ui/dialog.tsx` | Título: Inter, 700, 18px<br>Descrição: Inter, 400, 14px                 | Overlay: `#11162B/75` com `backdrop-blur-xs`<br>Fundo: `#FFFFFF`<br>Borda: `#D7DCE6`                                            | Max-width: 512px (`max-w-lg`) a 896px (`max-w-4xl`)<br>Max-height: 92vh | Padding: `p-6`<br>Radius: 16px (`rounded-2xl`)                  | Centralizado (`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`); em mobile cobre até 96vw.           |
| **Tabela de Dados (Table)**         | `src/components/ui/table.tsx`  | Header: Inter, 700, 11px uppercase<br>Célula: Inter, 400, 14px          | Fundo Cabeçalho: `#F2F4F8`<br>Borda: `#E7EAF0`<br>Texto célula: `#11162B`<br>Linha hover: `#FEF1EA/30`                          | Altura cabeçalho: 44px (`h-11`)                                         | Células: `p-4`<br>Radius envelope: 12px (`rounded-xl`)          | Envelope externo com `overflow-x-auto` garantindo rolagem horizontal sem quebra de leiaute.                    |
| **Layout Principal / Sidebar**      | `src/components/Layout.tsx`    | Inter, 500/600, 13px e 14px                                             | Gradiente: `#11162B` -> `#1A2240`<br>Texto inativo: `#A8B0C9`<br>Ativo: Fundo `#E9530E`, texto `#FFFFFF`                        | Largura Desktop: 260px (`w-[260px]`)<br>Largura Mobile: 280px drawer    | Header bar: `h-16`<br>Content wrapper: `p-4 sm:p-6 lg:p-8`      | Em resoluções `< 1024px` (lg), a sidebar se recolhe em um Drawer acionado por botão flutuante/hambúrguer.      |
| **Cabeçalho Superior (Header)**     | `src/components/Layout.tsx`    | Inter, 600, 14px                                                        | Fundo: `#FFFFFF`<br>Borda inferior: `#E7EAF0`<br>Sombra: leve                                                                   | Altura: 64px (`h-16`)                                                   | `px-4 sm:px-6`                                                  | Contém busca global, sininho de alertas, seletor de período e avatar do usuário logado com dropdown de perfil. |
| **Rodapé de Governança**            | `src/components/Layout.tsx`    | Inter / JetBrains Mono, 400, 11px                                       | Fundo: transparente ou `#F8F9FA`<br>Texto: `#98A0B0`                                                                            | Altura: 32px                                                            | `px-6 py-2`                                                     | Exibe versão atual da aplicação (`v0.0.101`) e indicador de status da API.                                     |

---

## 4. Recomendações de Transição para o Ambiente PostgreSQL

1. **Tokens Tailwind:** Preservar rigorosamente a configuração de `tailwind.config.ts` para que classes como `text-[#E9530E]` e `bg-[#212B55]` continuem correspondendo aos mesmos valores cromáticos da identidade corporativa.
2. **Fontes Web:** Em ambiente sem conexão aberta ao Google Fonts, realizar o download das famílias `Inter`, `Montserrat` e `JetBrains Mono` em formato `.woff2`, declarando-as localmente através de blocos `@font-face` em `src/main.css`.
3. **Escala de Elevação e Sombras:** As sombras declaradas em `src/components/ui/card.tsx` e `dialog.tsx` utilizam matizes do tom corporativo azul marinho (`rgba(11, 18, 48, 0.04)` a `0.14`), conferindo profundidade sem aspecto acinzentado genérico.

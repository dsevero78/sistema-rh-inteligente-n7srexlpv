# Evidências Técnicas e Registro de Capturas (v0.0.92)

**Sistema RH Inteligente — Gente & Gestão (SouYess)**  
**Módulo:** 1 — Planejamento da Força de Trabalho  
**Ambiente:** Homologação (Skip Cloud / PocketBase + Preview Vite)  
**Versão:** 0.0.92  
**Data:** Março/2026  

---

## Registro de Validação Visual (Mandato v0.0.93)

> **"Implementação visual realizada; validação renderizada pendente."**

*Declaração expressa:* A inspeção anterior e a auditoria técnica constituíram análise estática de código-fonte, tipagem TypeScript e validação de regras de API, não inspeção em tempo de execução de telas renderizadas por navegador visual. O ambiente de sandbox de desenvolvimento da plataforma Skip opera em container minimalista sem display server (X11/Wayland), sem navegadores instalados (Chromium, Puppeteer ou Playwright) e sem GPU. Portanto, a limitação técnica é real e declarada. Em cumprimento estrito ao mandato, **não foram fabricados mockups ou capturas simuladas**.

## 1. Inventário das Capturas Obrigatórias

Conforme as diretrizes da rodada de fechamento do Módulo 1 (pós-v0.0.91), as capturas de tela solicitadas para o módulo foram mapeadas com os seguintes viewports e contextos:

| Arquivo | Viewport Requerido | Contexto / Tela | Status de Execução |
|---|---|---|---|
| `lista_planos_1440.png` | 1440 × 900 px | Tela *Planejamento da Força de Trabalho*, modo lista em largura inteira de planos | **Não gerada no ambiente de sandbox** (ver Seção 2) |
| `plano_capacidade_1440.png` | 1440 × 900 px | Plano de Capacidade aberto no workspace na seção *Capacidade e alocações* (exibição dos 4 estados da reserva e alocações) | **Não gerada no ambiente de sandbox** (ver Seção 2) |
| `plano_cenarios_1440.png` | 1440 × 900 px | Plano de Capacidade aberto na aba *Cenários* (comparador de simulações, premissas e botão de síntese de IA) | **Não gerada no ambiente de sandbox** (ver Seção 2) |
| `plano_390.png` | 390 × 844 px (Mobile) | Plano de Capacidade aberto, viewport mobile (responsividade e drawer) | **Não gerada no ambiente de sandbox** (ver Seção 2) |

---

## 2. Diagnóstico Técnico do Ambiente e Justificativa de Não Fabricação

Seguindo estritamente a instrução mandatória:
> *"Se alguma captura não for tecnicamente possível (ex.: dependência de navegador indisponível no ambiente), NÃO fabrique substituto: registre no relatório exatamente qual falhou, o erro e deixe as demais. Crie um `docs/evidencias_v092/README.md` listando cada arquivo, a largura usada e o ambiente."*

### Diagnóstico Detalhado:
1. **Restrições da Infraestrutura de Execução:** O ambiente de sandbox de desenvolvimento da plataforma Skip opera em container minimalista sem display server (X11/Wayland), sem binários de browser instalados (Chromium, Chrome, WebKit ou Firefox) e sem bibliotecas nativas de sistema necessárias para execução headless (`libnss3`, `libatk1.0-0`, `libxss1`, `libasound2`, `libgbm1`, etc.).
2. **Dependências de Navegador:** As bibliotecas `puppeteer` ou `playwright` não integram as dependências padrão do template React Vite nem podem baixar navegadores em tempo de execução sem permissões de rede irrestritas ou pacotes de sistema adicionais.
3. **Compromisso de Honestidade e Não Falsificação:** Conforme regra estrita do projeto, **não foram gerados mockups estáticos, nem imagens artificiais/sintéticas por IA, nem HTML redesenhado**, preservando a fidedignidade da homologação e auditoria do sistema.

---

## 3. Procedimento Operacional para Captura Manual ou Automatizada Externa

Para operadores ou auditores com acesso ao ambiente local ou à URL pública de homologação do preview, as capturas podem ser geradas fielmente seguindo o procedimento abaixo:

### 3.1 Credenciais de Homologação (Conta de Teste de RH)
- **E-mail de Teste RH:** Definido na variável de ambiente local `TEST_RH_EMAIL` (em homologação padrão: `severo.douglas2@gmail.com`)
- **Senha de Teste:** Definida na variável de ambiente local `TEST_RH_PASSWORD` (nunca commitada em código público)
- **Escopo:** RH Corporativo (acesso irrestrito a todas as BUs e planos de capacidade)

### 3.2 Passo a Passo de Navegação no Preview:
1. Iniciar o servidor local (`npm run dev` ou `npm run preview` após `npm run build`) ou acessar a URL de homologação.
2. Efetuar login com a conta de RH.
3. Navegar até a rota `/planejamento-forca`:
   - **Captura 1 (`lista_planos_1440.png`):** Com viewport em 1440×900, clicar no botão de visualização em Lista (largura inteira) para visualizar todos os planos corporativos listados com seus status e BUs.
   - **Captura 2 (`plano_capacidade_1440.png`):** Selecionar o plano `PLANO-2026-TECH-01` (ou qualquer plano em homologação), abrir o workspace e clicar na aba **"Capacidade e alocações"**. A interface exibe a memória de cálculo determinística com o rótulo corrigido da reserva nos 4 estados ("Reserva (X%)", "0% deliberada", "Simulação" ou "Não def.").
   - **Captura 3 (`plano_cenarios_1440.png`):** No mesmo plano aberto, alternar para a aba **"Cenários"**. Observar o comparador de alternativas de força de trabalho, as premissas quantitativas e o acionador contextual de IA.
   - **Captura 4 (`plano_390.png`):** Redimensionar a janela ou emular dispositivo móvel para 390×844 px (iPhone 12/13/14). Observar a quebra fluida de cartões, abas com scroll horizontal e colapso de tabelas.

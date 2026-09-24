# Lacunas, Limitações e Orientações de Transição — SouYess People Hub

> **Classificação Metodológica:** `[comprovado no código]` / `[não verificado]`

Este documento relaciona objetivamente o que foi produzido no pacote `referencia-skip/`, o que **não pôde ser produzido** em decorrência das características do ambiente de execução automatizado, e os procedimentos detalhados para que o administrador complete cada item faltante.

---

## 1. O que este Pacote Contém

1. **`README.md`:** Documento de identificação do pacote com versão, metadados de commit, ambiente de homologação e orientações gerais de uso.
2. **`manifesto.json`:** Manifesto estruturado relacionando todas as 53 capturas de tela planejadas, associando rotas, componentes de origem, viewports e estados exigidos, com o status estrito `"nao_capturado"`. Inclui também o mapeamento de arquivos copiados para `codigo-referencia/`.
3. **`prd-estado-atual.md`:** Documento de requisitos de produto (PRD) descritivo da implementação real do sistema, cobrindo finalidades, rotas ativas, campos, regras de negócio, permissões de API, tratamento de dados ausentes e divergências documentais.
4. **`padrao-visual.md`:** Ficha de design system e especificações técnicas de estilo, com tabela completa de componentes (fontes, cores hexadecimais, dimensões, espaçamentos e responsividade).
5. **`fluxos-e-comportamentos.md`:** Descrição passo a passo numerada dos percursos prioritários de navegação e comportamento da interface.
6. **`capturas/ROTEIRO-CAPTURAS.md`:** Roteiro operacional para conduzir a captura manual de telas em homologação pelo administrador, com viewports e estados definidos.
7. **`codigo-referencia/`:** Espelhamento dos arquivos que compõem a interface e a lógica essencial do sistema (estilos globais, configuração do Tailwind, componentes de UI, páginas prioritárias, serviços, modelos, migrações e testes sanitizados).
8. **`assets/`:** Pasta de referência de ativos estáticos.

---

## 2. O que NÃO foi Produzido e Justificativa Técnica

| Item                                                   | Status             | Justificativa Técnica                                                                                                                                                                                              |
| :----------------------------------------------------- | :----------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Capturas Gráficas (PNG / WebP)**                     | **Não produzido**  | A cadeia de ferramentas de desenvolvimento atual não dispõe de navegador com motor gráfico ativo (Chromium headless indisponível). Nenhuma imagem sintética foi fabricada para garantir a integridade do processo. |
| **Vídeos de Sessão (MP4 / WebM)**                      | **Não produzido**  | Não há gravador de display de vídeo disponível no ambiente de automação. Foram entregues percursos numerados detalhados em `fluxos-e-comportamentos.md`.                                                           |
| **Fontes Efetivamente Renderizadas (Inspeção Visual)** | **Não verificado** | As fontes foram auditadas no código (`index.html`, `main.css`, `tailwind.config.ts`), mas a confirmação de renderização física em navegador exige inspeção via DevTools.                                           |
| **Arquivos ZIP Compactados**                           | **Não produzido**  | O ambiente de execução não dispõe de ferramenta de terminal com `zip` ou utilitário binário nativo. Para não fabricar hashes fictícios de integridade, os arquivos mantêm-se em pastas versionadas no Git.         |
| **Documentos PDF**                                     | **Não produzido**  | Não há utilitário real de conversão Markdown/HTML para PDF no ambiente.                                                                                                                                            |

---

## 3. Procedimento para o Administrador Obter os Itens Faltantes

### 3.1 Produção das Capturas Gráficas (Imagens)

1. Acesse o ambiente de **Homologação** no navegador (Google Chrome ou Edge recomendado).
2. Abra o DevTools (`F12` ou `Cmd+Option+I`) e ative o modo de emulação de dispositivos (`Toggle device toolbar` — `Cmd+Shift+M`).
3. Para cada item listado em `capturas/ROTEIRO-CAPTURAS.md`:
   - Configure o viewport para a largura exigida (**1440px**, **1280px**, **768px** ou **390px**) com zoom fixo em **100%**.
   - Navegue até a rota indicada e execute as ações para atingir o estado solicitado (ex.: abrir modal, aplicar filtros).
   - Utilize a função do Chrome: `Capture full size screenshot` ou `Capture screenshot`.
   - Salve a imagem na pasta `referencia-skip/capturas/` seguindo a nomenclatura `CAP-[ID]-[nome-da-tela]-[viewport].png` (ex.: `CAP-01-login-1440.png`).
   - No `manifesto.json`, atualize o campo `"status": "nao_capturado"` para `"status": "capturado"`.

### 3.2 Registro das Fontes Efetivamente Renderizadas

1. No DevTools do navegador, acesse a aba **Elements**.
2. No painel secundário, clique na aba **Computed** e role até o final, na seção **Rendered Fonts**.
3. Verifique se o navegador exibiu `Inter` e `Montserrat` provenientes da rede (Network Resource) ou se utilizou fontes do sistema operacional local (Local File). Anote essa constatação no relatório de homologação.

### 3.3 Verificação da Versão Exata do PocketBase

1. Realize uma requisição HTTP do tipo GET contra o endpoint de saúde do backend:
   ```bash
   curl -i https://[SEU-BACKEND-SKIP]/api/health
   ```
2. Alternativamente, acesse o painel administrativo do PocketBase em `/_/` e observe o rodapé inferior esquerdo para registrar a versão exata do binário (ex.: `0.23.4`).

### 3.4 Produção dos Arquivos ZIP Compactados

Após clonar o repositório ou baixar o pacote completo a partir do GitHub, o administrador pode gerar os pacotes ZIP através dos comandos de terminal:

```bash
# 1. Compactar a pasta completa de referência
zip -r referencia-skip-completa.zip referencia-skip/

# 2. Compactar separadamente documentação, código e capturas (quando tiradas)
zip -r referencia-skip-documentacao.zip referencia-skip/*.md referencia-skip/manifesto.json
zip -r referencia-skip-codigo-assets.zip referencia-skip/codigo-referencia/ referencia-skip/assets/
zip -r referencia-skip-capturas.zip referencia-skip/capturas/

# 3. Gerar os hashes SHA-256 reais de integridade
sha256sum referencia-skip-*.zip > SHA256SUMS.txt
```

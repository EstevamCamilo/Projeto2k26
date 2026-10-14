# CalcHub Pro

Uma central responsiva de **20 ferramentas de cálculo**, com dashboard, busca global (Ctrl+K), favoritos, histórico local, tema claro/escuro, gráficos, exportação e passos de resolução.

## Executar

Por usar JavaScript nativo ES Modules, **abra com um servidor HTTP local** (não com `file://`):

```bash
cd CalcHub-Pro
python -m http.server 8000
```

Acesse <http://localhost:8000>.

Também é possível hospedar a pasta diretamente em qualquer host de arquivos estáticos (Netlify, Vercel, GitHub Pages, Cloudflare Pages etc.). Não há backend.

## Estrutura

- `index.html`: documento semântico e carregamento de recursos.
- `css/themes.css`: variáveis dos temas.
- `css/style.css`: sistema visual responsivo e fallback local completo.
- `js/app.js`: dashboard, formulários, navegação, resultados, exportações e eventos.
- `js/calculations.js`: fórmulas e parser matemático seguro (sem `eval`).
- `js/charts.js`: gráficos com Chart.js e fallback SVG.
- `js/storage.js`: histórico, favoritos, memória e configurações no LocalStorage.
- `js/ui.js`: ícones SVG, mensagens, diálogos e ilustrações.
- `assets/icons/favicon.svg`: identidade visual.

## Bibliotecas

- Tailwind CSS via CDN (progressive enhancement de utilitários; estilos críticos locais)
- Lucide Icons via CDN com ícones vetoriais locais de contingência
- Chart.js via CDN, com gráficos SVG offline caso indisponível
- jsPDF via CDN; quando indisponível, usa o gerador de PDF nativo em JavaScript (sem rede)
- Fontes Google Fonts com fallback para fontes do sistema

**Nota de deploy:** as bibliotecas opcionais externas exigem Internet para suas versões completas, mas os estilos, ícones, gráficos e exportação PDF possuem fallback local. Para um ambiente com CSP estrita e zero dependências externas, empacote e fixe localmente os arquivos das bibliotecas com o bundler de sua preferência antes do deploy. Configure políticas CSP, cache e versionamento no serviço de hospedagem.

## Como funciona a persistência

Todas as operações são executadas no navegador; nenhum resultado é enviado a servidores. As chaves LocalStorage recebem prefixo `calchub:v1:`. Limites foram impostos a entradas muito grandes para evitar travamentos ou uso excessivo de memória.

## Testes

Instale Node.js 18+ e execute `npm test` para rodar os testes automatizados de fórmulas matemáticas e financeiras.

## Precisão e convenções

- Equações quadráticas retornam raízes **reais**, inclusive raiz dupla; delta negativo sinaliza a ausência de raízes reais.
- Juros: informe a taxa **anual**; no modelo composto, converte-se para a taxa mensal equivalente e os aportes entram no final de cada mês. Juros simples usam taxa mensal proporcional e ponderam os aportes pelo tempo restante.
- Estatística: variância e desvio padrão **populacionais**.
- Trigonometria: graus por padrão, com opção de radianos.
- Área/perímetro/volume: medidas devem usar unidades consistentes; o resultado será u²/u/u³.
- IMC: triagem aproximada para adultos, não diagnóstico.
- Valores decimais dos campos numéricos seguem as regras do navegador; o campo de expressão da calculadora aceita `.` ou `,`.

## Acessibilidade

Landmarks HTML, labels, textos para leitores de tela, controles operáveis por teclado, foco visível, opção de movimento reduzido e layout mobile-first.

## Licença

Código inicial de aplicação web demonstrativa para personalização e publicação.

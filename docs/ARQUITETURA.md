# Arquitetura e validação

O checkout restaurado tinha 35 páginas HTML e o acervo em `Biblioteca/`. A atualização mantém
as URLs e usa módulos nativos, sem impor uma migração para React. O azul original `#346786`
permanece como cor principal. Cartões, espaçamentos, foco e controles foram harmonizados.

## Organização

- `Biblioteca/index.html`: Hub e descoberta de ferramentas.
- `Biblioteca/shared/catalog.js`: fonte dos 38 destinos e categorias.
- `shared/hub.js`, `hub-state.js` e `hub.css`: navegação, pesquisa, favoritos e preferências.
- `shared/platform.js` e `platform.css`: navegação universal, cabeçalho e impressão segura.
- `Gera Provas/exam-model.mjs`: validação pura, pontos e ordenação; `exams.js` controla a interface.
- `HorarioEscolar/agenda-model.js`: cadastros, referências, importação e conflitos temporais.
- `Atividades/generators.mjs`: algoritmos finitos e reproduzíveis para as atividades infantis.
- `Jogos/game-core.js`: regras puras; `games.js` mantém a interface sem bibliotecas externas.
- `Calculos/`: motor matemático, histórico e visualizações preservados; caso degenerado de sistema corrigido.
- `styles/tailwind.css`: entrada do Tailwind; `shared/tailwind.css` é o CSS compilado local e versionado.
- `scripts/`: servidor estático, build e lista de recursos offline.

As páginas marcam `data-qvc-modern` ou `data-qvc-legacy`. Um alvo `data-qvc-print-target`
identifica o documento que deve ser impresso. Cabeçalhos próprios usam `data-qvc-school-header`
para evitar duplicação. Botões que representam casas/peças de jogos usam
`data-qvc-printable-button` e são convertidos em texto durante a impressão.

## Problemas corrigidos

- O catálogo de jogos estava vazio; velha permitia sobrescrever casas e não encerrava vitórias.
- A forca sorteava palavras vazias; puzzles não tinham uma garantia explícita de solução.
- Os geradores sorteavam dentro de loops sem limite, podendo travar em entradas inviáveis.
- `modal.js` substituía `onload` e tentava acessar botões ausentes em outras páginas.
- A edição de avaliações original estava incompleta e não tinha modelo validado para os três formatos.
- Os cadastros de horário e as grades não possuíam uma experiência integrada com conflitos.
- Algumas imagens de contos tinham caminhos incorretos e a Home carregava capturas grandes.
- Não havia retorno uniforme, cabeçalho padronizado nem impressão consistente entre ferramentas.

## Estado e segurança

Entradas dos usuários são renderizadas como texto. Os modelos validam tipos, datas, limites e
referências. Os arquivos JSON são validados antes de substituir rascunhos; o usuário pode preservar
ou desfazer importações conforme a ferramenta. A impressão clona somente o documento, copia
valores editados e remove scripts, handlers, menus e controles. Os nomes não são enviados pela rede.

O servidor de desenvolvimento não serve `.git`, arquivos ocultos ou `node_modules`. Para produção,
publique somente `dist/`. Não coloque senhas em arquivos públicos. O acervo original permanece
no histórico Git; bancos de palavras e contos foram preservados durante a modernização.

## Verificação

O conjunto Node testa modelos de prova, importação de horários, conflitos entre turmas, geração e
solução de labirintos, catálogo, limites do servidor e os testes matemáticos originais. Os fluxos
Playwright cobrem todas as páginas internas, busca e favoritos, os três formatos de prova, JSON,
persistência, conflitos, cabeçalho e peças na impressão, geradores, mobile e uso sem rede.

As verificações de acessibilidade usam axe sem desativar regras. Os checks automatizados não
certificam todo o acervo pedagógico, suporte a impressoras físicas ou todos os navegadores.
O PDF usa o mecanismo nativo do navegador; escolha a opção de salvar no diálogo de impressão.

A aplicação não inclui um backend de IA, contas ou sincronização entre aparelhos. As sugestões
do Hub são modelos locais explicitamente identificados. O PWA guarda recursos essenciais; as
ilustrações grandes dos contos não são baixadas em massa durante a instalação inicial.

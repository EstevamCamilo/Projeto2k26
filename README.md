# QVC — Biblioteca educacional

Plataforma em **HTML5, JavaScript moderno, CSS e Tailwind CSS**, mantendo a família azul original
`#346786`. O Hub reúne 38 ferramentas: geradores de alfabetização, cinco atividades infantis,
20 calculadoras, provas, horário escolar, contos, tabela periódica e jogos.

## Abrir no VS Code

Para baixar uma atualização já enviada ao GitHub, use o terminal na pasta deste repositório:

```bash
git pull origin main
```

Com Node.js 24 ou superior instalado:

```bash
npm ci
npm run dev
```

Abra o endereço mostrado no terminal. A página inicial está em `Biblioteca/index.html`;
o `index.html` da raiz direciona para ela. No PowerShell com restrições ao `npm.ps1`,
use `npm.cmd ci` e `npm.cmd run dev`.

Também é possível usar as ferramentas locais pelo **Live Server** do VS Code, sem Node/npm.
O ChatGPT precisa do servidor Node ou das funções Vercel incluídas neste projeto.
Use um servidor HTTP: módulos JavaScript e a impressão não são compatíveis com abrir por `file://`.

## Recursos

- Hub responsivo com busca sem acentos, filtros, favoritos, visitas e visual escuro único em azul-marinho.
- “Voltar ao Hub” e “Imprimir / Exportar PDF” em todas as páginas internas.
- Pré-visualização e impressão A4 com paginação medida e cabeçalho escolar repetido.
- Gera Provas com múltipla escolha, dissertativas, V/F, pontos, total, edição e ordenação.
- Gabarito opcional em página separada e importação/exportação de prova editável em JSON.
- Horário escolar de segunda a sexta, turmas, professores, disciplinas e períodos configuráveis.
- Alertas de sobreposição de professores entre turmas e importação validada do formato original.
- Caligrafia, labirintos, colorir por teclado, ligação de pontos e coordenação motora.
- Geradores clássicos com seleção finita e tratamento de entradas inválidas.
- Jogos com regras corrigidas, memória sem cronômetro e puzzles que sempre têm solução.
- Sugestões pedagógicas locais por modelos, sem IA generativa ou envio de dados.
- ChatGPT opcional em caça-palavras, caligrafia, provas e horário, com revisão antes de aplicar.
- Artes vetoriais locais específicas para as 38 ferramentas do Hub.
- PWA com arquivos essenciais disponíveis offline após o primeiro carregamento com rede.

## Identidade visual

A plataforma usa um único visual oficial: fundo azul-marinho `#111c27`, painéis `#1a2b3b`,
bordas `#30485b` e texto claro `#eaf2f8`. Os tokens compartilhados estão em
`Biblioteca/shared/platform.css`; os módulos e o Hub consomem a mesma paleta.
O visual é fixo e independe da preferência de cores do sistema e de configurações antigas.
Folhas escolares mantêm fundo de papel e a impressão usa texto escuro para uma boa leitura.

## Impressão e dados

Preencha os dados na ferramenta ou em **Cabeçalho escolar**. Use **Pré-visualizar A4** para conferir
as páginas. Clique em **Imprimir / Exportar PDF** e escolha **Salvar como PDF** no navegador.
Prévia e impressão usam o mesmo documento de 210 × 297 mm, com margens e paginação medida
após carregar fontes e imagens. A impressão acontece no navegador, sem enviar documentos ao servidor.

Rascunhos, favoritos e cadastros ficam neste navegador, sem sincronização entre dispositivos.
Use os arquivos JSON das provas e horários para guardar cópias e transferir dados. Antes de importar,
revise o conteúdo e mantenha uma cópia do original; o horário apresenta confirmação antes da troca.
Revise os materiais com o educador antes de usar. As opções de adaptação são ajustes pedagógicos,
sem certificação clínica. O acervo científico original não equivale a revisão curricular atualizada.

## Ativar o ChatGPT

Copie `.env.example` para `.env`, configure as variáveis do servidor e reinicie `npm run dev`.
A chave OpenAI permanece no backend. O professor usa uma senha de acesso, informa o tema e
revisa a proposta antes de aplicá-la. Cabeçalhos e nomes de alunos não são enviados automaticamente.
Sem configuração, os geradores locais continuam disponíveis. A assinatura ChatGPT é separada
do acesso e da cobrança da API OpenAI.

Veja [configuração, limites e implantação](docs/CHATGPT.md).

## Validação e publicação

```bash
npm test
npm run build
npm run test:e2e
```

Para instalar o navegador de teste: `npx playwright install chromium`. Na máquina de nuvem
que já oferece Chromium: `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`.

O build gera `dist/` e compila o Tailwind localmente. Essa pasta pode ser hospedada como site
estático, inclusive em um subdiretório: os caminhos são relativos e não há rotas SPA.
A IA usa `/api/ai/` na mesma origem e exige Node ou Vercel. Hospedagens somente estáticas,
como GitHub Pages, oferecem as ferramentas locais.
A instalação PWA exige HTTPS (ou localhost para desenvolvimento). Imagens grandes do acervo
não fazem parte do cache inicial offline. Atualizações pedem ação do usuário para preservar
rascunhos abertos.

Veja [arquitetura e validação](docs/ARQUITETURA.md). A integração contínua executa o build,
os testes de regras e os fluxos de navegador; não publica o site automaticamente.

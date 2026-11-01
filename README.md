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

Também é possível abrir o `index.html` com o **Live Server** do VS Code, sem Node/npm.
Use um servidor HTTP: módulos JavaScript e a impressão não são compatíveis com abrir por `file://`.

## Recursos

- Hub responsivo com busca sem acentos, filtros, favoritos, visitas e temas claro/escuro/infantil.
- “Voltar ao Hub” e “Imprimir / Exportar PDF” em todas as páginas internas.
- Impressão A4 com Escola, Nome do Aluno, Turma e Data, sem menus ou botões.
- Gera Provas com múltipla escolha, dissertativas, V/F, pontos, total, edição e ordenação.
- Gabarito opcional em página separada e importação/exportação de prova editável em JSON.
- Horário escolar de segunda a sexta, turmas, professores, disciplinas e períodos configuráveis.
- Alertas de sobreposição de professores entre turmas e importação validada do formato original.
- Caligrafia, labirintos, colorir por teclado, ligação de pontos e coordenação motora.
- Geradores clássicos com seleção finita e tratamento de entradas inválidas.
- Jogos com regras corrigidas, memória sem cronômetro e puzzles que sempre têm solução.
- Sugestões pedagógicas locais por modelos, sem IA generativa ou envio de dados.
- PWA com arquivos essenciais disponíveis offline após o primeiro carregamento com rede.

## Impressão e dados

Preencha os dados na ferramenta ou em **Cabeçalho escolar**. Clique em **Imprimir / Exportar PDF**
e escolha **Salvar como PDF** na janela do navegador. O conteúdo é preparado em um documento
separado com CSS A4; não é necessário instalar biblioteca de PDF nem enviar dados a servidores.

Rascunhos, favoritos e cadastros ficam neste navegador, sem autenticação ou sincronização.
Use os arquivos JSON das provas e horários para guardar cópias e transferir dados. Antes de importar,
revise o conteúdo e mantenha uma cópia do original; o horário apresenta confirmação antes da troca.
Revise os materiais com o educador antes de usar. As opções de adaptação são ajustes pedagógicos,
sem certificação clínica. O acervo científico original não equivale a revisão curricular atualizada.

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
A instalação PWA exige HTTPS (ou localhost para desenvolvimento). Imagens grandes do acervo
não fazem parte do cache inicial offline. Atualizações pedem ação do usuário para preservar
rascunhos abertos.

Veja [arquitetura e validação](docs/ARQUITETURA.md). A integração contínua executa o build,
os testes de regras e os fluxos de navegador; não publica o site automaticamente.

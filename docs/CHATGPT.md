# Configurar o ChatGPT

A integração usa a API Responses da OpenAI, JSON estruturado e validação no servidor e no
navegador. A chave OpenAI nunca é enviada ao frontend. Somente tema, etapa, quantidade,
tipo de atividade e número de períodos do horário são enviados para geração.

## No VS Code

1. Instale Node.js 24 ou superior e execute `npm ci` na raiz.
2. Copie `.env.example` para `.env`. No PowerShell: `Copy-Item .env.example .env`.
3. Preencha `OPENAI_API_KEY` com uma chave da API OpenAI.
4. Defina `AI_ACCESS_PASSWORD` com pelo menos 12 caracteres, para os professores autorizados.
5. Defina `AI_SESSION_SECRET` com pelo menos 32 bytes aleatórios. Para gerar um valor:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
   ```

6. Configure `APP_ORIGIN=http://localhost:5173` e execute `npm run dev`.
7. Abra exatamente a origem configurada, entre em uma ferramenta compatível e clique em
   **Gerar com ChatGPT**. Informe a senha, gere a proposta e revise antes de aplicar.

Se trocar a porta ou usar `127.0.0.1`, ajuste `APP_ORIGIN`. Nunca publique `.env`, chave ou senha.
O arquivo `.env` é ignorado pelo Git. O Live Server e o GitHub Pages não executam o backend.

## Variáveis

| Variável                   | Uso                                                                      |
| -------------------------- | ------------------------------------------------------------------------ |
| `OPENAI_API_KEY`           | Chave da API, exclusiva do servidor.                                     |
| `OPENAI_MODEL`             | Modelo com Structured Outputs; padrão `gpt-4.1-mini`.                    |
| `OPENAI_TIMEOUT_MS`        | Prazo da chamada à OpenAI; padrão 35 segundos.                           |
| `AI_ACCESS_PASSWORD`       | Senha dos professores; mínimo 12 caracteres.                             |
| `AI_SESSION_SECRET`        | Assinatura das sessões; mínimo 32 bytes.                                 |
| `APP_ORIGIN`               | Origem exata do frontend e API, sem caminho; HTTPS em produção pública.  |
| `AI_DAILY_LIMIT`           | Teto global diário de tentativas autorizadas; padrão 500.                |
| `UPSTASH_REDIS_REST_URL`   | URL HTTPS do Redis REST para limites compartilhados.                     |
| `UPSTASH_REDIS_REST_TOKEN` | Credencial Redis, exclusiva do servidor.                                 |
| `AI_REQUIRE_SHARED_LIMITS` | Use `true` em múltiplas instâncias Node.                                 |
| `AI_TRUST_PROXY`           | Só ative se seu proxy confiável substituir o cabeçalho de IP do cliente. |

## Implantação

Na Vercel, importe o repositório e cadastre as variáveis no painel. O `vercel.json` executa
`npm run build`, publica `dist/` e inclui o endpoint Node `api/ai/[action].js`.
Configure `APP_ORIGIN=https://seu-dominio` e Redis REST. O Redis é obrigatório na Vercel,
pois os limites precisam ser compartilhados entre instâncias. Reimplante após alterar variáveis.

Em um servidor Node, execute `npm ci`, `npm run build` e `npm run preview`. Configure
`NODE_ENV=production` e HTTPS em um proxy confiável. Uma única instância pode usar contadores
em memória, que reiniciam com o processo. Para persistência e múltiplas réplicas, configure Redis
e `AI_REQUIRE_SHARED_LIMITS=true`. Falhas do controle compartilhado bloqueiam novas gerações.

As sessões usam cookie `HttpOnly`, `SameSite=Strict` e `Secure` em produção. Trocar
`AI_SESSION_SECRET` encerra as sessões existentes. Não há cadastro individual de professores
ou sincronização de documentos. Configure limites de gastos e alertas na conta OpenAI também.

## Uso, limites e privacidade

- Caça-palavras: até 24 termos por pedido; a lista revisada monta uma grade real.
- Caligrafia: até 12 palavras ou frases curtas para as pautas.
- Provas: até 20 questões por pedido, acrescentadas à prova com pontuação e gabarito editáveis.
- Horário: até 40 aulas propostas, respeitando o número de períodos cadastrados, com até oito por dia.

Revise conteúdo, gabaritos e adequação à turma. O horário é uma proposta pedagógica;
não substitui a conferência da disponibilidade real dos professores. A ferramenta preserva
as aulas existentes e recusa propostas que criem conflitos.

Temas são enviados somente quando o professor solicita geração. Nomes de alunos, cabeçalhos
e rascunhos não são anexados automaticamente. Não inclua dados pessoais no tema. As sugestões
locais do Hub e os geradores tradicionais continuam funcionando sem OpenAI.

O serviço valida origem, sessão, tamanho do pedido e limites por IP, sessão e dia. O limite
diário inclui tentativas com falhas da OpenAI. Não há repetição automática de chamadas cobradas.
Erros e respostas inválidas são tratados sem expor corpos de erro, credenciais ou detalhes internos.

## Testes

`npm test` valida contratos e backend com respostas controladas, sem chamadas pagas.
`npm run test:e2e` verifica geração, revisão, aplicação, impressão e paginação no navegador.
Esses testes não comprovam acesso, saldo ou qualidade pedagógica de respostas reais da sua conta.
Após configurar a implantação, gere um lote pequeno para conferir a integração real.

# Prospect Radar

Aplicação web single-user para pesquisar, triar e priorizar empresas antes da prospecção comercial. O produto separa fatos confirmados, sinais comerciais e hipóteses; não integra nem automatiza LinkedIn, Sales Navigator, Salesforce, SalesLoft ou Lusha.

## Arquitetura e stack

- Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, componentes shadcn/ui/Radix e Lucide.
- Neon Postgres via `@neondatabase/serverless`, Drizzle ORM/Kit e migrations versionadas.
- Tavily para pesquisa pública e Gemini (principal) ou OpenAI (fallback) para análise estruturada validada por Zod.
- Taxonomia fechada de nove verticais e suas subverticais, classificada pelo core business com fonte e justificativa obrigatórias.
- Vercel Blob privado para backups JSON; Vercel Cron para pesquisa nos dias úteis.
- Vitest para domínio e Playwright para fluxos essenciais.

Server Components fazem leituras; mutações interativas usam endpoints/ações autenticados; integrações ficam em adaptadores de servidor (`src/lib/providers`). `getDb()` inicializa Neon de forma lazy, portanto o build não depende de `DATABASE_URL`. Sem segredos, o app funciona com empresas e fontes fictícias claramente marcadas.

## Pré-requisitos e instalação

- Node.js 24 LTS e npm 11+
- Uma conta Vercel para produção

```bash
npm install
copy .env.example .env.local
npm run dev
```

Abra `http://localhost:3000`. Em desenvolvimento sem autenticação configurada, use `demo@prospectradar.local` / `demo1234`. Essas credenciais demo são recusadas em produção.

## Variáveis de ambiente

| Variável                | Uso                                            |
| ----------------------- | ---------------------------------------------- |
| `DATABASE_URL`          | String de conexão Neon (somente servidor)      |
| `TAVILY_API_KEY`        | Busca pública                                  |
| `GEMINI_API_KEY`        | Análise estruturada principal                  |
| `GEMINI_MODEL`          | Modelo, padrão `gemini-3.1-flash-lite`         |
| `OPENAI_API_KEY`        | Fallback opcional para análise                 |
| `OPENAI_MODEL`          | Modelo OpenAI, padrão `gpt-5-mini`             |
| `CRON_SECRET`           | Segredo aleatório com pelo menos 24 caracteres |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob privado                            |
| `AUTH_SECRET`           | Segredo de sessão com pelo menos 32 caracteres |
| `ADMIN_EMAIL`           | E-mail administrativo                          |
| `ADMIN_PASSWORD_HASH`   | Hash bcrypt; nunca senha pura                  |
| `NEXT_PUBLIC_APP_URL`   | Origem canônica, sem barra final               |

Gere segredos com `openssl rand -base64 32`. Gere o hash da senha:

```bash
npm run auth:hash -- "uma-senha-longa-e-unica"
```

## Neon, migrations e seed

No painel Vercel, abra Marketplace, instale Neon Postgres no projeto e conecte todos os ambientes desejados. A integração cria a string de conexão; confirme que ela está disponível como `DATABASE_URL` ou copie a variável correspondente para esse nome.

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

O seed é idempotente: cadastra as nove verticais e suas subverticais oficiais, metas 30/150, limites operacionais e o mês atual do controle Lusha. Rode-o novamente após atualizar uma instalação existente para incluir `Video Media` e atualizar as descrições da taxonomia.

## Tavily, Gemini, OpenAI e Blob

Crie chaves nos painéis dos provedores e salve-as exclusivamente nas variáveis de servidor da Vercel. Gemini é usado primeiro; OpenAI fica como fallback opcional. Para Blob, instale Vercel Blob no Marketplace/Storage, selecione acesso privado e conecte o store ao projeto. Nunca prefixe essas chaves com `NEXT_PUBLIC_`.

Sem qualquer uma das integrações principais, o banner de demonstração permanece ativo e chamadas reais são desabilitadas com orientação na tela.

## Pesquisa diária e Cron

`vercel.json` agenda `GET /api/cron/daily-research` com `0 10 * * 1-5`. Cron usa UTC: 10:00 UTC corresponde a 07:00 em Brasília quando UTC-3. O endpoint exige `Authorization: Bearer ${CRON_SECRET}` e usa data de Brasília como chave de idempotência. A estratégia prevista é busca ampla por vertical, normalização/deduplicação, análise em lote e enriquecimento sob demanda — não 30 análises profundas dentro da mesma função.

A classificação considera a principal fonte de receita ou missão institucional. Canal digital, e-commerce, aplicativo ou portal secundário não altera a vertical. A persistência rejeita pares vertical/subvertical fora da taxonomia e exige uma fonte retornada pela busca para comprovar o core business; não há fallback automático para `Other Media`.

Antes de analisar as fontes, o fluxo envia à IA o inventário de nomes, nomes fantasia, aliases e domínios já persistidos. Os resultados das consultas são intercalados por posição, normalizados por URL e limitados por domínio antes do corte de contexto, evitando que as primeiras verticais ou um único portal ocupem toda a análise.

Teste manualmente:

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" http://localhost:3000/api/cron/daily-research
```

Confira no plano Vercel escolhido a disponibilidade e precisão do Cron e o limite de duração de Functions. O handler declara Node.js runtime e `maxDuration = 60`; planos e limites mudam, então valide no painel antes do deploy.

## Exportação, backup e restauração

- CSV é UTF-8 com BOM, escapa aspas/quebras e neutraliza células iniciadas por `=`, `+`, `-` ou `@`.
- JSON inclui versão, data, filtros, empresas, evidências, personas e histórico.
- Backups reais usam caminho `backups/YYYY/MM/prospect-radar-YYYY-MM-DD-HHmmss.json`, SHA-256 e Blob privado. Downloads devem passar por handler autenticado; não exponha URL permanente.
- A restauração deve ser iniciada em modo de simulação, comparar domínio/CNPJ/nome/aliases, exibir conflitos e só gravar após confirmação. Toda tentativa gera auditoria.

## Segurança

Sessões são JWT assinadas em cookie HTTP-only, `sameSite=lax` e `secure` em produção. Login possui rate limit em memória (troque por store compartilhado em escala horizontal), verificação de origem e bcrypt custo 12. CSP e headers de segurança são configurados em `next.config.ts`. Adaptadores externos têm timeout, validação Zod e bloqueio básico de SSRF/protocolos/IPs privados. Não são registrados segredos, sessões ou cabeçalhos sensíveis.

Não faça scraping/login/navegação automática no LinkedIn, não solicite credenciais corporativas e não use a aplicação para port scanning, pentest ou alegações de vulnerabilidade. URLs de perfil e estados de Salesforce/Lusha/SalesLoft são campos manuais e pessoais, sem sincronização.

## Qualidade

```bash
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Os testes unitários cobrem domínio/nome, score, duplicidade, schema da IA, cron, CSV/injection, backup, metas e Lusha. Playwright cobre login, painel, pesquisa/filtros, status, persona e exportação.

## Deploy na Vercel

1. Envie o repositório a um provedor Git e importe-o na Vercel.
2. Instale Neon e Blob pelo Marketplace e configure todas as variáveis para Preview e Production.
3. Rode migrations contra o banco de produção de forma controlada: `npm run db:migrate`; depois `npm run db:seed`.
4. Faça deploy de preview e valide login, exportação, pesquisa e backup.
5. Confirme `CRON_SECRET` e o Cron em Project Settings; promova o mesmo artefato para produção.

CLI opcional:

```bash
npx vercel link
npx vercel env pull .env.local
npx vercel build --prod
npx vercel deploy --prebuilt --prod
```

## Solução de problemas

- Build sem banco: confirme que nenhum módulo chama `neon()` no topo; use apenas `getDb()`.
- Tela em modo demo: consulte Configurações; faltam uma ou mais variáveis.
- Cron 401: `CRON_SECRET` do projeto e header não coincidem.
- Falha Tavily/OpenAI: verifique chave, quota e logs da execução; o app mantém estado vazio e permite retry.
- Excel exibe acentos incorretos: baixe pelo endpoint CSV, que inclui BOM UTF-8.
- Horário deslocado: o schedule é UTC, enquanto a chave diária usa `America/Sao_Paulo`.

## Estrutura principal

```text
src/app/                 páginas, layouts e Route Handlers
src/components/          design system, shell e estado demo
src/db/                  schema Drizzle e conexão Neon lazy
src/lib/providers/       interfaces e adaptadores Tavily/OpenAI/Blob
src/lib/                 domínio, autenticação, CSV, backup e segurança
drizzle/                 migrations SQL versionadas
scripts/                 migration, seed e hash bcrypt
e2e/                     testes Playwright
```

O modo demo persiste alterações no `localStorage` do navegador para facilitar a avaliação. Em produção, use Neon como fonte de verdade e um rate limiter compartilhado (por exemplo, Redis gerenciado) quando houver mais de uma instância.

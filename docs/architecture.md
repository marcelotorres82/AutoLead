# Arquitetura

O Prospect Radar é uma aplicação Next.js 16 com App Router. Leituras operacionais partem de Server Components/repositórios; mutações e integrações usam Route Handlers autenticados. Neon Postgres e Drizzle são a fonte de verdade, Vercel Workflow executa pesquisas assíncronas e Vercel Cron dispara a rotina diária.

O domínio preserva as nove verticais e subverticais definidas em `src/lib/domain.ts`. O pipeline 2.0 acrescenta candidatos, evidências tipadas, sinais técnicos, scores auditáveis, insights SDR e fila diária sem substituir empresas, fontes, personas ou status existentes.

Fluxo principal:

```text
DISCOVER → NORMALIZE → ENRICH → EVIDENCE → RESEARCH
         → QUALIFY → SOLUTION/CONFIDENCE → SDR → DAILY QUEUE
```

Falhas de um provider ou detector são registradas e não autorizam dados sintéticos. O modo demo continua explicitamente fictício e isolado da persistência real.

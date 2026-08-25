# Deploy

1. Configure Neon e Vercel Blob no projeto Vercel.
2. Configure autenticação, search providers e ao menos um LLM provider.
3. Execute `npm run db:migrate` antes de promover a versão 2.0; a migration `0003` é incremental e não remove dados.
4. Execute `npm run db:seed` para garantir a taxonomia existente e settings.
5. Valide login, pesquisa, fila, exportações e backup em Preview.
6. Confirme `CRON_SECRET` e o cron `0 10 * * 1-5`.

Ative `RESEARCH_DEBUG=true` somente durante diagnóstico. Logs não incluem chaves, cookies ou cabeçalhos sensíveis. Em rollout, monitore `NEEDS_RESEARCH`, custo, duração e falhas por estágio antes de ajustar pesos.

# Deploy separado — 06/11/2026

- URL: https://prospect-radar-hfappc366-marcelotorres1982s-projects.vercel.app
- Projeto: prospect-radar (`prj_Cnd7YzFULt6JuDL1ObdLQvB8AtLw`).
- Deployment: `dpl_2xAgcEhTzWFCqAQtiHYjRCCbAHUK`.
- Código enviado: commit local `bb12f51`, 214 arquivos versionados; nenhum arquivo de segredos enviado.
- Target da API: staging. Estado final: READY. Build remoto concluído em aproximadamente 2 minutos.
- Verificação HTTP autenticada pela Vercel: `/login` retornou 200 e HTML da aplicação.
- Variáveis herdadas do projeto. A tentativa de estender EXA_API_KEY de production para preview foi rejeitada pela revisão automática por ampliar o escopo do segredo. Não foi aplicada nem contornada. Pesquisa real no preview permanece pendente dessa configuração.
- A plataforma reassociou automaticamente o alias original durante o deploy; a associação foi restaurada e verificada no deployment anterior `dpl_68Jn3y5xYhgkLTmx929BoeqFZhqD`.
- Proteção Vercel mantida. Não foram testados login completo, OAuth ou pesquisa real no novo endereço. O OAuth existente usa APP_URL; seu callback pode exigir configuração específica para o novo endereço.

## Atualização autorizada

Após autorização explícita do usuário, EXA_API_KEY passou a atender production e preview, sem alteração do valor. Confirmados também Gemini, banco e autenticação no escopo preview.

Novo deploy: `dpl_Bdc1gz5rWf7hMAgf9vZWV9dbs26U`, target preview (null na API), READY. URL: https://prospect-radar-7uxtcgd2g-marcelotorres1982s-projects.vercel.app/login . Login verificado com HTTP 200. Alias anterior confirmado no deployment original. A pesquisa autenticada e o OAuth não foram exercitados nesta verificação.

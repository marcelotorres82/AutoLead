# Providers

Busca implementa `WebSearchProvider`; IA implementa `AiProvider`. O domínio não importa SDKs específicos. Os workflows de empresas e leads usam `ExaSearchProvider`; cada resultado sem texto é descartado antes da análise.

Seleção de IA:

```env
LLM_PROVIDER=auto # auto | gemini | anthropic | openai
LLM_MODEL=
RESEARCH_DEBUG=false
```

O provider escolhido é priorizado e os demais configurados funcionam como fallback. Respostas programáticas passam por schema Zod. Conteúdo externo é sanitizado, delimitado como dado não confiável e não pode alterar as instruções do sistema.

O cache Postgres usa TTLs documentados no código: notícias 24h, site/tecnologia/pesquisa 7 dias, contatos 14 dias e perfil 30 dias.

# Prospect Radar 2.0 — plano de migração

## Escopo e princípio de compatibilidade

Esta evolução mantém a aplicação existente, sua identidade visual, autenticação, integrações, histórico de empresas e a taxonomia fechada já adotada. As nove verticais e suas subverticais em `src/lib/domain.ts` são a fonte de verdade e não serão substituídas pelas verticais exemplificativas da especificação.

O princípio arquitetural da migração é `extração determinística → evidência → inferência`. Metas de 30 empresas por dia e 150 por semana são limites de priorização, não autorização para fabricar registros.

## Arquitetura atual

- Next.js 16.1 (App Router), React 19.2, TypeScript strict e Tailwind CSS 4.
- Server Components para leituras, Route Handlers autenticados para mutações e Vercel Workflow para execução assíncrona.
- Neon Postgres acessado por Drizzle ORM 0.45, com migrations SQL incrementais em `drizzle/`.
- Pesquisa pública abstraída por `WebSearchProvider`; Tavily, Perplexity, Anthropic e busca pública podem ser combinados por `MultiSearchProvider`.
- Análise estruturada abstraída por `AiProvider`; Claude, Gemini e OpenAI validam respostas com Zod.
- Entidades existentes: empresas, aliases, fontes, evidências simples, scores por solução, execuções de pesquisa, personas, histórico de status, configurações, backups e auditoria.
- Autenticação single-user com JWT em cookie HTTP-only e bcrypt; modo demo sem credenciais externas.
- Exportações CSV/JSON, backup privado no Vercel Blob e cron diário na Vercel já funcionam.
- Testes Vitest cobrem domínio, pesquisa, providers, CSV, backup e leads; Playwright cobre os fluxos principais.

## Funcionalidades preservadas

- Taxonomia atual de verticais/subverticais e sua validação estrita.
- Pesquisa manual e diária, histórico de runs e workflows resilientes.
- Aprovação manual antes da pesquisa de pessoas.
- Uso manual de Sales Navigator e Lusha, sem scraping de sessões ou automação indevida.
- Status comerciais atuais das empresas, exportação, backup, autenticação e modo demo.
- Abstrações existentes de busca e IA; a evolução ocorre atrás dessas interfaces.

## Problemas encontrados

1. O fallback `generateIntelligentBatchCompanies` cria empresas sintéticas quando a análise real não retorna candidatos. Isso conflita com a política evidence-first.
2. `company_evidence` registra apenas tipo e conteúdo. Faltam claim tipada, qualidade da fonte, frescor, confiança, verificação, trecho e vínculo explícito com a solução.
3. Não existe entidade de sinais técnicos; sinais, fatos e hipóteses ficam misturados no metadata da empresa.
4. Os scores WAAP/API Security/Guardicore chegam da IA. Falta um cálculo determinístico e auditável, além de scores independentes de oportunidade e confiança.
5. Não há evidence gate formal, fila diária persistida, cooldown nem contadores de sugestão/contato.
6. Não há cache persistente com TTL por tipo de pesquisa.
7. O pipeline principal ainda concentra descoberta, análise e persistência em uma função, embora o workflow já ofereça uma base para separação por estágios.
8. A interface mostra score genérico como destaque e não apresenta qualidade/frescor da evidência, labels de score, fila diária ou distinção completa entre fato, inferência e desconhecido.
9. Telemetria de tokens/custo existe no schema, mas não é preenchida consistentemente; logs carecem de uma trilha por estágio para todas as degradações.
10. A proteção de URL cobre protocolos e alguns hosts privados, mas precisa considerar todos os intervalos IP privados/reservados e resolução/redirect no crawler futuro.

## Componentes a refatorar

- `src/lib/research.ts`: tornar-se orquestrador de estágios e remover geração sintética.
- `src/lib/company-repository.ts`: persistir evidências enriquecidas, sinais técnicos, scores auditáveis e estado de qualificação.
- `src/lib/domain.ts`: continuar dono da taxonomia e dos contratos de compatibilidade, delegando inteligência evidence-first a módulos específicos.
- Páginas de dashboard, empresas e detalhe: promover Opportunity/Confidence e evidências verificáveis sem remover os fluxos atuais.
- Exportadores: incluir evidências, sinais, scores e insights, preservando os formatos existentes.

## Novos componentes

- Contratos de pipeline: candidato, evidência, sinal técnico, scores, insight SDR e fila diária.
- `NormalizationEngine` para domínio/nome/URL e deduplicação conservadora.
- `EnrichmentEngine` com detectores determinísticos independentes e degradação graciosa.
- `EvidenceEngine` para qualidade da fonte, frescor e validação de claims.
- `SolutionScoringEngine`, `ConfidenceScoringEngine` e `EvidenceGate` auditáveis.
- `SDRIntelligenceEngine` limitado aos IDs de evidência fornecidos.
- Repositório/fila diária com cooldown e histórico de sugestões.
- Cache persistente com chave, tipo, expiração e metadata.

## Alterações de banco

As alterações serão exclusivamente incrementais:

- enriquecer `company_evidence` com tipo semântico, claim, excerpt, confiança, qualidade, frescor, verificação e solução relevante;
- criar `technical_signals`;
- criar `opportunity_scores` para o snapshot auditável dos seis scores;
- criar `sdr_intelligence` com referências às evidências;
- criar `daily_lead_queue` com status próprio e unicidade por empresa/data;
- criar `research_cache` com TTL;
- adicionar à empresa os campos de cooldown e recorrência, sem alterar os status comerciais existentes.

Nenhuma tabela ou coluna existente será removida. Dados históricos continuam válidos e recebem defaults conservadores.

## Plano por fases

1. Contratos, migration incremental, Evidence model, source quality/freshness e testes.
2. Detectores técnicos determinísticos e enrichment resiliente.
3. Separação de descoberta/pesquisa e coleta de evidência usando providers existentes.
4. Scores independentes, confidence e Evidence Gate.
5. Insight SDR estruturado e limitado às evidências.
6. Fila diária, cooldown e prevenção de repetição.
7. UI Radar do Dia e detalhe evidence-first.
8. Exportação ampliada, métricas e observabilidade por estágio.
9. Testes, documentação e validação final.

## Estratégia de migração e rollout

1. Aplicar a migration em preview e manter o código capaz de ler registros antigos.
2. Fazer dual-write dos novos atributos durante a pesquisa; não reprocessar o histórico automaticamente.
3. Habilitar a fila apenas após validar os scores em preview.
4. Disponibilizar `Research Again` como nova execução com histórico, sem sobrescrever runs.
5. Medir volume de `NEEDS_RESEARCH` e ajustar pesos por configuração, nunca por preenchimento inventado.
6. Promover o mesmo artefato validado para produção e executar backfill apenas em ação separada e reversível.

## Riscos e mitigação

- **Mudança de distribuição dos scores:** armazenar breakdown e versão do algoritmo.
- **Menos de 30 leads:** comportamento esperado quando o evidence gate não é atendido.
- **Custo/latência dos providers:** limites centralizados, cache, TTL e degradação por detector.
- **Fontes antigas ou fracas:** perda explícita de peso por frescor/qualidade.
- **Prompt injection em conteúdo web:** conteúdo tratado como dado delimitado, sanitizado e nunca como instrução.
- **SSRF:** validação antes da requisição e novamente após redirects/resolução DNS no crawler.
- **Compatibilidade da UI/exportações:** campos novos opcionais durante o rollout e preservação das colunas antigas.
- **Taxonomia:** `verticalTaxonomy` permanece imutável durante esta migração e todos os pares continuam validados antes da persistência.

## Critérios de conclusão

- Nenhuma empresa é criada sem fonte real retornada por um provider.
- Toda recomendação automática possui pelo menos uma evidência relevante e rastreável.
- Fato, inferência e desconhecido são distintos no domínio e na interface.
- O evidence gate exige Opportunity ≥ 65, Confidence ≥ 70 e ao menos três evidências, incluindo uma relevante para a solução.
- Falhas secundárias reduzem confiança e são registradas, sem derrubar todo o job.
- Lint, typecheck, testes unitários, E2E aplicável e build passam antes do rollout.

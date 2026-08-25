# Prospect Radar - Métricas e KPIs para Acompanhamento

## 1. Dashboard de Saúde do Sistema

### 1.1 Uptime e Confiabilidade

```sql
-- Monitor de falhas por provedor (semanal)
SELECT 
  provider,
  COUNT(*) as total_requests,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_requests,
  ROUND(
    100.0 * (1 - SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::float / COUNT(*)),
    2
  ) as success_rate_pct
FROM research_runs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider
ORDER BY success_rate_pct ASC;
```

**Targets:**
- Tavily: >98% uptime
- Gemini: >99% uptime
- Claude: >98% uptime
- Perplexity: >95% uptime (novo)

---

### 1.2 Performance de Busca

```sql
-- Velocidade média de busca por provider (últimas 100 pesquisas)
SELECT
  provider,
  COUNT(*) as sample_size,
  ROUND(AVG(duration_ms), 0) as avg_duration_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) as p95_ms,
  ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms), 0) as p99_ms
FROM research_runs
WHERE created_at > NOW() - INTERVAL '7 days'
  AND status = 'completed'
GROUP BY provider
ORDER BY avg_duration_ms;
```

**Targets:**
- Tavily: <5s average
- Perplexity: <8s average
- Multi-search: <10s average (primeiro resultado)

---

### 1.3 Taxa de Cache Hit

```sql
-- Cache effectiveness (diário)
SELECT
  DATE(accessed_at) as date,
  search_type,
  COUNT(*) as total_queries,
  SUM(CASE WHEN cache_hit = true THEN 1 ELSE 0 END) as cache_hits,
  ROUND(
    100.0 * SUM(CASE WHEN cache_hit = true THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) as hit_rate_pct,
  ROUND(
    (SUM(CASE WHEN cache_hit = true THEN 1 ELSE 0 END) * 15) / 1000.0,
    2
  ) as estimated_savings_usd
FROM search_cache_log
WHERE accessed_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(accessed_at), search_type
ORDER BY date DESC, search_type;
```

**Targets:**
- Vertical searches: >40% hit rate (7-day cache)
- Lead searches: >25% hit rate (3-day cache)
- Manual searches: >10% hit rate (1-day cache)

---

## 2. Métricas de Qualidade

### 2.1 Acurácia de Análise

```sql
-- Comparar resultados de múltiplas IA (ensemble evaluation)
SELECT
  run_date,
  claude_count,
  gemini_count,
  openai_count,
  consensus_count,
  ROUND(
    100.0 * consensus_count / 
    GREATEST(claude_count, gemini_count, openai_count),
    2
  ) as consensus_rate_pct
FROM analysis_ensemble
WHERE run_date > NOW()::date - INTERVAL '7 days'
ORDER BY run_date DESC;
```

**Métricas:**
- Consensus rate: % de empresas que 2+ IA concordam
- Target: >75% consensus rate (indica confiança alta)

---

### 2.2 Confiança Média dos Resultados

```sql
-- Distribuição de confidence scores (histograma)
SELECT
  CASE 
    WHEN ai_confidence >= 80 THEN '80-100 (Muito Alto)'
    WHEN ai_confidence >= 60 THEN '60-79 (Alto)'
    WHEN ai_confidence >= 40 THEN '40-59 (Médio)'
    ELSE '0-39 (Baixo)'
  END as confidence_bracket,
  COUNT(*) as company_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as pct
FROM companies
WHERE created_at > NOW() - INTERVAL '30 days'
  AND demo = false
GROUP BY confidence_bracket
ORDER BY confidence_bracket DESC;
```

**Targets:**
- 80-100: >60%
- 60-79: 20-30%
- 40-59: 10-15%
- 0-39: <5%

---

### 2.3 Taxa de Duplicação

```sql
-- Detecção de duplicatas por período
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_companies,
  SUM(CASE WHEN possible_duplicate = true THEN 1 ELSE 0 END) as duplicate_flagged,
  ROUND(
    100.0 * SUM(CASE WHEN possible_duplicate = true THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) as duplicate_rate_pct
FROM companies
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Targets:**
- Antes: ~15-20%
- Depois (fuzzy dedup): <5%

---

### 2.4 Score Distribution

```sql
-- Distribuição de scores (antes vs depois)
SELECT
  'baseline' as period,
  ROUND(AVG(score), 1) as avg_score,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY score), 1) as q1,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY score), 1) as median,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY score), 1) as q3,
  COUNT(*) as sample_size
FROM companies
WHERE created_at < '2024-08-01' AND demo = false

UNION ALL

SELECT
  'after-improvements' as period,
  ROUND(AVG(score), 1) as avg_score,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY score), 1) as q1,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY score), 1) as median,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY score), 1) as q3,
  COUNT(*) as sample_size
FROM companies
WHERE created_at >= '2024-08-01' AND demo = false;
```

---

## 3. Métricas de Negócio

### 3.1 Funnel de Status

```sql
-- Pipeline de empresas por status
SELECT
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as pct,
  ROUND(AVG(score), 1) as avg_score
FROM companies
WHERE deleted_at IS NULL AND demo = false
GROUP BY status
ORDER BY count DESC;
```

**Status esperado:**
```
Nova                         ~35%  (entrada)
Pendente de validação        ~15%  (revisão)
Aprovada para pesquisar leads~20% (ativo)
Já é cliente                 ~5%   (sucesso)
Sem aderência                ~15%  (filtro)
Outros                       ~10%  (diversos)
```

---

### 3.2 Taxa de Conversão (Funil)

```sql
-- Conversão de Nova → Aprovada para pesquisar leads
SELECT
  DATE_TRUNC('week', created_at)::date as week,
  COUNT(*) as new_companies,
  SUM(CASE WHEN status = 'Aprovada para pesquisar leads' THEN 1 ELSE 0 END) as approved,
  ROUND(
    100.0 * SUM(CASE WHEN status = 'Aprovada para pesquisar leads' THEN 1 ELSE 0 END) 
    / COUNT(*),
    2
  ) as conversion_rate_pct
FROM companies
WHERE demo = false
GROUP BY week
ORDER BY week DESC;
```

**Target:** 25-35% conversion rate

---

### 3.3 Leads por Empresa Aprovada

```sql
-- Média de leads por empresa pesquisada
SELECT
  c.id as company_id,
  c.name as company_name,
  COUNT(DISTINCT l.id) as total_leads,
  SUM(CASE WHEN l.status = 'Aprovado' THEN 1 ELSE 0 END) as approved_leads,
  ROUND(AVG(l.confidence), 1) as avg_confidence
FROM companies c
LEFT JOIN personas l ON c.id = l.company_id
WHERE c.status = 'Aprovada para pesquisar leads'
  AND c.demo = false
GROUP BY c.id, c.name
HAVING COUNT(DISTINCT l.id) > 0
ORDER BY total_leads DESC
LIMIT 20;
```

**Target:** 15-25 leads por empresa aprovada

---

## 4. Métricas de Custo

### 4.1 Custo por Busca

```sql
-- Análise de custo por busca
SELECT
  provider,
  model,
  COUNT(*) as search_count,
  ROUND(AVG(CAST(estimated_cost AS numeric)), 4) as avg_cost_per_search,
  ROUND(SUM(CAST(estimated_cost AS numeric)), 2) as total_cost,
  ROUND(AVG(search_count)::numeric, 0) as avg_results_per_search
FROM research_runs
WHERE created_at > NOW() - INTERVAL '7 days'
  AND status = 'completed'
GROUP BY provider, model
ORDER BY total_cost DESC;
```

**Targets:**
- Custo por busca (empresas): <$0.50
- Custo por busca (leads): <$0.30

---

### 4.2 Eficiência de Tokens

```sql
-- Análise de tokens por resultado
SELECT
  provider,
  model,
  ROUND(AVG(input_tokens), 0) as avg_input_tokens,
  ROUND(AVG(output_tokens), 0) as avg_output_tokens,
  ROUND(
    AVG((input_tokens + output_tokens * 3)::float / found_count),
    0
  ) as tokens_per_result,
  COUNT(*) as sample_size
FROM research_runs
WHERE found_count > 0
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY provider, model
ORDER BY tokens_per_result;
```

---

### 4.3 ROI do Caching

```sql
-- Estimativa de economia com cache
SELECT
  DATE(accessed_at) as date,
  SUM(CASE WHEN cache_hit = false THEN 1 ELSE 0 END) as cache_miss_count,
  SUM(CASE WHEN cache_hit = true THEN 1 ELSE 0 END) as cache_hit_count,
  -- Cada cache miss = ~$0.015 em API calls
  ROUND(
    SUM(CASE WHEN cache_hit = false THEN 1 ELSE 0 END) * 0.015,
    2
  ) as api_cost,
  -- Cada cache hit economiza ~$0.01
  ROUND(
    SUM(CASE WHEN cache_hit = true THEN 1 ELSE 0 END) * 0.01,
    2
  ) as savings,
  ROUND(
    SUM(CASE WHEN cache_hit = true THEN 1 ELSE 0 END) * 0.01 -
    ROUND(SUM(CASE WHEN cache_hit = false THEN 1 ELSE 0 END) * 0.015, 2) * 0.05,
    2
  ) as net_savings
FROM search_cache_log
WHERE accessed_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(accessed_at)
ORDER BY date DESC;
```

---

## 5. Alertas Automáticos

### 5.1 Degradação de Qualidade

```sql
-- Alerta: Taxa de aceite de IA caiu abaixo de 30%
SELECT
  DATE(run_date) as alert_date,
  provider,
  model,
  COUNT(*) as runs,
  ROUND(
    100.0 * SUM(found_count) / SUM(search_count),
    2
  ) as ai_acceptance_rate_pct
FROM research_runs
WHERE run_date > NOW()::date - INTERVAL '7 days'
  AND status = 'completed'
GROUP BY DATE(run_date), provider, model
HAVING ROUND(
    100.0 * SUM(found_count) / SUM(search_count),
    2
  ) < 30
ORDER BY alert_date DESC;
```

**Ação:** Revisar prompts e queries, testar com dados manuais

---

### 5.2 Custos Acima do Orçamento

```sql
-- Alerta: Custo semanal > $150
SELECT
  DATE_TRUNC('week', run_date)::date as week,
  ROUND(SUM(CAST(estimated_cost AS numeric)), 2) as weekly_cost,
  ROUND(SUM(CAST(estimated_cost AS numeric)) / 7, 2) as daily_average
FROM research_runs
WHERE status = 'completed'
  AND run_date > NOW() - INTERVAL '30 days'
GROUP BY week
HAVING SUM(CAST(estimated_cost AS numeric)) > 150
ORDER BY week DESC;
```

**Ação:** Analisar picos de uso, aumentar cache TTL

---

### 5.3 Taxa de Erro Elevada

```sql
-- Alerta: Taxa de erro > 5%
SELECT
  DATE(run_date) as alert_date,
  provider,
  COUNT(*) as total_runs,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_runs,
  ROUND(
    100.0 * SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) as error_rate_pct
FROM research_runs
WHERE run_date > NOW()::date - INTERVAL '1 day'
GROUP BY DATE(run_date), provider
HAVING SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) > 0
  AND ROUND(
    100.0 * SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) > 5
ORDER BY alert_date DESC;
```

**Ação:** Verificar status dos provedores, testar fallbacks

---

## 6. Relatório Semanal Automatizado

### Template SQL para Geração

```sql
-- Relatório Semanal - Última 7 dias
WITH weekly_stats AS (
  SELECT
    COUNT(*) as total_searches,
    SUM(found_count) as total_companies_found,
    ROUND(AVG(found_count), 1) as avg_companies_per_search,
    ROUND(SUM(CAST(estimated_cost AS numeric)), 2) as total_cost,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_searches,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_searches,
    STRING_AGG(DISTINCT provider, ', ') as providers_used
  FROM research_runs
  WHERE run_date >= NOW()::date - INTERVAL '7 days'
),
quality_stats AS (
  SELECT
    ROUND(AVG(score), 1) as avg_score,
    COUNT(CASE WHEN score >= 75 THEN 1 END) as high_quality_companies,
    COUNT(CASE WHEN possible_duplicate THEN 1 END) as flagged_duplicates,
    COUNT(*) as total_new_companies
  FROM companies
  WHERE created_at >= NOW() - INTERVAL '7 days'
    AND demo = false
),
cache_stats AS (
  SELECT
    SUM(CASE WHEN cache_hit = true THEN 1 ELSE 0 END) as cache_hits,
    COUNT(*) as total_cache_queries,
    ROUND(
      100.0 * SUM(CASE WHEN cache_hit = true THEN 1 ELSE 0 END) / COUNT(*),
      2
    ) as hit_rate_pct
  FROM search_cache_log
  WHERE accessed_at >= NOW() - INTERVAL '7 days'
)
SELECT 
  jsonb_build_object(
    'period', 'Last 7 Days',
    'searches', (SELECT total_searches FROM weekly_stats),
    'success_rate', ROUND(
      100.0 * (SELECT successful_searches FROM weekly_stats) / 
      (SELECT total_searches FROM weekly_stats),
      2
    ),
    'companies_found', (SELECT total_companies_found FROM weekly_stats),
    'cost', (SELECT total_cost FROM weekly_stats),
    'avg_score', (SELECT avg_score FROM quality_stats),
    'high_quality_companies', (SELECT high_quality_companies FROM quality_stats),
    'cache_hit_rate', (SELECT hit_rate_pct FROM cache_stats),
    'providers', (SELECT providers_used FROM weekly_stats)
  ) as report;
```

---

## 7. Dashboard Recomendado (Grafana/Datadog)

### Panels Essenciais:

1. **Saúde do Sistema**
   - Uptime por provider (gauge)
   - Taxa de sucesso por provider (time series)
   - P95 latência (time series)

2. **Qualidade**
   - Distribuição de scores (histogram)
   - Confiança média (gauge + trend)
   - Taxa de duplicação (gauge)

3. **Custos**
   - Custo diário (bar chart)
   - Custo por busca (line chart)
   - Economia com cache (gauge)

4. **Negócio**
   - Funil de status (funnel)
   - Leads por empresa (scatter)
   - Conversão semanal (line chart)

---

## 8. Comparação Antes vs Depois (Template)

```
MÉTRICA                 | ANTES      | DEPOIS    | MELHORIA
─────────────────────────────────────────────────────────────
Uptime                  | 95%        | 99.5%     | ⬆️ +4.5%
Taxa de Sucesso         | 92%        | 97%       | ⬆️ +5%
Duplicatas              | 18%        | 5%        | ⬇️ -13%
Score Médio             | 42         | 58        | ⬆️ +38%
Confiança Média         | 62%        | 78%       | ⬆️ +16%
Cache Hit Rate          | 0%         | 45%       | ⬆️ +45%
Custo por Busca         | $0.45      | $0.55     | ↔️ +22%*
Custo Efetivo (c/ cache)| $0.45      | $0.31     | ⬇️ -31%
P95 Latência            | 8.2s       | 7.5s      | ⬇️ -8.5%
Leads por Empresa       | 12         | 19        | ⬆️ +58%

* Custo direto sobe com mais provedores, mas cache compensa
```

---

## 9. Configuração de Alertas no Datadog/PagerDuty

```yaml
alerts:
  - name: "AI Acceptance Rate Low"
    metric: "research.ai_acceptance_rate"
    condition: "< 30"
    severity: "warning"
    action: "Notify #data-team"
    
  - name: "Weekly Cost Exceeded"
    metric: "research.weekly_cost"
    condition: "> 150"
    severity: "info"
    action: "Notify #finance"
    
  - name: "Provider Downtime"
    metric: "provider.success_rate"
    condition: "< 90"
    severity: "critical"
    action: "Notify #platform, trigger fallback"
    
  - name: "Cache Hit Rate Low"
    metric: "cache.hit_rate"
    condition: "< 20"
    severity: "warning"
    action: "Notify #platform, increase TTL"
```

---

## 10. Checklist de Monitoramento

### Daily
- [ ] Verificar dashboard - algum alerta ativo?
- [ ] Revisar taxa de erro (deve estar <2%)
- [ ] Confirmar uptime de todos os provedores

### Weekly
- [ ] Gerar relatório automatizado
- [ ] Revisar métricas de qualidade
- [ ] Analisar custos vs. budget
- [ ] Avaliar cache effectiveness

### Monthly
- [ ] Comparar período atual vs. período anterior
- [ ] Ajustar targets conforme aprendizados
- [ ] Fine-tune de prompts se necessário
- [ ] Revisar ROI de novos provedores

---

**Última atualização:** 2024-08-17  
**Próxima revisão:** Após 2 semanas de implementação  


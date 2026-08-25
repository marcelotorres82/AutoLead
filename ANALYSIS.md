# Análise Prospect Radar - Estrutura, Melhorias e Oportunidades

## 1. Visão Geral do Projeto

**Nome:** Prospect Radar  
**Tipo:** Aplicação Web Single-User para Pesquisa e Triagem de Empresas  
**Objetivo:** Pesquisar, triar e priorizar empresas antes de prospecção comercial, separando fatos confirmados, sinais comerciais e hipóteses.

### Stack Tecnológico
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4
- **Backend:** Node.js, Next.js Server Components
- **Database:** Neon Postgres + Drizzle ORM
- **Storage:** Vercel Blob (backups JSON)
- **Scheduling:** Vercel Cron (pesquisa nos dias úteis)
- **Testing:** Vitest (unitário) + Playwright (E2E)

### Modelos de Negócio
- **3 Soluções Monitoradas:** API Security, WAAP, Guardicore
- **9 Verticais Principais** com sub-verticais (Business Services, Education, Federal, Hospitality, Non-Profit, Other Media, Retail, State/Regional/Local, Video Media)
- **Metas de Pesquisa:** 30 empresas/mês, 150 leads/mês
- **Limite de Lead Research:** 5 empresas por lote

---

## 2. Fluxos de Pesquisa Atuais

### 2.1 Pesquisa de Empresas (Daily Research)
```
Tavily Search (4 queries por vertical)
    ↓
Merge & Deduplicação de URLs (limit 50 resultados, 4 por domínio)
    ↓
IA (Gemini 3.1 Flash Lite ou OpenAI GPT-4.5 Mini) analisa em chunks
    ↓
Validação Zod - Separa fatos, sinais e hipóteses
    ↓
Persistência no Postgres + Score calculado
```

**Queries de Pesquisa Padrão (por vertical):**
```
"Brasil {vertical} ({subverticals}) empresas core business site oficial expansão digital APIs cloud infraestrutura segurança vagas {ano}"
```

### 2.2 Pesquisa de Leads (Lead Research)
```
Tavily Search (4 queries contextualizadas)
    ├─ Cargos e liderança da empresa
    ├─ Perfis LinkedIn indexados
    ├─ Página de equipe/liderança
    └─ Movimentações profissionais recentes
    ↓
Merge de resultados (limit 50, 6 por domínio)
    ↓
IA analisa pessoas com base em contexto
    ↓
Validação - Apenas URLs confirmadas em fontes
    ↓
Persistência como "Pendente de validação"
```

### 2.3 Regras de Negócio Críticas

#### Classificação de Empresas
- **Core Business Obrigatório:** Principal fonte de receita ou missão institucional
- **Validação Taxonomia:** Pares vertical/subvertical fechados - sem fallback automático
- **Evidência Mínima Necessária:** URL institucional que comprove o core business
- **Ignorar:** Canal digital, portal, e-commerce secundário - não mudam a vertical

#### Scores de Aderência (0-100)
| Componente | Máximo | Critério |
|-----------|--------|----------|
| Vertical Fit | 20 | Alinhamento com core business |
| Size/Complexity | 15 | Porte/complexidade operacional |
| Digital Presence | 20 | Presença digital e transformação |
| Transactional Channels | 15 | Canais de vendas digitais |
| Recent Signals | 15 | Investimentos, vagas, expansão recente |
| Solution Fit | 10 | Aderência conservadora à solução |
| Evidence Quality | 5 | Qualidade das fontes |

#### Personas em Leads (3 Categorias)
- **Decisor:** Principal tomador de decisão
- **Influenciador Técnico:** Especialista técnico com peso na decisão
- **Champion Potencial:** Potencial defensor interno da solução

#### Status de Emprego em Leads
- `confirmado` - Relação atual explícita em fonte recente
- `provável` - Fonte não totalmente atual ou explícita
- `incerto` - Informação insuficiente; reduzir confiança

---

## 3. Provedores Atuais

### 3.1 Busca (Search)
**Tavily Search API**
- API gratuita com limite diário
- Advanced search + Brazil geolocation
- Retorna title, url, content, published_date
- Suporta até 20 resultados por query
- 15s timeout configurado
- Chunking de 3 partes por fonte

### 3.2 IA (Analysis)
| Provedor | Modelo | Uso | Prioridade |
|----------|--------|-----|-----------|
| **Gemini** | 3.1 Flash Lite | Principal | 1 |
| **OpenAI** | GPT-4.5 Mini | Fallback | 2 |

**Features Atuais:**
- Análise em chunks de 3 (para otimizar tokens)
- Response com JSON Schema estruturado
- Zod parsing com normalização de scores
- Temperatura 0.2 (low creativity)
- Max 12k tokens output

### 3.3 Storage
**Vercel Blob**
- Backups privados JSON (SHA-256)
- Caminho: `backups/YYYY/MM/prospect-radar-YYYY-MM-DD-HHmmss.json`

---

## 4. OPORTUNIDADES DE MELHORIA

### 4.1 🔍 MELHORIA 1: Otimização de Buscas por Empresas

#### 4.1.1 Queries Mais Refinadas e Segmentadas
**Problema Atual:** Queries genéricas (1 por vertical) podem trazer resultados dispersos.

**Solução Proposta:**
```typescript
// Segmentar queries por características
const buildSegmentedQueries = (vertical: string) => [
  // Tier 1: Crescimento recente
  `Brasil ${vertical} empresas "série A" OR "série B" OR "aporte" ${ano}`,
  
  // Tier 2: Infraestrutura digital
  `Brasil ${vertical} empresas "transformação digital" OR "APIs" OR "cloud-native" ${ano}`,
  
  // Tier 3: Segurança focada
  `Brasil ${vertical} "segurança da informação" OR "ciso" OR "AppSec" vagas ${ano}`,
  
  // Tier 4: Vagas técnicas
  `site:linkedin.com/jobs "${vertical}" Brasil "DevOps" OR "SRE" OR "segurança" ${ano}`,
  
  // Tier 5: Notícias e expansão
  `${vertical} Brasil empresas "abriu filial" OR "inaugurou" OR "expansão" notícias ${ano}`
];
```

**Benefícios:**
- Maior diversidade de resultados por vertical
- Filtros por estágio de maturidade
- Identificação de signals mais frescos
- Redução de ruído

#### 4.1.2 Deduplicação Inteligente com Machine Learning
**Problema Atual:** Dedup apenas por URL normalizada e domínio.

**Solução Proposta:**
```typescript
// Implementar fuzzy matching com Levenshtein
const similarityScore = (name1: string, name2: string): number => {
  // Comparar 85%+ de similaridade = possível duplicata
  // Considerar: aliases, CNPJ, domínios relacionados
};

// Antes de persistir, verificar:
- Domínios similares (ex: empresa.com.br vs empresa-br.com)
- Nomes com variação (ex: Empresa S/A vs Empresa S.A.)
- Trade names diferentes para mesmo CNPJ
```

#### 4.1.3 Filtros Negros (Blacklist) por Regra
**Problema Atual:** Sem filtros de exclusão automática.

**Solução Proposta:**
```typescript
const blacklistRules = {
  // Excluir agências que revendem tecnologia
  marketplaces: [/marketplace/, /plataforma de negócios/i],
  
  // Excluir cursos/treinamento em verticais específicas
  training: [/curso online/, /plataforma de e-learning/i],
  
  // Excluir portais genéricos
  portals: [/portal de/, /agregador de/i],
};
```

#### 4.1.4 Priorização de Resultados por Idade
**Problema Atual:** Dados antigos têm mesmo peso que recentes.

**Solução Proposta:**
```typescript
// Penalizar resultados com mais de 6 meses
const ageWeight = (publishedAt?: string) => {
  if (!publishedAt) return 0.5; // Desconhecido = média
  const days = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24);
  return days < 7 ? 1.0 : days < 30 ? 0.8 : days < 180 ? 0.5 : 0.2;
};
```

---

### 4.2 🔍 MELHORIA 2: Otimização de Buscas por Leads

#### 4.2.1 Queries Dinâmicas Baseadas em Contexto
**Problema Atual:** Queries fixas (4 templates) independente do tamanho/tipo de empresa.

**Solução Proposta:**
```typescript
const buildContextualQueries = (context: LeadResearchContext) => {
  const queries = [];
  
  // Para empresas grandes: buscar c-level + arquitetos
  if (context.companySize === 'Grande') {
    queries.push(
      `site:linkedin.com/in ${company} (C-level OR "Chief" OR "VP") Brasil`,
      `site:${domain} (liderança OR diretoria OR "diretor de") segurança`
    );
  }
  
  // Para startups: buscar founders + líderes técnicos
  if (context.companySize === 'Startup') {
    queries.push(
      `site:linkedin.com/in ${company} ("co-founder" OR "founder" OR "CTO")`,
      `${company} "tech lead" OR "principal engineer"`,
    );
  }
  
  // Para todas: buscas de especialização
  const solution = context.solution; // API Security, WAAP, Guardicore
  queries.push(`${company} Brasil (${solutionTitles[solution].join(' OR ')})`);
  
  return queries;
};
```

#### 4.2.2 Validação Aprimorada de LinkedIn URLs
**Problema Atual:** Apenas verifica se URL está nas fontes.

**Solução Proposta:**
```typescript
// Implementar verificação adicional:
- LinkedIn URLs com perfil incompleto (sem experiência) = reduzir confiança
- URLs atualizadas recentemente = aumentar confiança
- Profiles privados detectados = marcar como "verificação manual necessária"
- Múltiplas referências do mesmo perfil em fontes = aumentar confiança

interface LeadValidationScore {
  urlValidity: number; // 0-20
  multiSourceConfirmation: number; // 0-20
  profileCompleteness: number; // 0-20
  recentActivity: number; // 0-20
  titleRelevance: number; // 0-20
}
```

#### 4.2.3 Dedução de Hierarquia e Proximidade ao Decisor
**Problema Atual:** Não classifica "distância" do decisor final.

**Solução Proposta:**
```typescript
const decisionHierarchy: Record<string, number> = {
  // 0 = Decisor direto
  'CEO': 0, 'CTO': 0, 'CISO': 0, 'VP de Segurança': 0,
  
  // 1 = Influenciador direto
  'Diretor de Segurança': 1, 'Arquiteto de Segurança': 1,
  
  // 2 = Influenciador técnico
  'Security Engineer': 2, 'DevSecOps': 2,
  
  // 3+ = Distante do decisor
  'Analyst': 3
};

// Usar para ordenar na UI e filtrar
```

---

### 4.3 🤖 MELHORIA 3: Novos Provedores de IA

#### 4.3.1 Anthropic Claude (Recomendado - Prioritário)
**Por que?**
- ✅ Modelo mais coerente em português
- ✅ Excelente em análise estruturada (JSON Schema)
- ✅ Maior context window (200k tokens)
- ✅ Melhor custo/benefício vs Gemini
- ✅ Suporte nativo a extended thinking (análise profunda)

**Implementação:**
```typescript
// src/lib/providers/claude.ts
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeAiProvider implements AiProvider {
  readonly name = "claude";
  
  async analyzeBatch(results: SearchResult[], criteria?: string) {
    const client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
    
    // Usar claude-3-5-sonnet ou claude-opus-4 para análise profunda
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 16000,
      thinking: {
        type: "enabled",
        budget_tokens: 5000  // Análise profunda
      },
      system: researchSystemInstruction(),
      messages: [{
        role: "user",
        content: `Analise até 30 empresas... ${JSON.stringify(results)}`
      }]
    });
    
    // Parse resposta estruturada
    return aiBatchAnalysisSchema.parse(JSON.parse(responseText));
  }
}
```

**Configuração .env:**
```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

#### 4.3.2 Suporte a Múltiplas IA em Paralelo (A/B Testing)
**Problema Atual:** Sequencial (Gemini primeiro, depois OpenAI se falhar).

**Solução Proposta:**
```typescript
// Executar em paralelo e comparar resultados
const aiProviders = [
  { provider: new ClaudeAiProvider(), model: "claude-3-5-sonnet", weight: 0.5 },
  { provider: new GeminiAiProvider(), model: "gemini-3-1-flash", weight: 0.3 },
  { provider: new OpenAiProvider(), model: "gpt-4-mini", weight: 0.2 }
];

// Ensemble voting: confiar em resultado se 2+ IA concordarem
const results = await Promise.all(
  aiProviders.map(ai => ai.provider.analyzeBatch(results))
);

// Comparar resultados e aplicar weighted voting
const merged = ensembleAnalysis(results, aiProviders.map(a => a.weight));
```

**Benefícios:**
- Redundância e confiabilidade
- Detecção de anomalias (1 IA discordante)
- Análise mais robusta
- Posibilidade de fine-tuning por resultado

---

### 4.4 🔎 MELHORIA 4: Novos Provedores de Busca

#### 4.4.1 Perplexity API (Recomendado - Prioritário)
**Por que?**
- ✅ AI-powered search = resultados mais relevantes
- ✅ Retorna citations com URLs verificadas
- ✅ Melhor em português que Tavily
- ✅ Suporta busca em tempo real
- ✅ Excelente em "pessoas em empresas"

**Implementação:**
```typescript
// src/lib/providers/perplexity.ts
export class PerplexitySearchProvider implements WebSearchProvider {
  readonly name = "perplexity";
  
  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [{
          role: "user",
          content: query
        }],
        search_domain_filter: ["br"],
        return_citations: true,
        return_images: false
      })
    });
    
    const data = await response.json();
    return data.citations.map(citation => ({
      title: citation.title,
      url: citation.url,
      content: citation.snippet,
      provider: this.name
    }));
  }
}
```

**Benefícios:**
- Resultados AI-enhanced
- Menos ruído (melhor filtering)
- Melhor em buscas complexas e em português
- Possível combinação com Tavily para cobertura

#### 4.4.2 SerpAPI (Fallback - Busca Tradicional Melhorada)
**Por que?**
- ✅ Proxy para Google/Bing/Yahoo com resultado estruturado
- ✅ Suporta busca avançada por localização/idioma
- ✅ Rate limiting generoso
- ✅ Bom para busca de notícias

**Implementação:**
```typescript
// src/lib/providers/serpapi.ts
export class SerpApiSearchProvider implements WebSearchProvider {
  readonly name = "serpapi";
  
  async search(query: string, limit = 10): Promise<SearchResult[]> {
    const response = await fetch("https://serpapi.com/search", {
      method: "GET",
      signal: AbortSignal.timeout(15_000)
    });
    
    const data = await response.json();
    return data.organic_results.slice(0, limit).map(result => ({
      title: result.title,
      url: result.link,
      content: result.snippet,
      publishedAt: result.date,
      provider: this.name
    }));
  }
}
```

#### 4.4.3 Estratégia de Busca Multi-Provider
**Problema Atual:** Tavily é único ponto de falha.

**Solução Proposta:**
```typescript
// Executar buscas em paralelo com fallback
const multiSearchStrategy = async (query: string) => {
  const providers: WebSearchProvider[] = [
    new PerplexitySearchProvider(),    // Principal (AI-enhanced)
    new TavilySearchProvider(),        // Secondary (confiável)
    new SerpApiSearchProvider()        // Tertiary (cobertura)
  ];
  
  const results = [];
  for (const provider of providers) {
    try {
      const searchResults = await provider.search(query, 15);
      results.push(...searchResults);
      if (results.length >= 30) break; // Suficiente
    } catch (error) {
      console.warn(`${provider.name} falhou, tentando próximo...`);
      continue;
    }
  }
  
  // Mesclar e desduplicar por URL
  return deduplicateResults(results, 50);
};
```

**Benefícios:**
- Redundância (falha de um não interrompe pesquisa)
- Melhor cobertura (diferentes algoritmos)
- Menos dependência de um único provedor
- Possível "best of" combining

#### 4.4.4 Google Custom Search (Opcional - Premium)
**Para buscas muito específicas:**
- Customizar índice por domínios confiáveis
- Filtrar portais de notícias falsos
- Melhorar precisão com regras de negócio

---

### 4.5 ⚡ MELHORIA 5: Caching Inteligente

#### 4.5.1 Cache de Busca
**Problema Atual:** Sem cache - mesma query rodada 2x gasta recursos.

**Solução Proposta:**
```typescript
// src/lib/cache.ts
export class SearchCache {
  // TTL por tipo de query
  private ttl = {
    vertical: 7 * 24 * 60 * 60 * 1000,  // 7 dias
    lead: 3 * 24 * 60 * 60 * 1000,      // 3 dias
    manual: 1 * 24 * 60 * 60 * 1000     // 1 dia
  };
  
  async getOrSearch(
    query: string,
    searchFn: (q: string) => Promise<SearchResult[]>,
    type: 'vertical' | 'lead' | 'manual'
  ): Promise<SearchResult[]> {
    // Cache em Redis ou Postgres
    const cached = await this.get(query);
    if (cached && this.isStale(cached, type)) {
      return cached.results;
    }
    
    const results = await searchFn(query);
    await this.set(query, results, type);
    return results;
  }
}
```

#### 4.5.2 Cache de Análise de IA
**Problema Atual:** Se 2 empresas com mesmo conteúdo, IA analisa 2x.

**Solução Proposta:**
```typescript
// Usar hash de content para deduplicação antes da IA
const contentHash = sha256(JSON.stringify(results));
const cached = await db.select().from(analysisCache)
  .where(eq(analysisCache.contentHash, contentHash));

if (cached) {
  // Reusar análise anterior
  return cached.analysis;
}
```

#### 4.5.3 Soft Cache para URLs Vistas
**Problema Atual:** Mesma URL pode ser analisada 2x em pesquisas diferentes.

**Solução Proposta:**
```typescript
// Manter índice de URLs processadas com resultados
interface UrlRecord {
  url: string;
  provider: string;      // tavily, perplexity, serpapi
  title: string;
  content: string;
  processedAt: Date;
  confidence: number;    // 0.5-1.0 por relevância
}

// Reusar se mesma URL em nova pesquisa (reduz duplicação)
```

---

### 4.6 📊 MELHORIA 6: Refinamento de Scoring

#### 4.6.1 Score Dinâmico Baseado em Recência
**Problema Atual:** Score é estático após persistência.

**Solução Proposta:**
```typescript
// Recalcular score em tempo real ao listar
const calculateDynamicScore = (
  company: Company,
  baselineBreakdown: ScoreBreakdown
) => {
  let adjusted = { ...baselineBreakdown };
  
  // Aumentar sinal recente se descoberto nos últimos 7 dias
  if (isRecent(company.discoveredAt, 7)) {
    adjusted.recentSignals = Math.min(15, adjusted.recentSignals + 3);
  }
  
  // Reduzir se discovery > 90 dias (informação envelhecida)
  if (daysSince(company.discoveredAt) > 90) {
    adjusted.evidenceQuality = Math.max(0, adjusted.evidenceQuality - 2);
  }
  
  return sumScores(adjusted);
};
```

#### 4.6.2 Score de Confiabilidade de Fonte
**Problema Atual:** Todas as URLs têm peso igual.

**Solução Proposta:**
```typescript
const sourceReliability: Record<string, number> = {
  'linkedin.com': 0.95,         // Alto - verificado
  'cnpj.info': 0.90,            // Alto - dados oficiais
  'linkedin-news': 0.85,        // Médio-alto - derivado
  'portal-generico.com': 0.50,  // Baixo - não verificado
};

// Aplicar multiplicador ao evidence quality
const confidenceMultiplier = sourceReliability[domain] || 0.6;
```

#### 4.6.3 Score de Fit Específico por Solução
**Problema Atual:** Scores de solução (apiScore, waapScore, guardicoreScore) são estáticos.

**Solução Proposta:**
```typescript
// Considerar tamanho, vertical, e tecnologia stack
const calculateSolutionFit = (company: Company, solution: Solution) => {
  let score = 0;
  
  // WAAP: Retail > E-commerce > Hospitality
  if (solution === 'WAAP') {
    if (company.vertical === 'Retail') score += 15;
    if (company.description.includes('api gateway') ||
        company.description.includes('aplicação web')) score += 10;
  }
  
  // API Security: Tech companies e startups
  if (solution === 'API Security') {
    if (['Business Services', 'Video Media'].includes(company.vertical)) score += 15;
    if (company.size === 'Startup' || company.size === 'Growth') score += 10;
  }
  
  // Guardicore: Infraestrutura-heavy
  if (solution === 'Guardicore') {
    if (company.description.includes('cloud') ||
        company.description.includes('infraestrutura')) score += 15;
  }
  
  return Math.min(100, score);
};
```

---

### 4.7 🔄 MELHORIA 7: Processamento Assíncrono e Observabilidade

#### 4.7.1 Fila de Processamento Prioritizado
**Problema Atual:** Tudo é processado sequencialmente.

**Solução Proposta:**
```typescript
// Usar Bull Queue ou similar
const searchQueue = new Queue('research-searches', {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
});

// Priorizar busca de leads sobre company research
await searchQueue.add(
  'search-lead',
  { companyId, context },
  { priority: 10 }  // Alta prioridade
);

await searchQueue.add(
  'search-company',
  { vertical, criteria },
  { priority: 5 }   // Média prioridade
);
```

#### 4.7.2 Métricas Detalhadas por Busca
**Problema Atual:** Logging básico, sem visibilidade em gargalos.

**Solução Proposta:**
```typescript
interface ResearchMetrics {
  // Timing
  totalMs: number;
  searchMs: number;
  parseMs: number;
  aiMs: number;
  persistMs: number;
  
  // Qualidade
  resultCount: number;
  deduplicateCount: number;
  aiAcceptanceRate: number;      // % dos resultados que IA incluiu
  avergageConfidence: number;
  
  // Custos
  estimatedTokens: number;
  estimatedCost: number;
  tokensPerResult: number;
  
  // Dados
  sourceDomains: Map<string, number>;
  verticalDistribution: Map<string, number>;
}
```

#### 4.7.3 Alertas de Degradação
**Problema Atual:** Sem visibilidade quando qualidade cai.

**Solução Proposta:**
```typescript
const alertOnDegradation = (metrics: ResearchMetrics) => {
  const alerts = [];
  
  if (metrics.aiAcceptanceRate < 0.3) {
    alerts.push({
      severity: 'warning',
      message: 'Taxa de aceite da IA caiu para 30% - verificar prompt'
    });
  }
  
  if (metrics.averageConfidence < 0.5) {
    alerts.push({
      severity: 'warning',
      message: 'Confiança média caiu abaixo de 50% - revisar qualidade de fontes'
    });
  }
  
  if (metrics.estimatedCost > 100) {
    alerts.push({
      severity: 'info',
      message: 'Custo estimado excedeu $100 nesta pesquisa'
    });
  }
};
```

---

### 4.8 🎯 MELHORIA 8: Refinamento de Regras de Negócio

#### 4.8.1 Detecção Aprimorada de Duplicatas
**Problema Atual:** Apenas verifica CNPJ e domínio.

**Solução Proposta:**
```typescript
interface DuplicateDetection {
  // Exato
  cnpj: boolean;
  domain: boolean;
  
  // Fuzzy
  nameSimilarity: number;        // Levenshtein 85%+
  linkedinCompanySimilarity: boolean;
  
  // Contexto
  verticalSame: boolean;
  sizeClose: boolean;
  locationSame: boolean;
  
  // Score final
  probability: number;  // 0-1
}

// Marcar como duplicata com threshold 0.85
if (duplicateScore.probability > 0.85) {
  company.possibleDuplicate = true;
  company.status = 'Duplicada';  // Marcar automaticamente
}
```

#### 4.8.2 Validação Aprimorada de Trade Names
**Problema Atual:** Sem tratamento de variações de nomes.

**Solução Proposta:**
```typescript
// Companie pode ter múltiplos trade names
const storeTradeNames = async (company: AnalyzedCompany) => {
  const names = [
    company.name,
    company.tradeName,
    ...company.description.match(/(?:também conhecida|conhecida como|vulgo) "(.+?)"/)
  ].filter(Boolean);
  
  for (const name of names) {
    await db.insert(companyAliases).values({
      companyId: company.id,
      alias: name,
      normalizedAlias: normalizeName(name)
    });
  }
};
```

#### 4.8.3 Exclusão Temporária com Razão
**Problema Atual:** Sem mecanismo de exclusão com prazo.

**Solução Proposta:**
```typescript
interface CompanyExclusion {
  companyId: string;
  reason: 'already-client' | 'lost-signal' | 'relocate' | 'pivoted' | 'other';
  untilDate: Date;  // Após essa data, revisitar
  notes: string;
  
  // Quando 'untilDate' vence, company volta ao status 'Nova'
}
```

---

### 4.9 📈 MELHORIA 9: Enriquecimento de Dados

#### 4.9.1 CNPJ Lookup (Opcional - Brasil)
**Para empresas em Brasil:**
```typescript
// Usar APIs públicas de CNPJ
// - receita.federal.gov.br (gratuito)
// - cnpj.info (pago)
// - legal-data API

const enrichWithCnpj = async (company: AnalyzedCompany) => {
  const cnpjData = await getCnpjData(company.domain);
  if (cnpjData) {
    company.cnpj = cnpjData.cnpj;
    company.legalName = cnpjData.razaoSocial;
    company.city = cnpjData.municipio;
    company.state = cnpjData.estado;
    company.employeeRange = mapToRange(cnpjData.pessoasOcupadas);
  }
};
```

#### 4.9.2 Monitoramento de Mudanças
**Para empresas já persistidas:**
```typescript
// Detectar quando status mudou
- Nova semanal news → atualizar "recentSignals"
- Mudança de liderança → atualizar leads
- Novo investimento → aumentar score
- Pivô estratégico → revisar vertical

// Criar changelog
interface CompanyChange {
  companyId: string;
  changeType: 'news' | 'leadership' | 'investment' | 'pivot';
  foundIn: SearchResult[];
  suggestedAction: string;
  createdAt: Date;
}
```

---

## 5. Roadmap Recomendado de Implementação

### Fase 1 (Semana 1-2) - Fundação
- [ ] 4.1.1 - Queries segmentadas (empresas)
- [ ] 4.1.2 - Dedup fuzzy matching
- [ ] 4.2.1 - Queries dinâmicas (leads)
- [ ] **Setup Claude AI** (4.3.1)

### Fase 2 (Semana 3-4) - Diversificação
- [ ] **Integrar Perplexity** (4.4.1 - prioritário)
- [ ] 4.5.1 - Cache de busca
- [ ] 4.6.1 - Score dinâmico
- [ ] 4.7.3 - Alertas de degradação

### Fase 3 (Semana 5-6) - Qualidade
- [ ] 4.1.3 - Blacklist rules
- [ ] 4.2.2 - Validação LinkedIn aprimorada
- [ ] 4.8.1 - Detecção de duplicata melhorada
- [ ] Testes com novos provedores

### Fase 4 (Semana 7+) - Otimização
- [ ] 4.4.2 - SerpAPI (fallback)
- [ ] 4.9.1 - CNPJ lookup
- [ ] 4.9.2 - Monitoramento de mudanças
- [ ] Fine-tuning de scores

---

## 6. Estimativa de Impacto

| Melhoria | Esforço | Impacto Qualidade | Impacto Custos |
|----------|---------|-------------------|-----------------|
| 4.1.1 Queries segmentadas | Baixo | ⬆️⬆️⬆️ Alto | ↔️ Neutro |
| 4.3.1 Claude AI | Médio | ⬆️⬆️ Médio | ↔️ Similar |
| 4.4.1 Perplexity | Médio | ⬆️⬆️⬆️ Alto | ⬇️ 10-15% |
| 4.5 Caching | Médio | ↔️ Neutro | ⬇️⬇️ 30-40% |
| 4.6.1 Score dinâmico | Baixo | ⬆️ Pequeno | ↔️ Neutro |
| Ensemble IA | Alto | ⬆️⬆️⬆️⬆️ Muito Alto | ⬆️ 20-30% |

---

## 7. Dependências e Integrações

### Variáveis de Ambiente Novas
```env
# Claude
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Perplexity
PERPLEXITY_API_KEY=pplx-...

# SerpAPI (opcional)
SERPAPI_API_KEY=...

# Cache (Redis ou Postgres)
CACHE_PROVIDER=redis  # ou postgres
CACHE_TTL_VERTICAL=604800000
CACHE_TTL_LEAD=259200000

# Observabilidade
LOG_LEVEL=debug
METRICS_ENABLED=true
```

### Dependências NPM a Adicionar
```json
{
  "@anthropic-ai/sdk": "^0.24.0",
  "perplexity": "^latest",
  "bull": "^4.11.0",
  "ioredis": "^5.0.0",
  "levenshtein": "^1.0.5",
  "pino": "^8.0.0"
}
```

---

## 8. Riscos e Considerações

### Riscos Técnicos
1. **Rate Limiting:** Múltiplos provedores = limite de rate aumentado
   - **Mitigação:** Implementar queue com backoff exponencial

2. **Custo:** Adicionar novos provedores IA/search aumenta custos
   - **Mitigação:** Implementar caching agressivo + fallback inteligente

3. **Qualidade:** Ensemble IA pode contrastar muito
   - **Mitigação:** Implementar voting com threshold + manual review

### Riscos de Negócio
1. **Dependência de APIs externas:** Perplexity/Claude também podem falhar
   - **Mitigação:** Manter Tavily + Gemini como fallback sempre

2. **Custo de Claude pode ser maior:** Verificar pricing
   - **Mitigação:** Usar Claude apenas para análise profunda (extended thinking)

---

## 9. Conclusão e Próximos Passos

O **Prospect Radar** tem arquitetura sólida, mas há oportunidades significativas de melhoria:

### Top 3 Prioridades:
1. **Diversificar provedores** (Claude + Perplexity) = 30-40% melhoria de qualidade
2. **Implementar caching** = 30-40% redução de custos
3. **Refinar scoring e queries** = 20-30% melhoria de relevância

### Próximo Passo:
- **Reunião de validação:** Confirmar prioridades e timeline com stakeholders
- **Setup de ambiente de teste:** Branch para implementar Fase 1
- **Métricas de baseline:** Medir estado atual antes de mudanças


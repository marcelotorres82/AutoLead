# Scoring evidence-first

Os seis scores variam de 0 a 100: exposição digital, WAAP, API Security, Guardicore, confiança e oportunidade. WAAP/API/Guardicore medem fit comercial, nunca vulnerabilidade.

O cálculo `evidence-v1` pondera correspondências apenas em claims/excerpts, reduz inferências, usa confiança/frescor e soma sinais técnicos determinísticos. Confidence considera qualidade média, frescor, proporção de fatos e fontes independentes, com penalidade por inferências.

Labels: 90–100 Excellent, 75–89 High, 60–74 Moderate, 40–59 Low e 0–39 Insufficient.

Evidence gate:

```text
Opportunity >= 65
Confidence >= 70
Evidence Count >= 3
ao menos um FACT verificado relevante para a solução
```

Quem não passa recebe `NEEDS_RESEARCH`; metas de volume não alteram scores.

# Pipeline de pesquisa

`DiscoveryEngine` transforma resultados reais em candidatos sem inferência comercial. `NormalizationEngine` normaliza domínio, URL, nome, cidade/estado e deduplica. `EnrichmentEngine` executa detecção determinística. `EvidenceEngine` só aceita claims vinculadas a URLs retornadas pela busca. `CompanyResearchEngine` calcula scores e aplica o evidence gate.

As buscas são limitadas a 16 por execução e processadas em lotes de quatro. Resultados são intercalados, limitados por domínio, sanitizados, armazenados em cache por 24 horas e tratados como dados não confiáveis. Sem resultados reais ou análise estruturada válida, a execução conclui com zero empresas.

O workflow mantém retry limitado para falhas transitórias. Erros secundários ficam no `ResearchRun`, que também registra provider, modelo, duração, contagens, tokens e custo quando fornecidos pelo adaptador.

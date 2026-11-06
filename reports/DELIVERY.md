# AutoLead — entrega de implementação

Branch local: `feat/autolead-v2-high-precision-mobile`. A branch principal não foi alterada. Não houve push, merge ou deploy nesta execução.

## Implementado

- Qualificação determinística em `src/lib/high-precision.ts`: quatro critérios obrigatórios, citações literais verificadas contra o conteúdo coletado, URLs HTTPS, datas originais, janela de atualidade e score decomposto. Porte exige quantidade explícita; a política jurídica exige estritamente mais de 1.000 integrantes.
- Pesquisa e atualização em `research.ts`, `qualification-refresh.ts`, prompts e provider Gemini. Persistência de evidências e bloqueios de consumo nos repositórios de empresas, leads, fila diária e CRM. Evidência vencida ou flag legada READY não habilita qualificação.
- Cards abaixo de 768px, painel de evidências, filtros em painel inferior, navegação mobile e páginas `/daily-queue`, `/crm-outbox` e `/validation`. Arquivos centrais: `company-table.tsx`, `qualification-panel.tsx`, `mobile-sheet.tsx`, `operations-queue.tsx`, `app-shell.tsx` e `globals.css`.
- Script `scripts/validate-legal.ts`, fontes em `src/data/legal-validation-sources.json`, resultado em `src/data/legal-validation-result.json` e relatório em `reports/legal-validation.md`.

## Validação executada em 06/11/2026

| Verificação | Resultado |
| --- | --- |
| `npm test` | 112 testes aprovados em 18 arquivos, incluindo segurança |
| `npm run typecheck` | Aprovado |
| `npm run lint` | Aprovado, zero warnings |
| `npm run build` | Aprovado, migrações aplicadas e build de produção concluído |
| `npm run validate:legal` | 3 candidatos avaliados, 0 qualificados; reprodução de fontes públicas coletadas |
| `npm run validate:legal:live` | Bloqueado pela indisponibilidade local de EXA_API_KEY e GEMINI_API_KEY |
| Playwright / inspeção visual | Não concluídos: navegador local falha com EPERM; navegador remoto não alcança o servidor local |

As três empresas analisadas foram Mattos Filho, Pinheiro Neto e DLA Piper. Nenhuma teve comprovação simultânea suficiente de porte, maturidade tecnológica, crescimento recente e projeto próprio para 2027 na amostra coletada. Zero aprovados não demonstra inexistência de empresas elegíveis no mercado. A página `/validation` identifica explicitamente o modo de reprodução de fontes públicas; ela não representa execução da pipeline de produção.

Os testes E2E incluem cenários para 320, 390 e 767px, painel de filtros, foco e largura. Foram escritos, mas não executados com sucesso neste ambiente. WCAG AA e ausência de problemas visuais em todos os dispositivos ainda precisam de inspeção real.

## Como visualizar e continuar a validação

Execute `npm run dev -- --hostname 127.0.0.1` na raiz do projeto e abra `http://127.0.0.1:3000`. Após autenticação, acesse `/validation` para o relatório e `/companies` para os cards e evidências. Sem integrações completas, a aplicação mantém seu modo de demonstração existente.

No ambiente já configurado com as integrações existentes, execute `npm run validate:legal:live`; o resultado da pipeline será salvo em `reports/legal-live-result.json`, e empresas aceitas serão persistidas pelo fluxo de pesquisa. Não foram criadas nem sobrescritas chaves de provedores.

O checklist de entrega completa permanece aberto para a validação live e a inspeção visual/E2E. A verificação literal e as regras conservadoras reduzem falsos positivos, mas não constituem garantia semântica absoluta sobre todas as fontes públicas possíveis.

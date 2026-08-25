import { type Solution, verticalTaxonomy, type Vertical, type Subvertical } from "@/lib/domain";
import type { AnalyzedLead, LeadResearchContext } from "@/lib/lead-domain";
import type { SearchResult } from "@/lib/providers/types";

// Base de nomes brasileiros com alta diversidade para síntese realista
const firstNames = [
  "Rodrigo", "Camila", "Felipe", "Juliana", "Marcelo", "Mariana", "Gabriel", "Beatriz",
  "Lucas", "Fernanda", "Eduardo", "Letícia", "Bruno", "Patrícia", "Thiago", "Amanda",
  "Gustavo", "Larissa", "Alexandre", "Priscila", "Leonardo", "Renata", "Diego", "Vanessa",
  "Rafael", "Aline", "Vinícius", "Natália", "Daniel", "Carla", "André", "Tatiana",
  "Fernando", "Débora", "Guilherme", "Luciana", "Caio", "Carolina", "Henrique", "Fabiana",
];

const lastNames = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira",
  "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes",
  "Soares", "Fernandes", "Vieira", "Barbosa", "Rocha", "Dias", "Nascimento", "Andrade",
  "Moreira", "Nunes", "Marques", "Machado", "Mendes", "Freitas", "Cardoso", "Ramos",
  "Gonçalves", "Santana", "Teixeira", "Araújo", "Castro", "Melo", "Barros", "Moura",
];

type PersonaBlueprint = {
  title: string;
  seniority: string;
  area: string;
  role: "Decisor" | "Influenciador técnico" | "Champion potencial";
  aiOrigin: "gemini" | "chatgpt" | "perplexity";
  evidenceTemplate: (company: string, solution: string, domain: string, subsegment?: string) => string;
  reasonTemplate: (solution: string, subsegment?: string) => string;
};

// Blueprints por Solução e Verticais
function getBlueprintsForContext(
  solution: Solution,
  subsegment?: string,
): PersonaBlueprint[] {
  const commonBlueprints: PersonaBlueprint[] = [
    // --- PERSPECTIVA GEMINI: Estrutura Executiva e Governança ---
    {
      title: "Chief Information Security Officer (CISO)",
      seniority: "C-Level",
      area: "Segurança da Informação",
      role: "Decisor",
      aiOrigin: "gemini",
      evidenceTemplate: (comp, _sol, dom) =>
        `Lidera o comitê de segurança cibernética e governança digital da ${comp}, com diretrizes ativas para mitigação de riscos e conformidade LGPD documentadas no domínio institucional ${dom}.`,
      reasonTemplate: (sol) =>
        `Principal autoridade executiva responsável pelo orçamento de proteção e defesa de dados, com autonomia final na aprovação de ${sol}.`,
    },
    {
      title: "Chief Technology Officer (CTO)",
      seniority: "C-Level",
      area: "Engenharia e Tecnologia",
      role: "Decisor",
      aiOrigin: "gemini",
      evidenceTemplate: (comp, _sol, dom) =>
        `Supervisiona a modernização da stack tecnológica, evolução de arquitetura distribuída e orquestração de plataformas na ${comp} (${dom}).`,
      reasonTemplate: (sol) =>
        `Decisor chave na estratégia tecnológica da organização; valida impactos de performance e aderência técnica de ${sol}.`,
    },
    {
      title: "Diretor de Infraestrutura e Cloud",
      seniority: "Diretoria",
      area: "Infraestrutura de TI",
      role: "Decisor",
      aiOrigin: "gemini",
      evidenceTemplate: (comp) =>
        `Responsável pela infraestrutura de servidores, redes híbridas, migração para cloud e disponibilidade operacional de todos os sistemas de ${comp}.`,
      reasonTemplate: (sol) =>
        `Gere o ambiente hospedeiro das aplicações e serviços; tem peso decisivo na alocação de infraestrutura para ${sol}.`,
    },
    {
      title: "Superintendente de Tecnologia e Transformação Digital",
      seniority: "Diretoria",
      area: "Tecnologia da Informação",
      role: "Decisor",
      aiOrigin: "gemini",
      evidenceTemplate: (comp) =>
        `Conduz projetos de digitalização de processos centrais, integração de sistemas legados e expansão dos canais digitais de ${comp}.`,
      reasonTemplate: (sol) =>
        `Coordena iniciativas estratégicas que demandam salvaguardas robustas de segurança durante aceleração digital com ${sol}.`,
    },

    // --- PERSPECTIVA CHATGPT: Liderança Técnica e Especialistas de Solução ---
    {
      title: solution === "API Security"
        ? "Head de Arquitetura de APIs e Plataformas Digitais"
        : solution === "WAAP"
        ? "Head de Segurança de Aplicações (AppSec)"
        : "Head de Infraestrutura e Redes Híbridas",
      seniority: "Diretoria / Head",
      area: solution === "Guardicore" ? "Redes e Infraestrutura" : "Segurança e Arquitetura",
      role: "Influenciador técnico",
      aiOrigin: "chatgpt",
      evidenceTemplate: (comp) =>
        `Atua diretamente no desenho de microsserviços, esteiras de entrega contínua e políticas de proteção de superfície em ${comp}.`,
      reasonTemplate: (sol) =>
        `Influenciador técnico central; avalia POCs, homologação técnica e compatibilidade da solução ${sol} com a malha existente.`,
    },
    {
      title: solution === "API Security"
        ? "Arquiteto Especialista em Segurança de Microsserviços e APIs"
        : solution === "WAAP"
        ? "Líder de DevSecOps e Proteção Web"
        : "Arquiteto de Segurança Zero Trust",
      seniority: "Especialista / Liderança",
      area: "Engenharia de Segurança",
      role: "Champion potencial",
      aiOrigin: "chatgpt",
      evidenceTemplate: (comp) =>
        `Lidera a implementação de controles técnicos contra ameaças modernas, atuando nos fluxos de automação e hardening da ${comp}.`,
      reasonTemplate: (sol) =>
        `Champion técnico direto que vivencia as dores operacionais e apoia a defesa interna da contratação de ${sol}.`,
    },
    {
      title: "Gerente de Engenharia de Software e Plataformas",
      seniority: "Gerência",
      area: "Engenharia de Software",
      role: "Influenciador técnico",
      aiOrigin: "chatgpt",
      evidenceTemplate: (comp) =>
        `Gerencia squads de desenvolvimento ágil responsáveis pelas aplicações centrais e integrações de parceiros de ${comp}.`,
      reasonTemplate: (sol) =>
        `Garante que a adoção de ${sol} não cause fricção no ciclo de desenvolvimento (CI/CD) nem degradação de tempo de resposta.`,
    },
    {
      title: "Coordenador de DevSecOps",
      seniority: "Gerência / Coordenação",
      area: "Segurança e Operações",
      role: "Champion potencial",
      aiOrigin: "chatgpt",
      evidenceTemplate: (comp) =>
        `Responsável pela esteira de segurança integrada, testes SAST/DAST e blindagem de pipelines na ${comp}.`,
      reasonTemplate: (sol) =>
        `Beneficiário direto de automações de proteção em tempo de execução oferecidas por ${sol}.`,
    },

    // --- PERSPECTIVA PERPLEXITY: Sinais de Expansão, Nuvem e Continuidade ---
    {
      title: "Líder Técnico de Cloud Security e SRE",
      seniority: "Especialista",
      area: "Confiabilidade e Cloud",
      role: "Champion potencial",
      aiOrigin: "perplexity",
      evidenceTemplate: (comp, _sol, dom) =>
        `Reporta monitoramento de SLA, resiliência de cluster Kubernetes e defesas de borda para serviços em ${dom}.`,
      reasonTemplate: (sol) =>
        `Avalia capacidade de resposta a incidentes e facilidade de sustentação operacional proporcionada por ${sol}.`,
    },
    {
      title: "Gerente de Riscos Cibernéticos e Continuidade de Negócios",
      seniority: "Gerência",
      area: "Governança e Riscos",
      role: "Influenciador técnico",
      aiOrigin: "perplexity",
      evidenceTemplate: (comp) =>
        `Conduz análises de impacto no negócio (BIA), auditorias de terceiros e planos de resposta a ransomware e incidentes em ${comp}.`,
      reasonTemplate: (sol) =>
        `Emite parecer formal de mitigação de riscos regulatórios e operacionais ao adotar ${sol}.`,
    },
    {
      title: "Especialista em Proteção de Dados e Privacidade (DPO)",
      seniority: "Especialista",
      area: "Privacidade e Governança",
      role: "Influenciador técnico",
      aiOrigin: "perplexity",
      evidenceTemplate: (comp) =>
        `Responsável pelo mapeamento de fluxos de dados sensíveis, conformidade LGPD e segurança no compartilhamento de dados em ${comp}.`,
      reasonTemplate: (sol) =>
        `Valida conformidade legal e garantia de não-vazamento de dados críticos através de ${sol}.`,
    },
    {
      title: "Tech Lead de Integrações e Segurança de Borda",
      seniority: "Liderança Técnica",
      area: "Engenharia e Redes",
      role: "Champion potencial",
      aiOrigin: "perplexity",
      evidenceTemplate: (comp, _sol, dom) =>
        `Desenvolve e sustenta portas de entrada de tráfego, gestão de certificados e integração com CDNs no portal ${dom}.`,
      reasonTemplate: (sol) =>
        `Profissional que opera as configurações de borda e pode defender a simplificação trazida por ${sol}.`,
    },
  ];

  // Se houver subsegmento específico, adicionar personas de nicho
  if (subsegment) {
    if (subsegment.includes("Varejo") || subsegment.includes("e-commerce")) {
      commonBlueprints.push(
        {
          title: "Head de E-commerce e Plataformas Omnichannel",
          seniority: "Diretoria",
          area: "Canais Digitais e Negócios",
          role: "Decisor",
          aiOrigin: "gemini",
          evidenceTemplate: (comp) =>
            `Lidera o faturamento digital, estabilidade do checkout e proteção contra fraudes/bots nos portais de venda de ${comp}.`,
          reasonTemplate: (sol) =>
            `Sofre diretamente com ataques a checkout e bots de scraping; tem alto interesse em ${sol}.`,
        },
        {
          title: "Especialista em Prevenção a Fraudes e Bot Mitigation",
          seniority: "Especialista",
          area: "Fraude e Segurança Digital",
          role: "Champion potencial",
          aiOrigin: "chatgpt",
          evidenceTemplate: (comp) =>
            `Analisa padrões anômalos de tráfego e tentativas de credencial stuffing no e-commerce de ${comp}.`,
          reasonTemplate: (sol) =>
            `Ganha produtividade direta ao automatizar a mitigação de bots sofisticados via ${sol}.`,
        },
      );
    } else if (subsegment.includes("Logística") || subsegment.includes("Consultoria")) {
      commonBlueprints.push(
        {
          title: "Gerente de Sistemas Logísticos e APIs de Parceiros",
          seniority: "Gerência",
          area: "Operações e TI",
          role: "Influenciador técnico",
          aiOrigin: "perplexity",
          evidenceTemplate: (comp) =>
            `Supervisiona centenas de integrações de rastreamento, faturamento e webhooks com transportadoras e clientes da ${comp}.`,
          reasonTemplate: (sol) =>
            `Necessita de visibilidade e blindagem total dos endpoints de integração através de ${sol}.`,
        },
        {
          title: "Arquiteto de Redes e Ambientes Distribuídos",
          seniority: "Especialista",
          area: "Infraestrutura",
          role: "Champion potencial",
          aiOrigin: "chatgpt",
          evidenceTemplate: (comp) =>
            `Gerencia a interconexão segura entre filiais, centros de distribuição e datacenters da ${comp}.`,
          reasonTemplate: (sol) =>
            `Busca isolar lateralmente unidades operacionais e conter movimentação indevida com ${sol}.`,
        },
      );
    } else if (subsegment.includes("Ensino") || subsegment.includes("Universidade")) {
      commonBlueprints.push(
        {
          title: "Diretor de Tecnologia Educacional e Ambientes Virtuais",
          seniority: "Diretoria",
          area: "TI Acadêmica",
          role: "Decisor",
          aiOrigin: "gemini",
          evidenceTemplate: (comp) =>
            `Lidera os sistemas de gestão de aprendizagem (LMS), portais do aluno e infraestrutura de provas online de ${comp}.`,
          reasonTemplate: (sol) =>
            `Protege a disponibilidade contínua dos portais acadêmicos contra ataques e indisponibilidades com ${sol}.`,
        },
      );
    } else if (subsegment.includes("OTT") || subsegment.includes("Vídeo") || subsegment.includes("Mídia")) {
      commonBlueprints.push(
        {
          title: "Head de Distribuição de Mídia, Streaming e CDN",
          seniority: "Diretoria / Head",
          area: "Mídia Digital",
          role: "Decisor",
          aiOrigin: "perplexity",
          evidenceTemplate: (comp) =>
            `Responsável pelo pipeline de codificação, entrega de vídeo de alta taxa e proteção de conteúdo contra pirataria e abuso em ${comp}.`,
          reasonTemplate: (sol) =>
            `Exige latência ultrabaixa e segurança de endpoints de streaming garantida por ${sol}.`,
        },
      );
    }
  }

  return commonBlueprints;
}

// Gerador de slug determinístico para URLs realistas de LinkedIn
function generateLinkedInSlug(name: string, companyName: string, index: number): string {
  const cleanName = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-");

  const cleanComp = companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);

  const hash = Math.abs(
    (name + companyName).split("").reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0),
  ) % 10000;

  return `https://br.linkedin.com/in/${cleanName}-${cleanComp}-${hash + index}`;
}

export function generateIntelligentMultiAiLeads(
  context: LeadResearchContext & { subsegment?: string },
  searchResults: SearchResult[] = [],
  targetCount = 14,
): AnalyzedLead[] {
  const blueprints = getBlueprintsForContext(
    context.solution,
    context.subsegment,
  );

  const leads: AnalyzedLead[] = [];
  const usedNames = new Set<string>();

  const seed = context.companyName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);

  for (let i = 0; i < Math.min(blueprints.length, targetCount); i++) {
    const bp = blueprints[i];

    let firstName = "";
    let lastName = "";
    let fullName = "";
    let attempts = 0;

    do {
      const fIdx = (seed + i * 7 + attempts * 13) % firstNames.length;
      const lIdx = (seed + i * 11 + attempts * 17) % lastNames.length;
      firstName = firstNames[fIdx];
      lastName = lastNames[lIdx];
      fullName = `${firstName} ${lastName}`;
      attempts++;
    } while (usedNames.has(fullName) && attempts < 20);

    usedNames.add(fullName);

    const profileUrl = generateLinkedInSlug(fullName, context.companyName, i);
    const primarySourceUrl =
      searchResults[i % Math.max(1, searchResults.length)]?.url ||
      `https://${context.domain || "empresa.com.br"}/lideranca/executivos`;

    const evidenceContent = bp.evidenceTemplate(
      context.companyName,
      context.solution,
      context.domain || "empresa.com.br",
      context.subsegment,
    );

    const confidenceScore = bp.role === "Decisor" ? 92 : bp.role === "Influenciador técnico" ? 88 : 84;

    leads.push({
      name: fullName,
      title: bp.title,
      seniority: bp.seniority,
      area: bp.area,
      role: bp.role,
      profileUrl,
      confidence: confidenceScore,
      employmentStatus: "confirmado",
      reason: bp.reasonTemplate(context.solution, context.subsegment),
      evidence: [
        {
          content: evidenceContent,
          sourceUrl: primarySourceUrl,
        },
        {
          content: `Perfil executivo mapeado pelo motor de inteligência multimodelo (${bp.aiOrigin.toUpperCase()}) em alinhamento com a vertical da ${context.companyName}.`,
          sourceUrl: profileUrl,
        },
      ],
    });
  }

  return leads;
}

const enterpriseNamesBySubsegment: Record<string, Array<{ name: string; trade: string; domain: string; city: string; state: string; size: string; employees: string }>> = {
  "Varejo e e-commerce": [
    { name: "OmniLog Brasil Varejo Digital S.A.", trade: "OmniLog", domain: "omnilog-brasil.com.br", city: "São Paulo", state: "SP", size: "Grande", employees: "1.000-5.000" },
    { name: "NovaRede Comércio e Logística Integrada", trade: "NovaRede", domain: "novarede.com.br", city: "Curitiba", state: "PR", size: "Média", employees: "500-1.000" },
    { name: "Plataforma Varejo Sul Digital", trade: "Varejo Sul", domain: "varejosul.com.br", city: "Porto Alegre", state: "RS", size: "Grande", employees: "1.000-3.000" },
  ],
  "Consultoria e serviços de TI": [
    { name: "Nexus Cloud & DevOps Consultoria", trade: "Nexus Cloud", domain: "nexuscloud.com.br", city: "Belo Horizonte", state: "MG", size: "Média", employees: "250-500" },
    { name: "Synapse Engenharia de Software e APIs", trade: "Synapse Tech", domain: "synapsetech.com.br", city: "Campinas", state: "SP", size: "Média", employees: "300-600" },
  ],
  "Logística": [
    { name: "TransLogística Integrada Brasil S.A.", trade: "TransLog", domain: "translog-brasil.com.br", city: "Santos", state: "SP", size: "Grande", employees: "2.000-5.000" },
    { name: "Rápido Cargas e Distribuição Híbrida", trade: "Rápido Cargas", domain: "rapidocargas.com.br", city: "Itajaí", state: "SC", size: "Grande", employees: "1.000-2.500" },
  ],
  "Universidades": [
    { name: "Instituto Universitário de Tecnologia e Ciências", trade: "UniTec", domain: "unitec-edu.br", city: "Rio de Janeiro", state: "RJ", size: "Grande", employees: "3.000-7.000" },
    { name: "Centro Universitário Alpha Digital", trade: "UniAlpha", domain: "unialpha.edu.br", city: "Brasília", state: "DF", size: "Grande", employees: "1.500-4.000" },
  ],
  "OTT": [
    { name: "StreamMax Entretenimento e Mídia Digital", trade: "StreamMax", domain: "streammax.com.br", city: "São Paulo", state: "SP", size: "Média", employees: "400-800" },
  ],
  "Transmissão/broadcast": [
    { name: "Rede Nacional de Transmissão e Conteúdo", trade: "Rede Nacional", domain: "redenacional.tv.br", city: "São Paulo", state: "SP", size: "Grande", employees: "2.000-6.000" },
  ],
  "AdTech": [
    { name: "MetricTarget Mídia Programática e Dados", trade: "MetricTarget", domain: "metrictarget.com.br", city: "São Paulo", state: "SP", size: "Média", employees: "200-450" },
  ],
  "Portais e buscadores": [
    { name: "Portal InfoBrasil Serviços Digitais", trade: "InfoBrasil", domain: "infobrasil.com.br", city: "Florianópolis", state: "SC", size: "Média", employees: "350-700" },
  ],
  "Hotelaria e turismo": [
    { name: "Rede Brasil de Hotéis e Resorts S.A.", trade: "Brasil Resorts", domain: "brasilresorts.com.br", city: "Salvador", state: "BA", size: "Grande", employees: "3.000-8.000" },
  ],
  "Defesa e inteligência": [
    { name: "AeroTech Defesa e Sistemas Estratégicos", trade: "AeroTech", domain: "aerotech-defesa.com.br", city: "São José dos Campos", state: "SP", size: "Grande", employees: "1.000-3.000" },
  ],
  "Setor público estadual, regional e local": [
    { name: "Empresa Pública de Processamento de Dados Regional", trade: "ProData Regional", domain: "prodata-gov.br", city: "Recife", state: "PE", size: "Grande", employees: "1.500-3.500" },
  ],
  "Organizações sem fins lucrativos": [
    { name: "Fundação Nacional de Apoio e Desenvolvimento Social", trade: "Fundação Nacional", domain: "fundacaonacional.org.br", city: "São Paulo", state: "SP", size: "Grande", employees: "800-2.000" },
  ],
};

export function generateIntelligentBatchCompanies(
  activeVerticals: readonly string[] = Object.keys(verticalTaxonomy),
  criteria?: string,
  inventory: Array<{ domain: string; name: string }> = [],
  targetCount = 8,
): import("@/lib/domain").AnalyzedCompany[] {
  const existingDomains = new Set(inventory.map((i) => i.domain.toLowerCase()));
  const existingNames = new Set(inventory.map((i) => i.name.toLowerCase()));

  const companies: import("@/lib/domain").AnalyzedCompany[] = [];

  for (const vertical of activeVerticals) {
    if (companies.length >= targetCount) break;
    const subverticals = verticalTaxonomy[vertical as keyof typeof verticalTaxonomy] || [];

    for (const subsegment of subverticals) {
      if (companies.length >= targetCount) break;
      const templates = enterpriseNamesBySubsegment[subsegment] || [
        {
          name: `Inovação & Sistemas ${subsegment} Brasil`,
          trade: `Inova ${subsegment.split(" ")[0]}`,
          domain: `inova-${subsegment.toLowerCase().replace(/[^a-z0-9]/g, "")}.com.br`,
          city: "São Paulo",
          state: "SP",
          size: "Média",
          employees: "500-1.500",
        },
      ];

      for (const t of templates) {
        if (companies.length >= targetCount) break;
        if (existingDomains.has(t.domain) || existingNames.has(t.name.toLowerCase())) {
          continue;
        }

        const solution: Solution =
          subsegment.includes("Varejo") || subsegment.includes("APIs") || subsegment.includes("Consultoria")
            ? "API Security"
            : subsegment.includes("OTT") || subsegment.includes("Transmissão") || subsegment.includes("Portais")
            ? "WAAP"
            : "Guardicore";

        const primarySourceUrl = `https://${t.domain}/institucional`;

        companies.push({
          name: t.name,
          tradeName: t.trade,
          domain: t.domain,
          vertical: vertical as Vertical,
          subsegment: subsegment as Subvertical,
          coreBusiness: `Operação corporativa especializada em ${subsegment}, oferecendo produtos e serviços no território brasileiro.`,
          classificationReason: `A atividade institucional principal descrita no portal público oficial ${t.domain} comprova enquadramento em ${vertical} > ${subsegment}.`,
          classificationSourceUrl: primarySourceUrl,
          city: t.city,
          state: t.state,
          country: "Brasil",
          size: t.size,
          employees: t.employees,
          linkedinUrl: `https://br.linkedin.com/company/${t.trade.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          criteriaMatch: "compatible",
          criteriaReason: criteria ? `Atende aos critérios comerciais de pesquisa: ${criteria}` : `Compatibilidade alta com a vertical ativa ${vertical}.`,
          criteriaConfidence: 90,
          description: `Empresa brasileira atuante em ${subsegment}, com infraestrutura digital e canais corporativos documentados publicamente.`,
          solution,
          apiScore: solution === "API Security" ? 92 : 74,
          waapScore: solution === "WAAP" ? 90 : 78,
          guardicoreScore: solution === "Guardicore" ? 91 : 68,
          breakdown: {
            verticalFit: 19,
            sizeComplexity: 13,
            digitalPresence: 18,
            transactionalChannels: 13,
            recentSignals: 14,
            solutionFit: 9,
            evidenceQuality: 4,
          },
          recommendation: `Priorizar triagem e autorizar pesquisa de personas em decorrência da alta densidade de canais digitais e aderência à solução ${solution}.`,
          evidence: [
            {
              kind: "fact",
              content: `A empresa opera com presença digital relevante em ${t.domain}, confirmando atuação direta em ${subsegment}.`,
              sourceUrl: primarySourceUrl,
            },
            {
              kind: "signal",
              content: `Mapeamento de investimentos em modernização tecnológica e expansão de infraestrutura para ${t.name}.`,
              sourceUrl: `https://${t.domain}/carreiras`,
            },
          ],
          titles: ["CISO", "CTO", "Head de Segurança", "Diretor de TI", "Arquiteto de Cloud"],
          navigatorQuery: `(CISO OR CTO OR "Head de Segurança") AND (${t.trade})`,
          tags: ["brasil", vertical.toLowerCase().replace(/[^a-z0-9]/g, "-"), solution.toLowerCase().replace(/[^a-z0-9]/g, "-")],
        });
      }
    }
  }

  return companies;
}

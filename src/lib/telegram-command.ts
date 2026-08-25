export type TelegramCommand =
  | { type: "help" }
  | { type: "list"; limit: number }
  | { type: "verticals" }
  | { type: "vertical"; query: string; limit: number }
  | { type: "research"; query?: string }
  | { type: "unknown" };

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 30;

function parseLimit(value?: string) {
  if (!value || !/^\d+$/.test(value)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Number(value)));
}

export function normalizeTelegramText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function parseTelegramCommand(text: string): TelegramCommand {
  const trimmed = text.trim();
  if (!trimmed) return { type: "unknown" };
  const [rawCommand, ...parts] = trimmed.split(/\s+/);
  const command = rawCommand.toLowerCase().replace(/@[^\s]+$/, "");

  if (["/start", "/ajuda", "/help"].includes(command)) return { type: "help" };
  if (command === "/verticais") return { type: "verticals" };
  if (command === "/empresas")
    return { type: "list", limit: parseLimit(parts[0]) };
  if (command === "/vertical") {
    const possibleLimit = parts.at(-1);
    const hasLimit = Boolean(possibleLimit && /^\d+$/.test(possibleLimit));
    const query = (hasLimit ? parts.slice(0, -1) : parts).join(" ").trim();
    return query
      ? { type: "vertical", query, limit: parseLimit(possibleLimit) }
      : { type: "unknown" };
  }
  if (command === "/pesquisar") {
    const query = parts.join(" ").trim();
    return {
      type: "research",
      query:
        !query ||
        ["geral", "todas", "todos"].includes(normalizeTelegramText(query))
          ? undefined
          : query,
    };
  }

  const normalized = normalizeTelegramText(trimmed);
  if (normalized === "empresas") return { type: "list", limit: DEFAULT_LIMIT };
  if (normalized.startsWith("empresas de "))
    return {
      type: "vertical",
      query: trimmed.slice(trimmed.toLowerCase().indexOf(" de ") + 4),
      limit: DEFAULT_LIMIT,
    };
  if (normalized === "pesquisar empresas" || normalized === "pesquisar geral")
    return { type: "research" };
  if (normalized.startsWith("pesquisar "))
    return { type: "research", query: trimmed.slice(10).trim() };

  return { type: "unknown" };
}

const verticalAliases: Record<string, string[]> = {
  government: ["State, Regional and Local", "Federal and Central"],
  governo: ["State, Regional and Local", "Federal and Central"],
  varejo: ["Retail"],
  retail: ["Retail"],
  educacao: ["Education"],
  education: ["Education"],
  nonprofit: ["Non-Profit"],
  "non profit": ["Non-Profit"],
  ong: ["Non-Profit"],
  hospitalidade: ["Hospitality"],
  turismo: ["Hospitality"],
  travel: ["Hospitality"],
  hospitality: ["Hospitality"],
  midia: ["Other Media", "Video Media"],
  media: ["Other Media", "Video Media"],
  video: ["Video Media"],
  servicos: ["Business Services"],
  "servicos empresariais": ["Business Services"],
  "business services": ["Business Services"],
};

export function resolveTelegramVertical(
  query: string,
  availableVerticals: string[],
): string[] {
  const normalized = normalizeTelegramText(query)
    .replace(/^empresas\s+(?:de|da|do)\s+/, "")
    .replace(/^vertical\s+/, "");
  const aliases = verticalAliases[normalized];
  if (aliases)
    return aliases.filter((name) => availableVerticals.includes(name));
  const exact = availableVerticals.filter(
    (name) => normalizeTelegramText(name) === normalized,
  );
  if (exact.length) return exact;
  return availableVerticals.filter((name) =>
    normalizeTelegramText(name).includes(normalized),
  );
}

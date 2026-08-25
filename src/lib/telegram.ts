import "server-only";

import { listCompanySummaries } from "@/lib/company-repository";
import { enqueueResearch } from "@/lib/enqueue-research";
import { env } from "@/lib/env";
import { listVerticals } from "@/lib/operations-repository";
import {
  sendTelegramCompanies,
  sendTelegramMessage,
} from "@/lib/providers/telegram";
import {
  parseTelegramCommand,
  resolveTelegramVertical,
} from "@/lib/telegram-command";

const keyboard = {
  keyboard: [
    [{ text: "/empresas 10" }, { text: "/verticais" }],
    [{ text: "/pesquisar geral" }, { text: "/ajuda" }],
  ],
  resize_keyboard: true as const,
};

const helpMessage = `<b>Prospect Radar</b> 📡

/empresas 10 — últimas empresas salvas
/vertical Retail 10 — empresas salvas por vertical
/verticais — mostra as verticais disponíveis
/pesquisar geral — inicia pesquisa ampla
/pesquisar Retail — inicia pesquisa por vertical
/ajuda — mostra este menu

Você também pode escrever “empresas de varejo” ou “pesquisar educação”.`;

function saoPauloDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function resolveVertical(query: string) {
  const available = (await listVerticals()).map((vertical) => vertical.name);
  return {
    available,
    matches: resolveTelegramVertical(query, available),
  };
}

export async function handleTelegramText(
  chatId: string,
  text: string,
  updateId: number,
) {
  const command = parseTelegramCommand(text);
  if (command.type === "help")
    return sendTelegramMessage(chatId, helpMessage, keyboard);
  if (command.type === "verticals") {
    const verticals = await listVerticals();
    return sendTelegramMessage(
      chatId,
      `<b>Verticais disponíveis</b>\n\n${verticals.map((item) => `• ${item.name}`).join("\n")}`,
      keyboard,
    );
  }
  if (command.type === "list") {
    const companies = await listCompanySummaries({ limit: command.limit });
    return sendTelegramCompanies(chatId, companies, "Empresas mais recentes");
  }
  if (command.type === "vertical") {
    const { available, matches } = await resolveVertical(command.query);
    if (!matches.length)
      return sendTelegramMessage(
        chatId,
        `Vertical não encontrada. Use /verticais.\n\nDisponíveis: ${available.join(", ")}`,
      );
    const companies = await listCompanySummaries({
      limit: command.limit,
      verticalNames: matches,
    });
    return sendTelegramCompanies(
      chatId,
      companies,
      `Empresas — ${matches.join(" + ")}`,
    );
  }
  if (command.type === "research") {
    let criteria: string | undefined;
    let label = "todas as verticais ativas";
    if (command.query) {
      const { available, matches } = await resolveVertical(command.query);
      if (!matches.length)
        return sendTelegramMessage(
          chatId,
          `Vertical não encontrada. Use /verticais.\n\nDisponíveis: ${available.join(", ")}`,
        );
      label = matches.join(" + ");
      criteria = `Empresas brasileiras da vertical ${label}`;
    }
    await enqueueResearch(saoPauloDate(), `telegram-${updateId}`, criteria);
    return sendTelegramMessage(
      chatId,
      `<b>Pesquisa iniciada</b> 🔎\n\nEscopo: ${label}\nVou enviar os nomes quando terminar.`,
      keyboard,
    );
  }
  return sendTelegramMessage(
    chatId,
    "Não entendi esse pedido. Use /ajuda para ver os comandos.",
    keyboard,
  );
}

export async function notifyTelegramResearchResult(
  runId: string,
  created: number,
) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  try {
    const companies = await listCompanySummaries({
      runId,
      limit: Math.max(1, created),
    });
    await sendTelegramCompanies(
      env.TELEGRAM_CHAT_ID,
      companies,
      created
        ? `${created} nova${created === 1 ? " empresa" : "s empresas"} encontrada${created === 1 ? "" : "s"}`
        : "Pesquisa concluída — nenhuma empresa nova",
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "telegram_notification_failed",
        runId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

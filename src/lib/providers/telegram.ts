import "server-only";

import type { TelegramCompanySummary } from "@/lib/company-repository";
import { env } from "@/lib/env";

const TELEGRAM_API = "https://api.telegram.org";

export type TelegramReplyMarkup = {
  keyboard: Array<Array<{ text: string }>>;
  resize_keyboard: true;
};

export function escapeTelegramHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  replyMarkup?: TelegramReplyMarkup,
) {
  if (!env.TELEGRAM_BOT_TOKEN)
    throw new Error("TELEGRAM_BOT_TOKEN não configurado");
  const response = await fetch(
    `${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: replyMarkup,
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  const payload = (await response.json().catch(() => null)) as {
    ok?: boolean;
    description?: string;
  } | null;
  if (!response.ok || !payload?.ok)
    throw new Error(
      `Telegram retornou ${response.status}: ${payload?.description ?? "erro desconhecido"}`,
    );
}

export function formatTelegramCompanies(
  companies: TelegramCompanySummary[],
  title: string,
) {
  if (!companies.length)
    return [
      `<b>${escapeTelegramHtml(title)}</b>\n\nNenhuma empresa encontrada.`,
    ];
  const header = `<b>${escapeTelegramHtml(title)}</b>\n`;
  const messages: string[] = [];
  let current = header;
  for (const [index, company] of companies.entries()) {
    const url = `${env.NEXT_PUBLIC_APP_URL}/companies/${company.id}`;
    const line = `\n${index + 1}. <a href="${escapeTelegramHtml(url)}"><b>${escapeTelegramHtml(company.name)}</b></a>\n${escapeTelegramHtml(company.vertical)} · ${escapeTelegramHtml(company.solution)} · score ${company.score}\n`;
    if (current.length + line.length > 3800) {
      messages.push(current);
      current = header + line;
    } else current += line;
  }
  messages.push(current);
  return messages;
}

export async function sendTelegramCompanies(
  chatId: string,
  companies: TelegramCompanySummary[],
  title: string,
) {
  for (const message of formatTelegramCompanies(companies, title))
    await sendTelegramMessage(chatId, message);
}

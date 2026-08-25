import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { handleTelegramText } from "@/lib/telegram";

export const runtime = "nodejs";
export const maxDuration = 30;

const updateSchema = z.object({
  update_id: z.number().int(),
  message: z
    .object({
      text: z.string().max(4096).optional(),
      chat: z.object({ id: z.union([z.number(), z.string()]) }),
    })
    .optional(),
});

export async function POST(request: Request) {
  if (
    !env.TELEGRAM_WEBHOOK_SECRET ||
    request.headers.get("x-telegram-bot-api-secret-token") !==
      env.TELEGRAM_WEBHOOK_SECRET
  )
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Atualização inválida" },
      { status: 400 },
    );
  if (!parsed.data.message?.text) return NextResponse.json({ ok: true });

  const chatId = String(parsed.data.message.chat.id);
  if (!env.TELEGRAM_CHAT_ID || chatId !== env.TELEGRAM_CHAT_ID) {
    console.warn(
      JSON.stringify({
        level: "warn",
        message: "telegram_chat_rejected",
        updateId: parsed.data.update_id,
      }),
    );
    return NextResponse.json({ ok: true });
  }

  try {
    await handleTelegramText(
      chatId,
      parsed.data.message.text,
      parsed.data.update_id,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "telegram_update_failed",
        updateId: parsed.data.update_id,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return NextResponse.json(
      { error: "Falha ao processar comando" },
      { status: 500 },
    );
  }
}

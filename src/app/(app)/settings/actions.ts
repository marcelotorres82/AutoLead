"use server";

import { redirect } from "next/navigation";
import { recordAuditLog } from "@/lib/audit-log";
import { getSession } from "@/lib/auth";
import { registerTelegramWebhook } from "@/lib/providers/telegram";

export async function registerTelegramWebhookAction() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  let result: "connected" | "error" = "connected";
  try {
    await registerTelegramWebhook();
    await recordAuditLog({
      actorEmail: session.email,
      actorName: session.name,
      action: "TELEGRAM_WEBHOOK_REGISTERED",
      entity: "settings",
      entityId: "telegram_webhook",
    });
  } catch (error) {
    result = "error";
    console.error(
      JSON.stringify({
        level: "error",
        message: "telegram_webhook_registration_failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
  redirect(`/settings?telegram=${result}`);
}

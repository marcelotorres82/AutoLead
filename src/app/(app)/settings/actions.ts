"use server";

import { redirect } from "next/navigation";
import { registerTelegramWebhook } from "@/lib/providers/telegram";

export async function registerTelegramWebhookAction() {
  let result: "connected" | "error" = "connected";
  try {
    await registerTelegramWebhook();
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

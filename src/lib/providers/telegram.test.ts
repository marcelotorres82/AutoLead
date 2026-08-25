import { describe, expect, it } from "vitest";
import { telegramWebhookUrl } from "@/lib/providers/telegram";

describe("provider do Telegram", () => {
  it("monta o webhook usando a origem HTTPS configurada", () => {
    expect(telegramWebhookUrl("https://radar.example.com/")).toBe(
      "https://radar.example.com/api/telegram/webhook",
    );
  });

  it("recusa webhook sem HTTPS", () => {
    expect(() => telegramWebhookUrl("http://localhost:3000")).toThrow(
      "exige uma URL HTTPS",
    );
  });
});

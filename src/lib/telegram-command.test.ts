import { describe, expect, it } from "vitest";
import {
  parseTelegramCommand,
  resolveTelegramVertical,
} from "@/lib/telegram-command";

const verticals = [
  "Retail",
  "Business Services",
  "State, Regional and Local",
  "Federal and Central",
  "Education",
  "Hospitality",
  "Non-Profit",
  "Other Media",
  "Video Media",
];

describe("comandos do Telegram", () => {
  it("limita a quantidade de empresas", () => {
    expect(parseTelegramCommand("/empresas 100")).toEqual({
      type: "list",
      limit: 30,
    });
  });

  it("aceita vertical com espaços e quantidade", () => {
    expect(parseTelegramCommand("/vertical Business Services 12")).toEqual({
      type: "vertical",
      query: "Business Services",
      limit: 12,
    });
  });

  it("aceita pesquisa geral e pesquisa por vertical", () => {
    expect(parseTelegramCommand("/pesquisar geral")).toEqual({
      type: "research",
      query: undefined,
    });
    expect(parseTelegramCommand("pesquisar educação")).toEqual({
      type: "research",
      query: "educação",
    });
  });

  it("resolve aliases em português e agrupa Government", () => {
    expect(resolveTelegramVertical("varejo", verticals)).toEqual(["Retail"]);
    expect(resolveTelegramVertical("Government", verticals)).toEqual([
      "State, Regional and Local",
      "Federal and Central",
    ]);
  });
});

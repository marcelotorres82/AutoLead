const dangerous = /^[=+\-@]/;
export function safeCsvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (dangerous.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
export function generateCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "\uFEFF";
  const headers = Object.keys(rows[0]);
  return `\uFEFF${headers.map(safeCsvCell).join(",")}\r\n${rows.map((row) => headers.map((key) => safeCsvCell(row[key])).join(",")).join("\r\n")}`;
}

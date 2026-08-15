import { put } from "@vercel/blob";
import type { BackupStorage } from "@/lib/providers/types";
export class VercelBlobStorage implements BackupStorage {
  async put(path: string, body: string) {
    const result = await put(path, body, {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
    });
    return { pathname: result.pathname, size: Buffer.byteLength(body) };
  }
}

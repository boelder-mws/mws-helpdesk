import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { env } from "./env";

export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function filesFrom(form: FormData, field = "files"): File[] {
  return form.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
}

/** Returns an error message, or null when the files are acceptable. */
export function checkFiles(files: File[]): string | null {
  if (files.length > MAX_FILES) return `Attach up to ${MAX_FILES} files at a time.`;
  const big = files.find((f) => f.size > MAX_FILE_BYTES);
  if (big) return `${big.name} is larger than 10 MB.`;
  return null;
}

export function uploadPath(storageKey: string) {
  return path.join(path.resolve(env.uploadDir), path.basename(storageKey));
}

/** Removes stored files. A file that is already gone is not an error. */
export async function deleteStoredFiles(storageKeys: string[]) {
  await Promise.all(
    storageKeys.map((key) =>
      unlink(uploadPath(key)).catch((err: NodeJS.ErrnoException) => {
        if (err.code !== "ENOENT") console.error(`[uploads] could not remove ${key}: ${err.message}`);
      }),
    ),
  );
}

export async function saveAttachments(
  files: File[],
  ref: { ticketId: string; commentId?: string; uploaderId: string },
) {
  if (files.length === 0) return;
  await mkdir(path.resolve(env.uploadDir), { recursive: true });
  for (const file of files) {
    const storageKey = randomUUID();
    await writeFile(uploadPath(storageKey), Buffer.from(await file.arrayBuffer()));
    await db.insert(attachments).values({
      ticketId: ref.ticketId,
      commentId: ref.commentId ?? null,
      uploaderId: ref.uploaderId,
      filename: (file.name || "file").replace(/[\\/\r\n"]/g, "_").slice(0, 200),
      mime: file.type || "application/octet-stream",
      size: file.size,
      storageKey,
    });
  }
}

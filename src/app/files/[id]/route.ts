import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments, comments, tickets } from "@/db/schema";
import { isStaff } from "@/lib/auth/guards";
import { getCurrentUser } from "@/lib/auth/session";
import { uploadPath } from "@/lib/uploads";

const INLINE = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

  const [row] = await db
    .select({ file: attachments, requesterId: tickets.requesterId, internal: comments.internal })
    .from(attachments)
    .innerJoin(tickets, eq(tickets.id, attachments.ticketId))
    .leftJoin(comments, eq(comments.id, attachments.commentId))
    .where(eq(attachments.id, id));
  const allowed = row && (isStaff(user) || (row.requesterId === user.id && !row.internal));
  if (!allowed) return new Response("Not found", { status: 404 });

  let data: Buffer;
  try {
    data = await readFile(uploadPath(row.file.storageKey));
  } catch {
    return new Response("File is missing from storage", { status: 404 });
  }
  const inline = INLINE.has(row.file.mime);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": inline ? row.file.mime : "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(row.file.filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
}

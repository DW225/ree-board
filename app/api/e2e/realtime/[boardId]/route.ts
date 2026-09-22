import { memberTable } from "@/db/schema";
import { validateLocalE2e } from "@/lib/config/localE2e";
import { Role } from "@/lib/constants/role";
import { db } from "@/lib/db/client";
import { getUserBySupabaseId } from "@/lib/db/user";
import { createClient } from "@/lib/utils/supabase/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const boardIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

export async function GET(
  request: Request,
  context: { params: Promise<{ boardId: string }> }
) {
  const local = validateLocalE2e();
  if (!local) return new Response(null, { status: 404 });
  const boardId = boardIdSchema.safeParse((await context.params).boardId);
  if (!boardId.success) return new Response(null, { status: 400 });
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response(null, { status: 401 });
  const internal = await getUserBySupabaseId(user.id);
  if (!internal) return new Response(null, { status: 401 });
  const [membership] = await db
    .select({ id: memberTable.id })
    .from(memberTable)
    .where(
      and(
        eq(memberTable.userId, internal.id),
        eq(memberTable.boardId, boardId.data),
        inArray(memberTable.role, [Role.owner, Role.member, Role.guest])
      )
    )
    .limit(1);
  if (!membership) return new Response(null, { status: 403 });
  const lifetime = new AbortController();
  const expiry = setTimeout(() => lifetime.abort(), 60_000);
  const signal = AbortSignal.any([request.signal, lifetime.signal]);
  try {
    const upstream = await fetch(
      `${local.relayOrigin}/boards/${boardId.data}`,
      {
        headers: { Authorization: `Bearer ${process.env.E2E_RELAY_TOKEN}` },
        signal,
        cache: "no-store",
        redirect: "error",
      }
    );
    if (!upstream.ok || !upstream.body) {
      clearTimeout(expiry);
      lifetime.abort();
      return new Response(null, { status: 503 });
    }
    const reader = upstream.body.getReader();
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (!done) {
            controller.enqueue(value);
            return;
          }
        } catch {
          /* A closed client or the 60-second expiry ends this stream. */
        }
        clearTimeout(expiry);
        lifetime.abort();
        try {
          controller.close();
        } catch {
          /* The consumer already cancelled. */
        }
      },
      cancel() {
        clearTimeout(expiry);
        lifetime.abort();
        return reader.cancel().catch(() => undefined);
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    clearTimeout(expiry);
    lifetime.abort();
    return new Response(null, { status: 503 });
  }
}

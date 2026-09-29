import { validateLocalE2e } from "@/lib/config/localE2e";

export const dynamic = "force-dynamic";

export function GET() {
  const local = validateLocalE2e();
  if (!local) return new Response(null, { status: 404 });
  return Response.json(
    { runId: local.runId },
    { headers: { "Cache-Control": "no-store" } }
  );
}

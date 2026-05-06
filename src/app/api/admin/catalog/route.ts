import { requirePanelSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePanelSession();
    return Response.json(await getAdminSnapshot());
  } catch {
    return unauthorizedResponse();
  }
}

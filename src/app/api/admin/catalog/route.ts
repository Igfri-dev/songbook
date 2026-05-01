import { requireAdminSession, unauthorizedResponse } from "@/lib/admin";
import { getAdminSnapshot } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    return Response.json(await getAdminSnapshot());
  } catch {
    return unauthorizedResponse();
  }
}

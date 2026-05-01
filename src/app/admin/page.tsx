import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminLayout } from "@/components/admin/admin-layout";
import { getAuthSession } from "@/lib/auth";
import { getAdminSnapshot } from "@/lib/catalog";

export default async function AdminPage() {
  const session = await getAuthSession();

  if (session?.user?.role !== "ADMIN") {
    redirect("/login?callbackUrl=/admin");
  }

  const snapshot = await getAdminSnapshot();

  return (
    <AdminLayout>
      <AdminDashboard initialSnapshot={snapshot} />
    </AdminLayout>
  );
}

import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminLayout } from "@/components/admin/admin-layout";
import { getAuthSession } from "@/lib/auth";
import { getAdminSnapshot, getUserManagementSnapshot } from "@/lib/catalog";

export default async function AdminPage() {
  const session = await getAuthSession();

  if (!session?.user?.role) {
    redirect("/login?callbackUrl=/admin");
  }

  const snapshot = session.user.role === "ADMIN"
    ? await getAdminSnapshot()
    : await getUserManagementSnapshot();
  snapshot.currentUser = {
    id: Number(session.user.id),
    role: session.user.role,
  };

  return (
    <AdminLayout>
      <AdminDashboard initialSnapshot={snapshot} />
    </AdminLayout>
  );
}

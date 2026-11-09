import { isAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { AdminDashboard } from "@/components/admin-dashboard";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quản trị | Gia đình Gấu" };

export default async function Admin() {
  const authenticated = await isAdmin();
  if (!authenticated) {
    return <main className="admin-page"><AdminDashboard authenticated={false} albums={[]} photos={[]} /></main>;
  }

  const [albums, photos] = await Promise.all([
    db().unsafe("SELECT id::text,title FROM family_albums WHERE archived_at IS NULL ORDER BY created_at DESC"),
    db().unsafe(
      "SELECT p.id::text,p.caption,a.title AS album_title,COALESCE(u.display_name,'Thành viên') AS uploader FROM family_photos p JOIN family_albums a ON a.id=p.album_id LEFT JOIN users u ON u.id=p.uploaded_by WHERE p.status='approved' ORDER BY p.created_at DESC LIMIT 300"
    ),
  ]);

  return <main className="admin-page"><AdminDashboard authenticated albums={albums as { id: string; title: string }[]} photos={photos as { id: string; caption: string; album_title: string; uploader: string }[]} /></main>;
}

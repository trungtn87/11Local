import {notFound} from "next/navigation";
import {db} from "@/lib/db";
import {getCurrentUser} from "@/lib/user-auth";
import {isAdmin} from "@/lib/admin-auth";
import {isUuid} from "@/lib/family-contribution";
import {PhotoDetails} from "@/components/photo-details";

export const dynamic="force-dynamic";
export default async function PhotoPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!isUuid(id))notFound();
  const user=await getCurrentUser(),admin=await isAdmin();
  const rows=await db().unsafe(
    `SELECT p.id::text,p.album_id::text,p.title,p.caption,p.uploaded_by::text,
       p.taken_on::text,p.created_at::text,COALESCE(u.display_name,'Gia đình Gấu') AS uploader_name,
       pl.title AS place_title,m.title AS milestone_title
       FROM family_photos p
       JOIN family_albums a ON a.id=p.album_id
       LEFT JOIN users u ON u.id=p.uploaded_by
       LEFT JOIN family_places pl ON pl.id=p.place_id
       LEFT JOIN family_milestones m ON m.id=p.milestone_id
       WHERE p.id::text=$1 AND p.status='approved' AND a.archived_at IS NULL`,[id]);
  if(!rows.length)notFound();
  const p=rows[0];
  return <main>
    <PhotoDetails id={id} albumId={String(p.album_id)} title={String(p.title||"")} caption={String(p.caption||"")}
      canEdit={admin||!!user&&user.id===p.uploaded_by}
      canComment={!!user} userId={user?.id||null} admin={admin}/>
    <div className="wrap" style={{maxWidth:900,paddingBottom:32}}>
      <p>Đăng bởi {String(p.uploader_name)}</p>
      {p.taken_on&&<p>📅 {String(p.taken_on)}</p>}
      {p.place_title&&<p>📍 {String(p.place_title)}</p>}
      {p.milestone_title&&<p>🌱 {String(p.milestone_title)}</p>}
    </div>
  </main>;
}

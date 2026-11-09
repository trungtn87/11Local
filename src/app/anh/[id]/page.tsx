import {notFound} from "next/navigation";
import {db} from "@/lib/db";
import {getCurrentUser} from "@/lib/user-auth";
import {isAdmin} from "@/lib/admin-auth";
import {isUuid} from "@/lib/family-contribution";
import {choosePhotoView,galleryPosition,photoHref,type PhotoView} from "@/lib/photo-navigation";
import {PhotoDetails} from "@/components/photo-details";

export const dynamic="force-dynamic";

type PhotoRow={
  id:string;album_id:string;place_id:string|null;milestone_id:string|null;
  title:string;caption:string;uploaded_by:string;uploader_name:string;
  taken_on:string|null;place_title:string|null;milestone_title:string|null;
};

async function photoIds(view:PhotoView):Promise<string[]> {
  let sql:string;
  if(view.kind==="place") {
    sql="SELECT p.id::text FROM family_photos p JOIN family_albums a ON a.id=p.album_id AND a.archived_at IS NULL JOIN family_places pl ON pl.id=p.place_id AND pl.kind='memory' AND pl.visibility=true AND pl.archived_at IS NULL WHERE p.place_id::text=$1 AND p.status='approved' ORDER BY p.taken_on DESC NULLS LAST,p.created_at DESC,p.id DESC";
  } else if(view.kind==="milestone") {
    sql="SELECT p.id::text FROM family_photos p JOIN family_albums a ON a.id=p.album_id AND a.archived_at IS NULL WHERE p.milestone_id::text=$1 AND p.status='approved' ORDER BY p.taken_on DESC NULLS LAST,p.created_at DESC,p.id DESC";
  } else {
    sql="SELECT p.id::text FROM family_photos p JOIN family_albums a ON a.id=p.album_id AND a.archived_at IS NULL WHERE p.album_id::text=$1 AND p.status='approved' ORDER BY p.created_at DESC,p.id DESC";
  }
  const rows=await db().unsafe(sql,[view.id]);
  return rows.map(row=>String(row.id));
}

export default async function PhotoPage({
  params,searchParams
}:{
  params:Promise<{id:string}>;
  searchParams:Promise<{view?:string;group?:string}>;
}) {
  const [{id},query]=await Promise.all([params,searchParams]);
  if(!isUuid(id))notFound();
  const [user,admin,rows]=await Promise.all([
    getCurrentUser(),isAdmin(),
    db().unsafe(
      "SELECT p.id::text,p.album_id::text,p.place_id::text,p.milestone_id::text,p.title,p.caption,p.uploaded_by::text,p.taken_on::text,COALESCE(u.display_name,'Gia đình Gấu') AS uploader_name,pl.title AS place_title,m.title AS milestone_title FROM family_photos p JOIN family_albums a ON a.id=p.album_id LEFT JOIN users u ON u.id=p.uploaded_by LEFT JOIN family_places pl ON pl.id=p.place_id LEFT JOIN family_milestones m ON m.id=p.milestone_id WHERE p.id::text=$1 AND p.status='approved' AND a.archived_at IS NULL",
      [id]
    )
  ]);
  if(!rows.length)notFound();
  const p=rows[0] as unknown as PhotoRow;
  let view=choosePhotoView(query.view,query.group,{
    albumId:p.album_id,placeId:p.place_id,milestoneId:p.milestone_id
  });
  let ids=await photoIds(view);
  // A hidden/archived place is never treated as a public photo collection.
  if(!ids.includes(id)) {
    view={kind:"album",id:p.album_id};
    ids=await photoIds(view);
  }
  const position=galleryPosition(ids,id);
  const backHref=view.kind==="place"?"/ky-niem/dia-diem/"+view.id:
    view.kind==="milestone"?"/ky-niem/thoi-gian/"+view.id:"/album/"+view.id;
  const backLabel=view.kind==="place"?"Quay lại địa điểm":
    view.kind==="milestone"?"Quay lại mốc thời gian":"Quay lại album";

  return <main>
    <PhotoDetails key={id} id={id} title={p.title||""} caption={p.caption||""}
      canEdit={admin||Boolean(user&&user.id===p.uploaded_by)}
      canComment={Boolean(user)} userId={user?.id||null} admin={admin}
      backHref={backHref} backLabel={backLabel}
      position={position.position} total={position.total}
      previousHref={position.previousId?photoHref(position.previousId,view):null}
      nextHref={position.nextId?photoHref(position.nextId,view):null}
      uploaderName={p.uploader_name} takenOn={p.taken_on}
      placeTitle={p.place_title} milestoneTitle={p.milestone_title}/>
  </main>;
}

import { unstable_cache, revalidateTag } from "next/cache";
import {db} from "@/lib/db";

export type Album = {
  id:string;title:string;description:string;event_date:string|null;cover_id:string|null;photo_count:number;
};
export type Place = {
  id:string;title:string;latitude:number;longitude:number;visited_on:string|null;album_id:string|null;
  album_ids:string[];category:string;kind:"memory"|"curated";description:string;address:string;
};
export type Milestone = {id:string;title:string;details:string;event_date:string;album_id:string|null};
export type Photo = {
  id:string;caption:string;created_at:string;uploader_name:string;taken_on:string|null;
  place_title:string|null;milestone_title:string|null;
};

async function rawAlbums():Promise<Album[]> {
  try {
    const q="SELECT a.id::text,a.title,a.description,a.event_date::text, (SELECT p.id::text FROM family_photos p WHERE p.album_id=a.id AND p.status='approved' ORDER BY p.created_at LIMIT 1) AS cover_id, (SELECT count(*)::int FROM family_photos p WHERE p.album_id=a.id AND p.status='approved') AS photo_count FROM family_albums a WHERE a.archived_at IS NULL ORDER BY a.event_date DESC NULLS LAST,a.created_at DESC";
    return (await db().unsafe(q)) as unknown as Album[];
  } catch (error) {throw error;}
}
async function rawAlbum(id:string) {
  try {
    const a=await db().unsafe("SELECT id::text,title,description,event_date::text FROM family_albums WHERE id::text=$1 AND archived_at IS NULL",[id]);
    if(!a.length)return null;
    const p=await db().unsafe(
      `SELECT p.id::text,p.caption,p.created_at::text,p.taken_on::text,
        COALESCE(u.display_name,'Gia đình Gấu') AS uploader_name,
        pl.title AS place_title,m.title AS milestone_title
       FROM family_photos p
       LEFT JOIN users u ON u.id=p.uploaded_by
       LEFT JOIN family_places pl ON pl.id=p.place_id
       LEFT JOIN family_milestones m ON m.id=p.milestone_id
       WHERE p.album_id::text=$1 AND p.status='approved' ORDER BY p.created_at DESC`,[id]);
    const row=a[0] as unknown as {id:string;title:string;description:string;event_date:string|null};
    return {...row,photos:p as unknown as Photo[]};
  } catch (error) {throw error;}
}
async function rawPlaces():Promise<Place[]> {
  try {
    const r=await db().unsafe(
      `SELECT pl.id::text,pl.title,pl.latitude,pl.longitude,pl.visited_on::text,
        pl.category,pl.kind,pl.description,pl.address,
        COALESCE(
          (SELECT p.album_id::text FROM family_photos p
           JOIN family_albums a ON a.id=p.album_id AND a.archived_at IS NULL
           WHERE p.place_id=pl.id AND p.status='approved'
           ORDER BY p.created_at DESC LIMIT 1),
          (SELECT a.id::text FROM family_albums a WHERE a.id=pl.album_id AND a.archived_at IS NULL),
          (SELECT l.album_id::text FROM family_place_albums l
           JOIN family_albums a ON a.id=l.album_id AND a.archived_at IS NULL
           WHERE l.place_id=pl.id ORDER BY l.created_at LIMIT 1)
        ) AS album_id,
        ARRAY(
          SELECT a.id::text FROM family_albums a
          WHERE a.archived_at IS NULL AND (
            a.id=pl.album_id OR
            EXISTS (SELECT 1 FROM family_place_albums l WHERE l.place_id=pl.id AND l.album_id=a.id) OR
            EXISTS (SELECT 1 FROM family_photos p WHERE p.place_id=pl.id AND p.album_id=a.id AND p.status='approved')
          ) ORDER BY a.event_date DESC NULLS LAST,a.created_at DESC
        ) AS album_ids
       FROM family_places pl
       WHERE pl.visibility=true AND pl.archived_at IS NULL
       ORDER BY pl.visited_on DESC NULLS LAST,pl.created_at DESC`);
    return r.map(x=>({...x,latitude:Number(x.latitude),longitude:Number(x.longitude)})) as unknown as Place[];
  } catch (error) {throw error;}
}
async function rawMilestones():Promise<Milestone[]> {
  try {
    return (await db().unsafe(
      `SELECT m.id::text,m.title,m.details,m.event_date::text,
        COALESCE(
          (SELECT p.album_id::text FROM family_photos p
           JOIN family_albums a ON a.id=p.album_id AND a.archived_at IS NULL
           WHERE p.milestone_id=m.id AND p.status='approved'
           ORDER BY p.created_at DESC LIMIT 1),
          (SELECT a.id::text FROM family_albums a WHERE a.id=m.album_id AND a.archived_at IS NULL)
        ) AS album_id
       FROM family_milestones m ORDER BY m.event_date DESC`
    )) as unknown as Milestone[];
  } catch (error) {throw error;}
}

/**
 * Cache ONLY public album/place/timeline data. These queries do not read
 * cookies or user permissions. Auth/session/admin data is never cached here.
 * Route Handlers invalidate this tag after successful writes.
 */
const FAMILY_PUBLIC_TAG = "gau-public-family-v1";
const options = { tags: [FAMILY_PUBLIC_TAG], revalidate: 60 };
const readAlbums = unstable_cache(rawAlbums, ["gau-albums-v1"], options);
const readAlbum = unstable_cache(rawAlbum, ["gau-album-v1"], options);
const readPlaces = unstable_cache(rawPlaces, ["gau-places-v1"], options);
const readMilestones = unstable_cache(rawMilestones, ["gau-milestones-v1"], options);

export function invalidateFamilyPublic() {
  // Route Handlers need immediate expiry, not stale-while-revalidate,
  // so a newly submitted photo/album is visible on the next request.
  revalidateTag(FAMILY_PUBLIC_TAG, { expire: 0 });
}

// Keep the prior graceful fallback, but never cache DB failures as empty data.
export async function albums(): Promise<Album[]> {
  try { return await readAlbums(); } catch { return []; }
}
export async function album(id: string): Promise<Awaited<ReturnType<typeof rawAlbum>>> {
  try { return await readAlbum(id); } catch { return null; }
}
export async function places(): Promise<Place[]> {
  try { return await readPlaces(); } catch { return []; }
}
export async function milestones(): Promise<Milestone[]> {
  try { return await readMilestones(); } catch { return []; }
}

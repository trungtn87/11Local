import { db } from "@/lib/db";

export type Album = {
  id: string;
  title: string;
  description: string;
  event_date: string | null;
  cover_id: string | null;
  photo_count: number;
};

export type Place = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  visited_on: string | null;
  album_id: string | null;
};

export type Milestone = {
  id: string;
  title: string;
  details: string;
  event_date: string;
  album_id: string | null;
};

export type Photo = {
  id: string;
  caption: string;
  created_at: string;
  uploader_name: string;
};

export async function albums(): Promise<Album[]> {
  try {
    const q =
      "SELECT a.id::text,a.title,a.description,a.event_date::text, (SELECT p.id::text FROM family_photos p WHERE p.album_id=a.id AND p.status='approved' ORDER BY p.created_at LIMIT 1) AS cover_id, (SELECT count(*)::int FROM family_photos p WHERE p.album_id=a.id AND p.status='approved') AS photo_count FROM family_albums a ORDER BY a.event_date DESC NULLS LAST,a.created_at DESC";
    return (await db().unsafe(q)) as unknown as Album[];
  } catch {
    return [];
  }
}

export async function album(id: string) {
  try {
    const a = await db().unsafe(
      "SELECT id::text,title,description,event_date::text FROM family_albums WHERE id::text=$1",
      [id],
    );
    if (!a.length) return null;
    const p = await db().unsafe(
      "SELECT p.id::text,p.caption,p.created_at::text,COALESCE(u.display_name,'Gia đình Gấu') AS uploader_name FROM family_photos p LEFT JOIN users u ON u.id=p.uploaded_by WHERE p.album_id::text=$1 AND p.status='approved' ORDER BY p.created_at DESC",
      [id],
    );
    const row = a[0] as unknown as {
      id: string;
      title: string;
      description: string;
      event_date: string | null;
    };
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      event_date: row.event_date,
      photos: p as unknown as Photo[],
    };
  } catch {
    return null;
  }
}

export async function places(): Promise<Place[]> {
  try {
    const r = await db().unsafe(
      "SELECT id::text,title,latitude,longitude,visited_on::text,album_id::text FROM family_places ORDER BY visited_on DESC NULLS LAST",
    );
    return r.map((x) => ({
      ...x,
      latitude: Number(x.latitude),
      longitude: Number(x.longitude),
    })) as unknown as Place[];
  } catch {
    return [];
  }
}

export async function milestones(): Promise<Milestone[]> {
  try {
    return (await db().unsafe(
      "SELECT id::text,title,details,event_date::text,album_id::text FROM family_milestones ORDER BY event_date DESC",
    )) as unknown as Milestone[];
  } catch {
    return [];
  }
}

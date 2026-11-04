import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

/** All extra data is fetched only AFTER the public moderation gate passes. */
export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id: slug} = await params;
  if (!/^[a-z0-9][a-z0-9-]{0,127}$/.test(slug)) {
    return NextResponse.json({error:"NOT_FOUND"}, {status:404,headers});
  }
  try {
    const sql = db();
    const [place] = await sql`
      SELECT v.id,v.slug,v.name,v.description,v.address,v.area,v.latitude,v.longitude,
        v.category_id,v.category_name,v.ownership_status,v.phone,
        v.view_count,v.rating_avg,v.rating_count,
        p.place_kind,p.summary,p.website_url,p.featured_rank,p.featured_until,
        p.navigation_latitude,p.navigation_longitude,
        p.opening_hours,p.price_note
      FROM api.public_places v
      JOIN public.places p ON p.id=v.id
      WHERE v.slug=${slug} LIMIT 1`;
    if (!place) return NextResponse.json({error:"NOT_FOUND"},{status:404,headers});

    const [photos, fields, hours, prices, tags] = await Promise.all([
      sql`SELECT ph.id,ph.photo_type,ph.caption,ph.alt_text
        FROM public.place_photos ph JOIN public.place_image_blobs blob ON blob.photo_id=ph.id
        WHERE ph.place_id=${place.id} AND ph.moderation_status='approved'
          AND ph.photo_type IN ('cover','avatar','gallery')
        ORDER BY CASE ph.photo_type WHEN 'cover' THEN 0 WHEN 'avatar' THEN 1 ELSE 2 END,
          ph.sort_order,ph.created_at DESC,ph.id DESC LIMIT 48`,
      sql`SELECT f.label,f.field_type,d.details -> f.field_key AS value
        FROM public.place_details d
        JOIN public.category_fields f ON f.category_id=${place.category_id} AND f.is_visible=true
        WHERE d.place_id=${place.id} AND d.details ? f.field_key
        ORDER BY f.sort_order,f.field_key LIMIT 80`,
      sql`SELECT day_of_week,slot_index,opens_at,closes_at,is_closed,is_24_hours
        FROM public.place_opening_hours WHERE place_id=${place.id}
        ORDER BY day_of_week,slot_index LIMIT 40`,
      sql`SELECT label,amount_min,amount_max,currency,unit,note
        FROM public.place_prices WHERE place_id=${place.id} AND is_active=true
        ORDER BY sort_order,created_at,id LIMIT 40`,
      sql`SELECT t.name
        FROM public.place_tags pt JOIN public.tags t ON t.id=pt.tag_id
        WHERE pt.place_id=${place.id} ORDER BY t.name LIMIT 40`,
    ]);
    return NextResponse.json({place:{
      ...place,
      photos: photos.map(p => ({id:p.id,type:p.photo_type,caption:p.caption,alt:p.alt_text})),
      detail_fields: fields,
      opening_slots: hours,
      prices,
      tags: tags.map(tag => String(tag.name)),
    }},{headers});
  } catch(error) {
    console.error("11Local V2 place detail read failed", error);
    return NextResponse.json({error:"DETAIL_UNAVAILABLE"},{status:503,headers});
  }
}

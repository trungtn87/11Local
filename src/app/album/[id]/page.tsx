import Link from "next/link";
import {notFound} from "next/navigation";
import {album} from "@/lib/family";
import {GauEmptyMascot} from "@/components/gau-mascot";

export const dynamic="force-dynamic";

export default async function AlbumDetail({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const data=await album(id);
  if(!data)notFound();
  return <main className="wrap">
    <div className="page-title">
      <p className="eyebrow"><Link href="/album">← Tất cả album của Gấu</Link></p>
      <h1>{data.title}</h1>
      {data.description&&<p>{data.description}</p>}
      {data.event_date&&<p className="card-meta">Ngày kỷ niệm: {data.event_date}</p>}
      <Link href={`/dong-gop?album=${id}`} className="primary">💝 Góp ảnh vào album</Link>
    </div>
    {data.photos.length>0?<div className="photo-grid">{data.photos.map(p=><figure key={p.id}>
      <Link href={`/anh/${p.id}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img loading="lazy" src={`/api/photos/${p.id}`} alt={p.title||p.caption||data.title}/>
      </Link>
      <figcaption>
        <strong>{p.title||"Kỷ niệm của Gấu"}</strong>
        {p.caption&&<small>{p.caption}</small>}
        <small><Link href={`/anh/${p.id}`}>Xem ảnh và bình luận</Link></small>
        {p.taken_on&&<small>📅 {p.taken_on}</small>}
        {p.place_title&&<small>📍 {p.place_title}</small>}
        {p.milestone_title&&<small>🌱 {p.milestone_title}</small>}
        <small>Đăng bởi {p.uploader_name}</small>
      </figcaption>
    </figure>)}</div>:<div className="empty-scrapbook">
      <GauEmptyMascot width={104} height={96} className="empty-mascot"/>
      <h3>Album đang chờ những bức ảnh kỷ niệm đầu tiên</h3>
      <p>Hãy là người đầu tiên gửi tặng Gấu một bức ảnh đáng nhớ!</p>
      <div className="empty-actions"><Link href={`/dong-gop?album=${id}`} className="primary">Góp ảnh ngay</Link></div>
    </div>}
  </main>;
}

import {places} from "@/lib/family";import {MemoryMap} from "@/components/memory-map";
export const dynamic="force-dynamic";export const metadata={title:"Gấu đã đi đâu? | Nhà của Gấu"};
export default async function MapPage(){const pins=await places();return <main className="wrap"><div className="page-title"><p className="eyebrow">📍 Những nơi đã qua</p><h1>Gấu đã đi đâu?</h1><p>Ghim lại những nơi đã cùng gia đình khám phá và những kỷ niệm gắn liền với từng nơi.</p></div><MemoryMap places={pins}/></main>;}

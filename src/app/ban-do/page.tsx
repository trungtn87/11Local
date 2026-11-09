import "./map-page.css";
import {places} from "@/lib/family";import {MemoryMap} from "@/components/memory-map";
export const dynamic="force-dynamic";export const metadata={title:"Gấu đã đi đâu? | Gia đình Gấu"};
export default async function MapPage(){const pins=await places();return <main className="wrap"><div className="page-title"><p className="eyebrow">📍 Những nơi đã qua</p><h1>Gấu đã đi đâu?</h1></div><MemoryMap places={pins}/></main>;}

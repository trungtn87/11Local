import {NextResponse} from "next/server";import {isAdmin} from "@/lib/admin-auth";import {db} from "@/lib/db";
export async function POST(request:Request){if(!(await isAdmin()))return NextResponse.json({error:"Không có quyền"},{status:401});const data=await request.json().catch(()=>null);if(!data||typeof data.title!=="string"||!data.title.trim()||data.title.length>150)return NextResponse.json({error:"Tên không hợp lệ"},{status:400});const title=data.title.trim();
try{
if(data.type==="album"){await db().unsafe("INSERT INTO family_albums(title,description,event_date) VALUES ($1,$2,$3::date)",[title,String(data.description||"").slice(0,2000),data.event_date||null]);}
else if(data.type==="place"){const lat=Number(data.latitude),lng=Number(data.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||data.latitude===""||data.longitude==="")return NextResponse.json({error:"Tọa độ không hợp lệ"},{status:400});await db().unsafe("INSERT INTO family_places(title,latitude,longitude,visited_on,album_id) VALUES ($1,$2,$3,$4::date,$5::uuid)",[title,lat,lng,data.visited_on||null,data.album_id||null]);}
else if(data.type==="milestone"){if(!/^\d{4}-\d{2}-\d{2}$/.test(data.event_date||""))return NextResponse.json({error:"Ngày tháng không hợp lệ"},{status:400});await db().unsafe("INSERT INTO family_milestones(title,details,event_date,album_id) VALUES ($1,$2,$3::date,$4::uuid)",[title,String(data.details||"").slice(0,4000),data.event_date,data.album_id||null]);}
else return NextResponse.json({error:"Loại nội dung không hợp lệ"},{status:400});
return NextResponse.json({ok:true},{status:201});}catch{return NextResponse.json({error:"Không thể lưu dữ liệu"},{status:500});}
}

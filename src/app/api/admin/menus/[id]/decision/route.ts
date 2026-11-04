import { NextResponse } from 'next/server';
import { decideMenu,menuError,noStore } from '@/lib/menu-server';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{return NextResponse.json(await decideMenu(request,(await params).id),{headers:noStore});}catch(e){return menuError(e);}}

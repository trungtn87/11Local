import { NextResponse } from 'next/server';
import { getPublicMenu,menuError,noStore } from '@/lib/menu-server';
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){try{return NextResponse.json({menu:await getPublicMenu((await params).id)},{headers:noStore});}catch(e){return menuError(e);}}

import { NextResponse } from 'next/server';
import { readManagedMenu,saveMenu,menuError,noStore } from '@/lib/menu-server';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(_:Request,{params}:Context){try{return NextResponse.json(await readManagedMenu((await params).id),{headers:noStore});}catch(e){return menuError(e);}}
export async function PUT(request:Request,{params}:Context){try{return NextResponse.json(await saveMenu(request,(await params).id),{headers:noStore});}catch(e){return menuError(e);}}

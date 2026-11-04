import { MenuEditor } from '@/components/menu/menu-editor';
export const metadata={title:'Menu và bảng giá | 11Local Admin',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){return <MenuEditor placeId={(await params).id}/>;}

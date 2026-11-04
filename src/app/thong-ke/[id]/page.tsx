import OwnerDashboard from './owner-dashboard';
export const metadata={title:'Thống kê địa điểm | 11Local',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;return <OwnerDashboard key={id} placeId={id}/>;
}

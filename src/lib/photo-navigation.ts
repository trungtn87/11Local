export type PhotoView = {kind:"album"|"place"|"milestone";id:string};

export function choosePhotoView(
  requestedView:string|undefined,
  groupId:string|undefined,
  photo:{albumId:string;placeId:string|null;milestoneId:string|null}
):PhotoView {
  if(requestedView==="place" && groupId && groupId===photo.placeId) return {kind:"place",id:groupId};
  if(requestedView==="milestone" && groupId && groupId===photo.milestoneId) return {kind:"milestone",id:groupId};
  return {kind:"album",id:photo.albumId};
}

export function photoHref(photoId:string,view:PhotoView):string {
  const path="/anh/"+encodeURIComponent(photoId);
  return view.kind==="album"?path:path+"?view="+view.kind+"&group="+encodeURIComponent(view.id);
}

export function galleryPosition(ids:readonly string[],currentId:string) {
  const index=ids.indexOf(currentId);
  return {
    position:index<0?0:index+1,
    total:ids.length,
    previousId:index>0?ids[index-1]:null,
    nextId:index>=0&&index<ids.length-1?ids[index+1]:null,
  };
}

export function horizontalSwipe(
  start:{x:number;y:number},end:{x:number;y:number}
):"previous"|"next"|null {
  const dx=end.x-start.x,dy=end.y-start.y;
  if(Math.abs(dx)<55||Math.abs(dx)<=Math.abs(dy)*1.35) return null;
  return dx>0?"previous":"next";
}

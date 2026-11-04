import {getCurrentUser} from "@/lib/user-auth";
import {db} from "@/lib/db";
import {isPlaceId} from "@/lib/owner-management-input";

export const noStore={"Cache-Control":"no-store"};
export const MAX_JSON_BYTES=12000;
export async function ownerSession(){
  const user=await getCurrentUser();
  return user&&isPlaceId(user.id)?user:null;
}
export async function ownershipRole(tx:ReturnType<typeof db>,placeId:string,userId:string){
  // Called after the place row is FOR UPDATE: permission revocation and edits
  // serialize on the same row. Google account must remain linked.
  const [row]=await tx`SELECT m.role FROM public.place_managers m
    JOIN public.users u ON u.id=m.user_id AND u.google_sub IS NOT NULL
    WHERE m.place_id=${placeId} AND m.user_id=${userId}
      AND m.status='active' AND m.role IN ('owner','manager') LIMIT 1`;
  return row?.role==="owner"||row?.role==="manager"?row.role as "owner"|"manager":null;
}
export async function requireOwnerPlace(tx:ReturnType<typeof db>,placeId:string,userId:string){
  const [place]=await tx`SELECT id,version,place_kind,moderation_status,visibility
    FROM public.places WHERE id=${placeId} FOR UPDATE`;
  if(!place)throw new Error("NOT_FOUND");
  const role=await ownershipRole(tx,placeId,userId);
  if(!role)throw new Error("FORBIDDEN");
  if(place.place_kind!=="business"||place.moderation_status!=="approved"
    ||place.visibility!=="visible")throw new Error("PLACE_NOT_EDITABLE");
  return {place,role};
}
export function errorStatus(code:string):number{
  if(["LOGIN_REQUIRED"].includes(code))return 401;
  if(["FORBIDDEN"].includes(code))return 403;
  if(["NOT_FOUND","PHOTO_NOT_FOUND"].includes(code))return 404;
  if(["STALE_VERSION","PENDING_REVISION","STALE_PLACE","INVALID_TRANSITION",
    "PHOTO_NOT_APPROVED","PLACE_NOT_EDITABLE","NO_CHANGES","PERMISSION_REVOKED",
    "ALREADY_REVIEWED","IMAGE_LIMIT"].includes(code))return 409;
  if(["REQUEST_TOO_LARGE"].includes(code))return 413;
  if(code.startsWith("INVALID_")||["FIELD_NOT_ALLOWED","REASON_REQUIRED"].includes(code))
    return 400;
  return 503;
}

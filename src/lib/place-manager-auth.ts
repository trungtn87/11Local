import {db} from "@/lib/db";
import {isActiveManager,isUuid} from "@/lib/ownership-input";
import {getCurrentUser} from "@/lib/user-auth";

/** Never trust a role in browser state or the signed user cookie alone. */
export async function getManagedPlaceRole(placeId:string):Promise<"owner"|"manager"|null>{
  if(!isUuid(placeId)) return null;
  const user=await getCurrentUser();
  if(!user || !isUuid(user.id)) return null;
  const [row]=await db()`SELECT pm.role,pm.status
    FROM public.place_managers pm
    JOIN public.users u ON u.id=pm.user_id AND u.google_sub IS NOT NULL
    WHERE pm.place_id=${placeId} AND pm.user_id=${user.id} LIMIT 1`;
  if(!row || !isActiveManager(row.role,row.status)) return null;
  return row.role as "owner"|"manager";
}

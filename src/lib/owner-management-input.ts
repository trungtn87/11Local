/** OWN-03: owner-edit allowlist. No admin-only fields (slug, location, category, visibility). */
import {isUuid} from "./ownership-input.ts";

export type OwnerField =
  "summary"|"description"|"address"|"phone"|"website_url"|"opening_hours"|"price_note";
export type OwnerChanges=Partial<Record<OwnerField,string|null>>;
export const OWNER_FIELDS:ReadonlyArray<OwnerField>=[
  "summary","description","address","phone","website_url","opening_hours","price_note",
];
const MAX:Record<OwnerField,number>={
  summary:350,description:5000,address:500,phone:40,
  website_url:500,opening_hours:500,price_note:300,
};
const REQUIRED=new Set<OwnerField>(["summary","description","address"]);
const CONTROL=/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u;
const asObject=(value:unknown):Record<string,unknown>=>{
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("INVALID_INPUT");
  return value as Record<string,unknown>;
};
export function parseOwnerEdit(value:unknown):{expectedVersion:number;changes:OwnerChanges}{
  const input=asObject(value);
  if(!Number.isSafeInteger(input.expectedVersion)||Number(input.expectedVersion)<1)
    throw new Error("INVALID_VERSION");
  const proposed=asObject(input.changes);
  const entries=Object.entries(proposed);
  if(!entries.length||entries.length>OWNER_FIELDS.length)throw new Error("INVALID_CHANGES");
  const changes:OwnerChanges={};
  for(const [key,raw] of entries){
    if(!OWNER_FIELDS.includes(key as OwnerField))throw new Error("FIELD_NOT_ALLOWED");
    const field=key as OwnerField;
    if(raw!==null&&typeof raw!=="string")throw new Error("INVALID_FIELD:"+field);
    if(raw===null&&REQUIRED.has(field))throw new Error("INVALID_FIELD:"+field);
    const text=typeof raw==="string"?raw.trim():null;
    if(text!==null&&(text.length>MAX[field]||CONTROL.test(text)))
      throw new Error("INVALID_FIELD:"+field);
    if(field==="address"&&(!text||text.length<3))throw new Error("INVALID_FIELD:"+field);
    if(field==="website_url"&&text){
      try{
        const url=new URL(text);
        if(!["https:","http:"].includes(url.protocol))throw new Error("bad protocol");
      }catch{throw new Error("INVALID_FIELD:"+field);}
    }
    changes[field]=REQUIRED.has(field)?text??"":text||null;
  }
  return {expectedVersion:Number(input.expectedVersion),changes};
}
export function parseOwnerPhotoAction(value:unknown):"cover"|"hide"{
  const input=asObject(value);
  if(input.action!=="cover"&&input.action!=="hide")throw new Error("INVALID_ACTION");
  return input.action;
}
export function parseOwnerContentDecision(value:unknown):{action:"approve"|"reject";note:string}{
  const input=asObject(value);
  if(input.action!=="approve"&&input.action!=="reject")throw new Error("INVALID_ACTION");
  const note=input.note===undefined?"":input.note;
  if(typeof note!=="string"||note.trim().length>1000||CONTROL.test(note))
    throw new Error("INVALID_NOTE");
  if(input.action==="reject"&&note.trim().length<5)throw new Error("REASON_REQUIRED");
  return {action:input.action,note:note.trim()};
}
export function isPlaceId(value:unknown):value is string{return isUuid(value);}
export function checkOrigin(request:Request):boolean{
  const origin=request.headers.get("origin");
  return !origin||origin===new URL(request.url).origin;
}

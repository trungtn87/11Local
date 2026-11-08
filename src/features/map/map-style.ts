export type StyleLayer={id:string;type:string;source?:string;"source-layer"?:string;[key:string]:unknown};
export type StyleSpec={layers:StyleLayer[];[key:string]:unknown};
const names=new Set(["poi","aerodrome_label"]);const ids=/^poi[_-]|[_-]poi([_-]|$)/;
export function isPoiLayer(layer:StyleLayer){return names.has(layer["source-layer"]||"")||ids.test(layer.id)||["landuse-hospital","landuse-school"].includes(layer.id);}
export function sanitizeStyle<T extends StyleSpec>(style:T):T{return {...style,layers:style.layers.filter(x=>!isPoiLayer(x))};}
export async function loadCleanStyle(url:string,fetcher:typeof fetch=fetch):Promise<StyleSpec|string>{try{const r=await fetcher(url);if(!r.ok)return url;const v=await r.json() as StyleSpec;return Array.isArray(v.layers)?sanitizeStyle(v):url;}catch{return url;}}

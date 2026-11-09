const FALLBACK="https://gaufamily.io.vn";
export function publicSiteOrigin(){try{const u=new URL(process.env.SITE_URL||FALLBACK);if(u.protocol==="https:"||(u.protocol==="http:"&&["localhost","127.0.0.1"].includes(u.hostname)))return u.origin;}catch{}return FALLBACK;}
export function absolutePublicUrl(path:string){return new URL(path,publicSiteOrigin()).toString();}

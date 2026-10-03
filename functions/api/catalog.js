// HOTSEA Cloudflare Pages Function — clean rebuild 2026-10-03
// Explicit approval is required for every external Eporner video.
export const BUILD_VERSION = 'hotsea-rebuild-2026-10-03-v1';
const EPORNER = 'www.eporner.com';
const MAX_ITEMS = 100;
const ALLOWED_EMBEDS = new Set([
  'www.eporner.com','www.youtube.com','www.youtube-nocookie.com',
  'player.vimeo.com','www.pornhub.com','www.xvideos.com',
  'xhamster.com','www.xhamster.com','www.redgifs.com','redgifs.com'
]);
const noStore = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
function output(data, status=200) {
  return Response.json({build:BUILD_VERSION,...data},{status,headers:noStore});
}
function secureUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol!=='https:' || url.username || url.password) return null;
    return url;
  } catch { return null; }
}
function embedUrl(value) {
  const url=secureUrl(value);
  if (!url || !ALLOWED_EMBEDS.has(url.hostname)) return null;
  if (url.hostname===EPORNER) {
    return /^\/embed\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname) && !url.search && !url.hash ? url.href : null;
  }
  if (['www.youtube.com','www.youtube-nocookie.com'].includes(url.hostname)) {
    return /^\/embed\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname) ? url.href : null;
  }
  if (url.hostname==='player.vimeo.com') {
    return /^\/video\/[0-9]+\/?$/.test(url.pathname) ? url.href : null;
  }
  return /^\/(embed|video\/embed|embedframe|iframe|ifr|video)\//.test(url.pathname) ? url.href : null;
}
function normalize(video, isEporner, allowedIds) {
  if (!video || typeof video !== 'object') return null;
  const id=String(video.id??'').trim();
  if (!id) return null;
  if (isEporner) {
    if (!allowedIds.has(id)) return null;
  } else if (video.verifiedAdults!==true || video.embeddingAllowed!==true) {
    return null;
  }
  const player=embedUrl(isEporner ? video.embed : video.embedUrl);
  if (!player) return null;
  const thumbUrl=secureUrl(isEporner ? (video.default_thumb?.src || video.thumbs?.[0]?.src) : video.thumbnail);
  const keywords=String(video.keywords || '').split(',').map(x=>x.trim()).filter(Boolean);
  return {
    id:id.slice(0,100),
    title:String(video.title||'Untitled video').slice(0,150),
    description:String(video.description||'').slice(0,500),
    category:String(isEporner ? (keywords[0]||'Videos') : (video.category||'Videos')).slice(0,45),
    duration:String(isEporner ? (video.length_min||'Video') : (video.duration||'Video')).slice(0,25),
    source:isEporner?'Eporner':String(video.source||'Partner').slice(0,50),
    embedUrl:player,
    thumbnail:thumbUrl?.href || null
  };
}
export async function onRequestGet({env}) {
  const feed=String(env.HOTSEA_FEED_URL||'').trim();
  if (!feed) return output({status:'unconfigured',items:[],message:'Set HOTSEA_FEED_URL in the Cloudflare Production environment.'});
  const url=secureUrl(feed);
  if (!url) return output({status:'error',items:[],message:'HOTSEA_FEED_URL must be HTTPS.'},400);
  const isEporner=url.hostname===EPORNER && url.pathname==='/api/v2/video/search/';
  const otherHosts=String(env.HOTSEA_ALLOWED_FEED_HOSTS||'').split(',').map(x=>x.trim().toLowerCase());
  if (!isEporner && !otherHosts.includes(url.hostname)) return output({status:'error',items:[],message:'Feed host is not on the approved allowlist.'},400);
  try {
    const headers={Accept:'application/json'};
    if (env.HOTSEA_FEED_TOKEN) headers.Authorization='Bearer '+env.HOTSEA_FEED_TOKEN;
    const r=await fetch(url.href,{headers,redirect:'error',signal:AbortSignal.timeout(9000)});
    if (!r.ok) return output({status:'upstream_error',items:[],httpStatus:r.status,message:'Upstream feed HTTP '+r.status},502);
    const contentType=r.headers.get('content-type')||'';
    const bodyText=await r.text();
    let data;
    try {data=JSON.parse(bodyText);} catch {
      const html=/^\s*<(?:!doctype|html|head|body)/i.test(bodyText);
      return output({status:'upstream_error',items:[],message:html?'Provider returned HTML, not JSON. Contact the provider for permitted server-side API access.':'Provider returned invalid JSON.',provider:url.hostname,contentType,responseType:html?'HTML':'Other'},502);
    }
    const raw=Array.isArray(data)?data:(isEporner?data?.videos:data?.items);
    if (!Array.isArray(raw)) return output({status:'error',items:[],message:'Feed JSON must include a videos/items array.'},502);
    const allowedIds=new Set(String(env.HOTSEA_APPROVED_VIDEO_IDS||'').split(',').map(x=>x.trim()).filter(Boolean));
    const items=raw.slice(0,MAX_ITEMS).map(v=>normalize(v,isEporner,allowedIds)).filter(Boolean);
    return output({status:'ok',source:isEporner?'Eporner':'Authorized feed',items,received:raw.length,published:items.length,updatedAt:new Date().toISOString()});
  } catch(err) {
    return output({status:'error',items:[],message:err instanceof Error?err.message:'Feed request failed'},502);
  }
}

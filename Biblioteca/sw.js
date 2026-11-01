importScripts('./shared/offline-files.js');
const CACHE='qvc-shell-'+self.QVC_CACHE_VERSION;
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(self.QVC_OFFLINE_FILES)))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('qvc-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting()});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);const known=await cache.match(event.request,{ignoreSearch:true});
    if(known)return known;
    try{return await fetch(event.request)}catch{
      if(event.request.mode==='navigate')return (await cache.match(new URL('./index.html',self.location.href)))||Response.error();
      return Response.error();
    }
  })());
});

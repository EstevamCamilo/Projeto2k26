/** Armazenamento versionado; tratamento de falhas em navegação privada. */
const PREFIX='calchub:v1:';
function get(key, fallback){try{const raw=localStorage.getItem(PREFIX+key);return raw===null?fallback:JSON.parse(raw)}catch{return fallback}}
function set(key,value){try{localStorage.setItem(PREFIX+key,JSON.stringify(value));return true}catch{return false}}
export const storage={
 getTheme:()=>get('theme',null),setTheme:v=>set('theme',v),
 favorites:()=>get('favorites',[]),setFavorites:v=>set('favorites',v),
 history:()=>get('history',[]),clearHistory:()=>set('history',[]),
 stats:()=>get('stats',{}),memory:()=>get('memory',0),setMemory:v=>set('memory',v),
 addHistory(entry){const rows=get('history',[]);rows.unshift({id:Date.now()+Math.random(),date:new Date().toISOString(),...entry});set('history',rows.slice(0,200))},
 track(id){const s=get('stats',{});s[id]=(s[id]||0)+1;set('stats',s)},
 total(){return Object.values(get('stats',{})).reduce((a,b)=>a+b,0)}
};

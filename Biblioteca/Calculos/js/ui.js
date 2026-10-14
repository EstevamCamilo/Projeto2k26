/** UI: ícones SVG fallback, elementos seguros, toasts e diálogos. */
export function escapeHTML(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const paths={
 'layout-dashboard':'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
 'calculator':'<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 10h2m4 0h2M8 14h2m4 0h2M8 18h2m4 0h2"/>',
 'flask-conical':'<path d="M9 3h6M10 3v7L4.8 19a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 10V3M7 15h10"/>',
 'graduation-cap':'<path d="m2 10 10-5 10 5-10 5-10-5Zm5 3v5c3 2 7 2 10 0v-5M22 10v7"/>',
 'wallet':'<rect x="2" y="6" width="20" height="15" rx="2"/><path d="M16 13h6M2 9V5a2 2 0 0 1 2-2h15"/>',
 'star':'<path d="m12 2 3 6.6 7 1-5 4.9 1.3 7L12 18l-6.3 3.5 1.3-7-5-4.9 7-1z"/>',
 'history':'<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l4 2"/>',
 'settings':'<circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 'search':'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
 'moon':'<path d="M20 16.4A9 9 0 0 1 7.6 4 9 9 0 1 0 20 16.4Z"/>',
 'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 'circle-help':'<circle cx="12" cy="12" r="10"/><path d="M9.3 9a3 3 0 0 1 5.5 1.5c0 2-2.8 2.3-2.8 4M12 17.5h.01"/>',
 'chevron-right':'<path d="m9 18 6-6-6-6"/>','arrow-right':'<path d="M5 12h14m-6-6 6 6-6 6"/>','arrow-left':'<path d="M19 12H5m6-6-6 6 6 6"/>',
 'menu':'<path d="M4 6h16M4 12h16M4 18h16"/>','x':'<path d="M18 6 6 18M6 6l12 12"/>',
 'sparkles':'<path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8zM19 18l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>',
 'calendar-days':'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M7 14h2m4 0h2m-8 4h2"/>',
 'check-circle':'<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
 'copy':'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
 'download':'<path d="M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3"/>',
 'refresh-cw':'<path d="M20 7v5h-5M4 17v-5h5M6 9a7 7 0 0 1 12-2l2 5M4 12l2 5a7 7 0 0 0 12-2"/>',
 'trash-2':'<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6m4-6v6"/>',
 'check':'<path d="m4 12 5 5L20 6"/>',
 'function-square':'<rect x="2" y="2" width="20" height="20" rx="3"/><path d="M15 6c-4-1-5 4-5 6s-1 5-4 5M7 12h9"/>',
 'thermometer':'<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0ZM12 11v6"/>',
 'grid-3x3':'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 'hash':'<path d="M4 9h16M3 15h16M10 3 7 21M17 3l-3 18"/>',
 'shapes':'<circle cx="17" cy="7" r="4"/><path d="M3 21v-9h9v9zM15 21l4-7 4 7z"/>',
 'ruler':'<path d="M3 7 7 3l14 14-4 4L3 7Zm5 0 2 2m1 1 2 2m1 1 2 2"/>',
 'box':'<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5m-9 5L3 7m9 5v10"/>',
 'repeat':'<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/>',
 'percent':'<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M20 4 4 20"/>',
 'trending-up':'<path d="m2 18 7-7 4 4 9-9M16 6h6v6"/>',
 'activity':'<path d="M3 12h4l3-8 4 16 3-8h4"/>',
 'git-compare':'<path d="M4 5h13m-4-4 4 4-4 4M20 19H7m4-4-4 4 4 4"/>',
 'equal':'<path d="M4 9h16M4 15h16"/>',
 'chart-no-axes-combined':'<path d="M3 3v18h18M6 16l5-5 4 2 5-8"/>',
 'bar-chart-3':'<path d="M3 3v18h18M7 17v-5m6 5V7m6 10V4"/>',
 'sigma':'<path d="M18 4H6l7 8-7 8h12"/>',
 'layers':'<path d="m12 2 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5M3 17l9 5 9-5"/>',
 'superscript':'<path d="m4 19 9-12m-9 0 9 12M16 5a3 3 0 1 1 6 0c0 2-6 4-6 7h6"/>',
 'heart-pulse':'<path d="M20.5 4.7a5.6 5.6 0 0 0-7.9 0l-.6.6-.6-.6a5.6 5.6 0 0 0-7.9 7.9L12 21l8.5-8.4a5.6 5.6 0 0 0 0-7.9ZM3 12h5l2-3 3 6 2-3h6"/>',
 'clock-3':'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
 'info':'<circle cx="12" cy="12" r="10"/><path d="M12 11v6m0-10v.01"/>',
 'list-filter':'<path d="M4 7h16M7 12h10m-7 5h4"/>',
 'file-text':'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8m-8 4h8"/>',
 'image':'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m21 15-5-5L5 21"/>',
 'move-horizontal':'<path d="M2 12h20m-5-5 5 5-5 5M7 7l-5 5 5 5"/>',
 'square-root':'<path d="M2 13h4l3 8 5-18h8"/>',
 'pi':'<path d="M4 7h16M9 7c0 9-1 10-3 10m11-10v7c0 3 1 3 3 3"/>',
 'circle-dot':'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>',
 'alert-circle':'<circle cx="12" cy="12" r="10"/><path d="M12 7v6m0 4v.01"/>',
 'rotate-ccw':'<path d="M3 11a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>'
};
export function icon(name,cls=''){const path=paths[name]||paths['circle-dot'];return `<svg class="icon-svg ${escapeHTML(cls)}" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`}
export function hydrateIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{const name=el.getAttribute('data-icon');el.innerHTML=icon(name)})}
export function toast(message,type='success'){const stack=document.querySelector('#toast-stack');const n=document.createElement('div');n.className='toast '+(type==='error'?'error':'');n.innerHTML=icon(type==='error'?'alert-circle':'check-circle')+`<span>${escapeHTML(message)}</span>`;stack.append(n);setTimeout(()=>{n.style.opacity='0';n.style.transition='opacity .25s';setTimeout(()=>n.remove(),250)},3200)}
export function dialog(title,html){const layer=document.querySelector('#modal-layer');layer.innerHTML=`<div class="dialog-backdrop" role="presentation"><section class="dialog" role="dialog" aria-modal="true" aria-label="${escapeHTML(title)}"><div class="dialog-header"><h2>${escapeHTML(title)}</h2><button class="icon-button close-dialog" aria-label="Fechar">${icon('x')}</button></div><div class="dialog-copy">${html}</div></section></div>`;const close=()=>layer.replaceChildren();layer.querySelector('.close-dialog').addEventListener('click',close);layer.querySelector('.dialog-backdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)close()});const handle=e=>{if(e.key==='Escape'){close();document.removeEventListener('keydown',handle)}};document.addEventListener('keydown',handle);layer.querySelector('.close-dialog').focus()}
export function formatNumber(n,max=6){if(typeof n==='string')return n;if(!Number.isFinite(n))return 'Indefinido';return new Intl.NumberFormat('pt-BR',{maximumFractionDigits:max}).format(Object.is(n,-0)?0:n)}
export function money(n){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2}).format(n)}
export function drawShape(shape,threeD=false){const S='stroke="#988cff" stroke-width="2.7" fill="rgba(125,110,255,.13)" stroke-linejoin="round" stroke-linecap="round"';const f={triangulo:`<polygon points="125,20 35,156 215,156" ${S}/>`,retangulo:`<rect x="35" y="49" width="180" height="105" rx="3" ${S}/>`,quadrado:`<rect x="70" y="35" width="120" height="120" rx="3" ${S}/>`,trapezio:`<polygon points="84,38 174,38 216,155 35,155" ${S}/>`,losango:`<polygon points="125,18 219,95 125,173 31,95" ${S}/>`,paralelogramo:`<polygon points="81,46 225,46 176,155 32,155" ${S}/>`,circulo:`<circle cx="125" cy="95" r="72" ${S}/>`,elipse:`<ellipse cx="125" cy="96" rx="103" ry="65" ${S}/>`,poligono:`<polygon points="125,15 194,46 213,117 163,172 87,172 37,117 56,46" ${S}/>`,cubo:`<path d="M80 42 165 42 213 85 125 86 80 42 80 132 125 181 213 135 213 85M125 86v95M165 42v91l-40 48" ${S}/>`,cone:`<ellipse cx="125" cy="157" rx="75" ry="24" ${S}/><path d="M125 15 50 157M125 15l75 142" ${S}/>`,cilindro:`<ellipse cx="125" cy="39" rx="68" ry="25" ${S}/><path d="M57 39v120c0 34 136 34 136 0V39M57 159c0-34 136-34 136 0" ${S}/>`,esfera:`<circle cx="125" cy="95" r="77" ${S}/><ellipse cx="125" cy="95" rx="32" ry="77" stroke="#988cff" stroke-width="1.4" fill="none"/><ellipse cx="125" cy="95" rx="77" ry="26" stroke="#988cff" stroke-width="1.4" fill="none"/>`,prisma:`<path d="M75 47h105l37 35H111L75 47v94l36 39h106V82M111 82v98M180 47v95l37 38" ${S}/>`,piramide:`<path d="M123 20 43 146l85 39 80-40-85-125M43 146l165-1M123 20l5 165" ${S}/>`,paralelepipedo:`<path d="M43 65h133l37 35H81L43 65v80l38 36h132v-81M81 100v81M176 65v80l37 36" ${S}/>`};return `<svg viewBox="0 0 250 200" width="280" height="210" role="img" aria-label="Ilustração ${threeD?'tridimensional':'geométrica'} de ${escapeHTML(shape)}">${f[shape]||f.quadrado}</svg>`}
export async function copyText(text){try{await navigator.clipboard.writeText(String(text));toast('Resultado copiado!')}catch{const ta=document.createElement('textarea');ta.value=String(text);document.body.append(ta);ta.select();document.execCommand('copy');ta.remove();toast('Resultado copiado!')}}

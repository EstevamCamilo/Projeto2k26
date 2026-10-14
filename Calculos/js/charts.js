/** Gráficos progressivos: Chart.js se disponível; SVG escalável em modo offline. */
import {escapeHTML,formatNumber} from './ui.js';
let live=[];
export function destroyCharts(){live.forEach(c=>{try{c.destroy()}catch{}});live=[]}
export function drawChart(target,{labels=[],datasets=[],type='line',xTitle='',yTitle=''}){
 const el=typeof target==='string'?document.querySelector(target):target;if(!el)return;
 const colors=['#8b83ff','#54c8e5','#59d6a1','#ffbe7f'];
 if(window.Chart){
  const canvas=document.createElement('canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`${escapeHTML(xTitle||'Gráfico')} com ${labels.length} pontos`);el.replaceChildren(canvas);
  const theme=getComputedStyle(document.documentElement),soft=theme.getPropertyValue('--text-soft').trim()||'#a4adc1',grid=theme.getPropertyValue('--chart-grid').trim()||'#293349';
  const chart=new window.Chart(canvas,{type,data:{labels,datasets:datasets.map((d,i)=>({label:d.label||`Série ${i+1}`,data:d.data,borderColor:colors[i%colors.length],backgroundColor:type==='bar'?colors[i%colors.length]+'bb':colors[i%colors.length]+'20',tension:.28,pointRadius:labels.length>75?0:2,pointHoverRadius:5,fill:type==='line'&&i===0,borderWidth:2.5}))},options:{animation:{duration:350},responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:datasets.length>1,labels:{color:soft,font:{family:'DM Sans',size:11}}},tooltip:{backgroundColor:'#171c2a',padding:12,displayColors:true}},scales:{x:{grid:{color:grid+'55'},ticks:{color:soft,maxTicksLimit:10,font:{size:10}},title:{display:!!xTitle,text:xTitle,color:soft,font:{size:11}}},y:{grid:{color:grid},ticks:{color:soft,maxTicksLimit:7,font:{size:10}},title:{display:!!yTitle,text:yTitle,color:soft,font:{size:11}}}}}});live.push(chart);return;
 }
 // Sem rede: gráfico SVG local conserva o valor pedagógico dos dados.
 const W=850,H=290,L=64,R=25,T=18,B=45;const every=datasets.flatMap(s=>s.data).map(Number).filter(Number.isFinite);if(!every.length){el.textContent='Não há dados para o gráfico.';return}
 let min=Math.min(...every),max=Math.max(...every);if(min===max){min-=Math.abs(min||1)*.2;max+=Math.abs(max||1)*.2}const space=(max-min)*.13;min-=space;max+=space;
 const px=i=>L+i/(Math.max(labels.length-1,1))*(W-L-R),py=v=>T+(max-v)/(max-min)*(H-T-B);
 const grid=Array.from({length:5},(_,i)=>{const y=T+i*(H-T-B)/4,v=max-(max-min)*i/4;return `<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="var(--chart-grid)" stroke-width="1"/><text x="${L-9}" y="${y+4}" font-size="11" fill="var(--muted)" text-anchor="end">${escapeHTML(formatNumber(v,2))}</text>`}).join('');
 const tick=labels.map((label,i)=>({label,i})).filter((_,i)=>i%(Math.ceil(labels.length/9)||1)===0).map(({label,i})=>`<text x="${px(i)}" y="${H-16}" text-anchor="middle" font-size="10" fill="var(--muted)">${escapeHTML(label)}</text>`).join('');
 const shapes=datasets.map((ds,j)=>{const col=colors[j%colors.length];return type==='bar'?ds.data.map((v,i)=>`<rect x="${px(i)-Math.max(2,Math.min(13,360/labels.length))/2}" y="${py(Math.max(v,min))}" width="${Math.max(2,Math.min(13,360/labels.length))}" height="${Math.abs(py(v)-py(min))}" rx="2" fill="${col}"/>`).join(''):`<polyline fill="none" stroke="${col}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" points="${ds.data.map((v,i)=>`${px(i)},${py(v)}`).join(' ')}"/>`}).join('');
 el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de ${escapeHTML(yTitle||'valores')} versus ${escapeHTML(xTitle||'pontos')}"><title>${escapeHTML(yTitle)} por ${escapeHTML(xTitle)}</title>${grid}${tick}${shapes}</svg>`;
}
export function parabolaSeries({a,b,c,vertex,roots}){const spread=Math.max(3,Math.abs(vertex.x)*.5+3,...roots.map(x=>Math.abs(x-vertex.x)+2));const center=vertex.x;const labels=[],data=[];for(let i=0;i<=90;i++){const x=center-spread+2*spread*i/90;labels.push(Number(x.toFixed(2)));data.push(a*x*x+b*x+c)}return {labels,datasets:[{label:'f(x)',data}]}}

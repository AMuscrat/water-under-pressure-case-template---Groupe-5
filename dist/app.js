const $ = (s) => document.querySelector(s);
const state = { rows: [], selected: null, comparison: [], layer: 'composite', zoom: 1, x: 0, y: 0 };
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => n == null ? '—' : n.toFixed(1);
const color = n => n == null ? '#d7dfe3' : ['#68c5a3','#b7d995','#f4d178','#e78b6b','#c84e5a'][Math.min(4, Math.floor(n / 20))];
const risk = n => n == null ? 'Incomplete data' : n < 25 ? 'Lower relative risk' : n < 50 ? 'Moderate relative risk' : n < 75 ? 'Elevated relative risk' : 'Higher relative risk';
const score = r => r[state.layer + '_score'];
const match = r => (!$('#country').value || r.country_code === $('#country').value) && `${r.name} ${r.code} ${r.country}`.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().includes($('#search').value.trim().normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase());
function filtered() {
  const rows = state.rows.filter(match);
  return rows.sort((a,b) => {if ($('#sort').value === 'name') return a.name.localeCompare(b.name); if (score(a) == null) return score(b) == null ? a.name.localeCompare(b.name) : 1; if (score(b) == null) return -1; return ($('#sort').value === 'high' ? score(b)-score(a) : score(a)-score(b)) || a.name.localeCompare(b.name);});
}
function renderList() {
  const rows = filtered();
  $('#count').textContent = `${rows.length} regions`;
  $('#region-list').innerHTML = rows.length ? rows.map(r => `<button class="region-row ${state.selected === r.code ? 'active' : ''}" data-code="${r.code}" aria-pressed="${state.selected === r.code}"><span><strong>${escapeHTML(r.name)}</strong><small>${escapeHTML(r.country)} · ${r.code}</small></span><span class="score-chip" style="--color:${color(score(r))}">${fmt(score(r))}</span></button>`).join('') : '<p class="empty" style="padding:18px">No matching regions. Try another name or country.</p>';
  document.querySelectorAll('#geography path').forEach(p => {const r=state.rows.find(r=>r.code===p.dataset.code); p.classList.toggle('dimmed',!match(r));p.classList.toggle('selected',state.selected===r.code);p.setAttribute('fill',score(r)==null?'url(#no-data)':color(score(r)));});
}
function select(code) {state.selected = code; renderList(); renderDetail();}
function renderDetail() {
  const r=state.rows.find(r=>r.code===state.selected); if(!r)return;
  const metric=(label,key,raw)=>`<div class="metric"><div class="metric-title"><span>${label}</span><strong>${fmt(r[key+'_score'])} <span class="muted">/ 100</span></strong></div><div class="bar"><span style="width:${r[key+'_score']??0}%"></span></div><small>${raw}</small></div>`;
  $('#detail').innerHTML=`<div class="detail-top"><p class="eyebrow">REGION PROFILE · ${r.code}</p><h2>${escapeHTML(r.name)}</h2><p class="location">${escapeHTML(r.country)} · NUTS 2</p><div class="big-score"><strong>${fmt(r.composite_score)}</strong><span>/ 100</span></div><p class="risk-label" style="--color:${color(r.composite_score)}">${risk(r.composite_score)}</p></div>${metric('Water stress · 40%','structural',`${fmt(r.structural_raw)}% WEI+ · national proxy<br>Four-year average, ${r.structural_year??'no observation'}${r.structural_flag?' · source flag '+escapeHTML(r.structural_flag):''}`)}${metric('Drought severity · 30%','drought',`${fmt(r.drought_raw)} / 3 severity · 11 Aug 2026<br>${Math.round(r.drought_coverage*100)}% valid regional grid coverage`)}${metric('Irrigation dependency · 30%','irrigation',`${fmt(r.irrigation_raw)}% of agricultural area irrigated<br>National proxy · ${r.irrigation_year??'no observation'}${r.irrigation_flag?' · source flag '+escapeHTML(r.irrigation_flag):''}`)}<p class="detail-note">${r.composite_score==null?'A required input is missing. This region is excluded from the composite ranking.':'Water stress and irrigation are shared by all regions in this country. Use this as an initial screening signal.'}</p><button id="add-comparison" class="primary" ${state.comparison.includes(r.code)||state.comparison.length>=5?'disabled':''}>${state.comparison.includes(r.code)?'Added to comparison ✓':state.comparison.length>=5?'Comparison full (5 regions)':'Add to comparison +'}</button>`;
  $('#add-comparison').onclick=()=>{state.comparison.push(r.code);renderComparison();renderDetail();};
}
function renderComparison(){
  const rows=state.comparison.map(code=>state.rows.find(r=>r.code===code));
  $('#compare-count').textContent=`${rows.length} / 5`;$('#export').disabled=!rows.length;$('#clear').disabled=!rows.length;
  if(!rows.length){$('#comparison-content').innerHTML='<p class="empty">Select a region, then choose “Add to comparison”. Add at least two to see the trade-offs.</p>';return;}
  const metrics=[['Composite risk','composite_score'],['Water stress · 40%','structural_score'],['Drought severity · 30%','drought_score'],['Irrigation dependency · 30%','irrigation_score']];
  $('#comparison-content').innerHTML=`${rows.length===1?'<p class="status-note">Add one more region to compare.</p>':''}<div class="table-scroll"><table><thead><tr><th>Normalized score / 100</th>${rows.map(r=>`<th>${escapeHTML(r.name)}<small>${escapeHTML(r.country)} · ${r.code}</small><button class="remove" data-remove="${r.code}">Remove</button></th>`).join('')}</tr></thead><tbody>${metrics.map(([label,key])=>`<tr><td>${label}</td>${rows.map(r=>`<td><strong>${fmt(r[key])}</strong></td>`).join('')}</tr>`).join('')}<tr><td>Observation dates<br><small>WEI+ / CDI / irrigation</small></td>${rows.map(r=>`<td>${r.structural_year??'—'} / ${r.drought_date} / ${r.irrigation_year??'—'}</td>`).join('')}</tr><tr><td>Geographic limitation</td>${rows.map(()=>'<td>National WEI+ and irrigation proxies</td>').join('')}</tr></tbody></table></div>`;
}
function exportCSV(){
  const keys=['code','name','country','composite_score','structural_score','drought_score','irrigation_score','structural_raw','structural_year','drought_raw','drought_date','drought_coverage','irrigation_raw','irrigation_year','input_geography'];
  const cell=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
  const csv=[keys.map(cell).join(','),...state.comparison.map(code=>{const r=state.rows.find(r=>r.code===code);return keys.map(k=>cell(r[k])).join(',');})].join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='farmland-water-risk-comparison.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
// A dependency-free geographic map. Mercator view with drag and zoom; list is keyboard equivalent.
const project=([lon,lat])=>[(lon+14)*14,700-(Math.log(Math.tan(Math.PI/4+Math.max(-80,Math.min(80,lat))*Math.PI/360))-0.57)*430];
function geometryPath(g){const polygons=g.type==='Polygon'?[g.coordinates]:g.coordinates;return polygons.map(poly=>poly.map(ring=>ring.map((pt,i)=>`${i?'L':'M'}${project(pt).map(v=>v.toFixed(2)).join(',')}`).join('')+'Z').join('')).join('');}
function transformMap(){$('#geography').setAttribute('transform',`translate(${state.x} ${state.y}) scale(${state.zoom})`);}
function zoom(factor){const next=Math.max(.7,Math.min(8,state.zoom*factor));const ratio=next/state.zoom;state.x=380-(380-state.x)*ratio;state.y=350-(350-state.y)*ratio;state.zoom=next;transformMap();}
async function init(){
 try{
  const responses=await Promise.all([fetch('data/regions_scored.json'),fetch('data/regions.geojson')]);if(responses.some(r=>!r.ok))throw Error('Data request failed');const [data,geo]=await Promise.all(responses.map(r=>r.json()));state.rows=data.regions;
  const countries=[...new Map(state.rows.map(r=>[r.country_code,r.country])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  for(const [code,name]of countries){const option=document.createElement('option');option.value=code;option.textContent=name;$('#country').append(option);}
  const ns='http://www.w3.org/2000/svg';for(const f of geo.features){const r=state.rows.find(r=>r.code===f.properties.NUTS_ID);const p=document.createElementNS(ns,'path');p.dataset.code=r.code;p.setAttribute('d',geometryPath(f.geometry));p.setAttribute('fill-rule','evenodd');p.setAttribute('tabindex','0');p.setAttribute('role','button');p.setAttribute('aria-label',`${r.name}, ${r.country}, composite risk ${fmt(r.composite_score)}`);const title=document.createElementNS(ns,'title');title.textContent=`${r.name} · ${fmt(r.composite_score)} / 100`;p.append(title);$('#geography').append(p);}
  select(state.rows.find(r=>r.code==='ES61')?.code??state.rows[0].code);renderComparison();registerAgentTools();
 }catch(error){$('#region-list').innerHTML='<p class="error">The data could not load. Please reload the page, or serve this folder over HTTP if running locally.</p>';$('#count').textContent='Unavailable';console.error(error);}
}
$('#region-list').onclick=e=>{const b=e.target.closest('[data-code]');if(b)select(b.dataset.code);};
let drag=null,moved=false;
$('#map').onpointerdown=e=>{const rect=$('#map').getBoundingClientRect();drag={px:e.clientX,py:e.clientY,x:state.x,y:state.y,scale:Math.max(760/rect.width,700/rect.height)};moved=false;};
$('#map').onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.px,dy=e.clientY-drag.py;if(Math.abs(dx)+Math.abs(dy)>5)moved=true;state.x=drag.x+dx*drag.scale;state.y=drag.y+dy*drag.scale;transformMap();};
window.addEventListener('pointerup',()=>{drag=null;});$('#map').onpointercancel=()=>{drag=null;};
$('#map').onclick=e=>{if(!moved&&e.target.dataset.code)select(e.target.dataset.code);};
$('#map').onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.dataset.code){e.preventDefault();select(e.target.dataset.code);}};
$('#zoom-in').onclick=()=>zoom(1.35);$('#zoom-out').onclick=()=>zoom(1/1.35);$('#reset-map').onclick=()=>{state.zoom=1;state.x=state.y=0;transformMap();};
$('#search').oninput=renderList;$('#country').onchange=renderList;$('#sort').onchange=renderList;
$('#layer').onchange=()=>{state.layer=$('#layer').value;$('#legend-title').textContent=$('#layer').selectedOptions[0].text;renderList();};
$('#comparison-content').onclick=e=>{const b=e.target.closest('[data-remove]');if(b){state.comparison=state.comparison.filter(c=>c!==b.dataset.remove);renderComparison();renderDetail();}};
$('#clear').onclick=()=>{state.comparison=[];renderComparison();renderDetail();};$('#export').onclick=exportCSV;
function registerAgentTools(){
 const context=document.modelContext;if(!context?.registerTool)return;
 const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
 try{Promise.resolve(context.registerTool({name:'compare_water_risk_regions',description:'Replace the visible shortlist with two to five EU NUTS2 region codes and return their water-risk scores.',inputSchema:{type:'object',properties:{codes:{type:'array',items:{type:'string'},minItems:2,maxItems:5,uniqueItems:true}},required:['codes'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){if(!input||!Array.isArray(input.codes)||input.codes.length<2||input.codes.length>5||new Set(input.codes).size!==input.codes.length||input.codes.some(code=>!state.rows.some(r=>r.code===code)))throw Error('Provide two to five distinct valid NUTS2 codes.');state.comparison=[...input.codes];renderComparison();renderDetail();return state.comparison.map(code=>{const r=state.rows.find(r=>r.code===code);return {code,name:r.name,score:r.composite_score,limitation:r.input_geography};});}},{signal:lifecycle.signal})).catch(console.warn);}catch(error){console.warn(error);}
}
init();

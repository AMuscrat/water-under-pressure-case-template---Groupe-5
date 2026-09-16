const crops = [
  { id: 'olive', name: 'Olive', note: 'Resilient anchor crop', demand: 5400, yield: 8.8, efficiency: 92, mix: 58 },
  { id: 'citrus', name: 'Citrus', note: 'High-value, higher demand', demand: 9200, yield: 9.4, efficiency: 68, mix: 27 },
  { id: 'veg', name: 'Vegetables', note: 'Flexible summer block', demand: 6900, yield: 8.1, efficiency: 76, mix: 15 }
];

const regions = {
  andalusia: { name:'Andalusia', country:'Spain', summary:'Severe water pressure', note:'A dry winter and constrained reservoir storage are tightening summer allocations.', rainfall:186, rainfallNormalDelta:-38, rainfallMonthly:[74,52,32,18,7,3], rainfallStatus:'red', waterTrend:[42,40,38,36,34,31,29], reservoir:29, reservoirTrend:'falling', reservoirStatus:'red', drought:4.4, droughtLabel:'Severe · allocation risk', droughtStatus:'red', soil:21, soilLabel:'Root-zone estimate · very low', soilStatus:'red', irrigation:4100000, irrigationCoverage:64, irrigationLabel:'Cooperative allocation · constrained', irrigationStatus:'yellow', overallStatus:'red', overallLabel:'Severe drought', resourceLabel:'Critical', stress:5, location:'Seville, Spain' },
  puglia: { name:'Puglia', country:'Italy', summary:'Elevated seasonal pressure', note:'Patchy spring rain has slowed recharge, while storage remains adequate for prioritised crops.', rainfall:264, rainfallNormalDelta:-19, rainfallMonthly:[91,68,49,31,17,8], rainfallStatus:'yellow', waterTrend:[44,45,44,46,47,46,46], reservoir:46, reservoirTrend:'stable', reservoirStatus:'yellow', drought:3.1, droughtLabel:'Moderate · monitor demand', droughtStatus:'yellow', soil:34, soilLabel:'Root-zone estimate · below target', soilStatus:'yellow', irrigation:5200000, irrigationCoverage:78, irrigationLabel:'Cooperative allocation · adequate', irrigationStatus:'yellow', overallStatus:'yellow', overallLabel:'Moderate drought', resourceLabel:'Watch', stress:3, location:'Bari, Italy' },
  algarve: { name:'Algarve', country:'Portugal', summary:'Manageable water position', note:'A wetter start to the year has supported storage and soil moisture ahead of peak irrigation.', rainfall:318, rainfallNormalDelta:-8, rainfallMonthly:[112,83,56,37,20,10], rainfallStatus:'green', waterTrend:[48,51,54,56,58,60,62], reservoir:62, reservoirTrend:'recovering', reservoirStatus:'green', drought:2.2, droughtLabel:'Low · normal monitoring', droughtStatus:'green', soil:43, soilLabel:'Root-zone estimate · healthy', soilStatus:'green', irrigation:6100000, irrigationCoverage:92, irrigationLabel:'Cooperative allocation · comfortable', irrigationStatus:'green', overallStatus:'green', overallLabel:'Low drought', resourceLabel:'Stable', stress:2, location:'Faro, Portugal' }
};

const state = { region:'andalusia', water:4100000, area:420, stress:5, focus:'balanced', live:null, coords:null };
const stressNames=['Very low','Low','Moderate','High','Severe'];
const qs=(selector)=>document.querySelector(selector);
const statusColors={green:'#4f9563',yellow:'#d49a2f',red:'#c95d46'};

function formatNumber(n){return Math.round(n).toLocaleString('en-US');}
function getStressMultiplier(){return 1+(state.stress-3)*0.08;}
function blendedDemand(){const base=crops.reduce((sum,c)=>sum+c.demand*(c.mix/100),0)*state.area;return Math.round(base*getStressMultiplier()*(state.focus==='yield-first'?1.04:state.focus==='water-first'?0.94:1));}
function setStatus(selector,baseClass,status){qs(selector).className=`${baseClass} status-${status}`;}

async function fetchLiveWeather(region){
  try{
    const query=encodeURIComponent(region.location);
    const geo=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1&language=en&format=json`);
    if(!geo.ok) throw new Error('Geocoding request failed');
    const gj=await geo.json();
    if(!gj.results?.length) throw new Error('Location not found');
    const r=gj.results[0]; state.coords=r;
    const forecastUrl=`https://api.open-meteo.com/v1/forecast?latitude=${r.latitude}&longitude=${r.longitude}&daily=et0_fao_evapotranspiration,precipitation_sum,temperature_2m_max&forecast_days=7&timezone=auto`;
    const weatherResponse=await fetch(forecastUrl);
    if(!weatherResponse.ok) throw new Error('Weather request failed');
    const weather=await weatherResponse.json();
    state.live=weather;
    return true;
  } catch(error){
    state.live=null; state.coords=null; console.warn('Live weather unavailable',error); return false;
  }
}

function liveMetrics(){
  if(!state.live?.daily) return null;
  const d=state.live.daily;
  const et0=(d.et0_fao_evapotranspiration||[]).reduce((a,b)=>a+b,0)/(d.et0_fao_evapotranspiration?.length||1);
  const rainfall=(d.precipitation_sum||[]).reduce((a,b)=>a+b,0);
  const maxTemp=Math.max(...(d.temperature_2m_max||[0]));
  return {et0,rainfall,maxTemp};
}

function renderClimate(){
  const region=regions[state.region], live=liveMetrics();
  qs('#region-country').textContent=`${region.country.toUpperCase()} · 2026 GROWING SEASON`;
  qs('#region-summary').textContent=region.summary;
  qs('#region-note').textContent=region.note;
  qs('#current-lens').textContent=`${region.name} · ${region.overallLabel.toLowerCase()}`;
  qs('#overall-status').innerHTML=`<i></i>${region.overallLabel}`;
  setStatus('#overall-status','status-badge',region.overallStatus);

  qs('#climate-rainfall').textContent=live?`${Math.round(live.rainfall)} mm`:`${region.rainfall} mm`;
  qs('#rainfall-detail').textContent=live?`Next 7 days · live forecast`:`Growing season · ${Math.abs(region.rainfallNormalDelta)}% below normal`;
  qs('#climate-reservoir').textContent=`${region.reservoir}%`;
  qs('#reservoir-detail').textContent=`Regional storage · ${region.reservoirTrend}`;
  qs('#climate-drought').textContent=live?`${Math.min(5,Math.max(1,((live.et0/3)+region.drought-1)/2)).toFixed(1)} / 5`:`${region.drought.toFixed(1)} / 5`;
  qs('#drought-detail').textContent=live?`Live ET₀ ${live.et0.toFixed(1)} mm/day · max ${Math.round(live.maxTemp)}°C`:`${region.droughtLabel}`;
  qs('#climate-soil').textContent=`${region.soil}%`;
  qs('#soil-detail').textContent=region.soilLabel;
  qs('#climate-irrigation').textContent=`${formatNumber(region.irrigation)} m³`;
  qs('#irrigation-detail').textContent=region.irrigationLabel;

  setStatus('#rainfall-card','climate-kpi',region.rainfallStatus);
  setStatus('#reservoir-card','climate-kpi',region.reservoirStatus);
  setStatus('#drought-card','climate-kpi',region.droughtStatus);
  setStatus('#soil-card','climate-kpi',region.soilStatus);
  setStatus('#irrigation-card','climate-kpi',region.irrigationStatus);
  setStatus('#resource-status','chart-status-pill',region.overallStatus);
  qs('#resource-status').textContent=region.resourceLabel;
  qs('#baseline-location').textContent=`${region.name} · ${region.country}`;
  qs('#rainfall-total-label').textContent=live?`${Math.round(live.rainfall)} mm · live next 7 days`:`${region.rainfall} mm total`;
  const source=qs('#live-weather-source'); if(source) source.textContent=live?'LIVE · Open-Meteo':'MOCK FALLBACK · regional baseline';
  if(source) source.className=live?'live-source live':'live-source fallback';

  const months=['Day 1','Day 2','Day 3','Day 4','Day 5','Day 6','Day 7'];
  const values=live?(state.live.daily.precipitation_sum||[0,0,0,0,0,0,0]):region.rainfallMonthly;
  const rainfallMax=Math.max(...values,1);
  qs('#rainfall-chart').style.setProperty('--chart-color',live?'#2b7a6f':statusColors[region.rainfallStatus]);
  qs('#rainfall-chart').setAttribute('aria-label',live?`Live seven day precipitation forecast for ${region.name}`:`${region.name} monthly rainfall from January to June`);
  qs('#rainfall-chart').innerHTML=values.slice(0,7).map((value,index)=>`<div class="rainfall-column"><em>${Math.round(value)}</em><b style="height:${Math.max(4,(value/rainfallMax)*92)}%"></b><span>${live?months[index]:['Jan','Feb','Mar','Apr','May','Jun'][index]}</span></div>`).join('');
  qs('#water-sparkline').style.setProperty('--spark-color',statusColors[region.overallStatus]);
  qs('#water-sparkline').innerHTML=region.waterTrend.map(value=>`<i style="height:${Math.max(8,(value/70)*100)}%"></i>`).join('');
  qs('#water-budget-panel').style.setProperty('--demand-color',statusColors[region.overallStatus]);
  const resources=[{label:'Reservoir',value:region.reservoir,suffix:'%',status:region.reservoirStatus},{label:'Soil moisture',value:region.soil,suffix:'%',status:region.soilStatus},{label:'Irrigation cover',value:region.irrigationCoverage,suffix:'%',status:region.irrigationStatus}];
  qs('#resource-chart').innerHTML=resources.map(item=>`<div class="resource-row"><span>${item.label}</span><div class="resource-track"><b style="width:${item.value}%;--bar-color:${statusColors[item.status]}"></b></div><strong>${item.value}${item.suffix}</strong></div>`).join('');
}

async function applyRegion(regionId){
  const region=regions[regionId]; state.region=regionId; state.water=region.irrigation; state.stress=region.stress;
  qs('#water').value=String(region.irrigation); qs('#stress').value=String(region.stress);
  qs('#live-weather-source').textContent='LOADING · Open-Meteo'; qs('#live-weather-source').className='live-source loading';
  await fetchLiveWeather(region); renderClimate(); render();
}

function recommendation(){
  const demand=blendedDemand();
  const buffer=((state.water-demand)/Math.max(demand,1))*100;
  const fit=Math.max(0,Math.min(100,(state.water/Math.max(demand,1))*78));
  const stressPenalty=(state.stress-1)*3;
  const focusBonus=state.focus==='water-first'?7:state.focus==='yield-first'?-4:4;
  const score=Math.round(Math.max(42,Math.min(96,fit-stressPenalty+focusBonus)));
  const region=regions[state.region];
  const live=liveMetrics();
  const usePercent=Math.round((demand/Math.max(state.water,1))*100);
  const shortfall=Math.max(0,demand-state.water);
  const reserveTarget=Math.round(state.water*0.1);
  const dryForecast=live&&(live.rainfall<10||live.et0>4);

  const grade=buffer<0?'Immediate rebalance':buffer<7?'Proceed with caution':state.stress>=4?'Proceed with controls':'Proceed as planned';
  const title=buffer<0?'Cut high-demand area before approval':buffer<7?'Build a 10% water reserve before planting':state.stress>=4?'Protect an olive-led mix through peak heat':'Maintain the diversified crop plan';
  const copy=buffer<0
    ?`${region.name} is projected to exceed its available allocation by ${formatNumber(shortfall)} m³. Reduce the citrus and vegetable commitment before approving the seasonal plan.`
    :buffer<7
      ?`${region.name} remains inside budget, but the margin is too narrow for forecast error. Hold back at least ${formatNumber(reserveTarget)} m³ before fixing planted area.`
      :state.stress>=4
        ?`${region.name} has ${buffer.toFixed(1)}% water headroom, but severe heat and drought pressure can erode it quickly. Keep olive as the anchor and gate expansion behind weekly checks.`
        :`${region.name} can support the current crop mix with ${buffer.toFixed(1)}% headroom. Preserve the reserve, prioritise high-value blocks, and review the plan against the next forecast.`;

  const actions=[
    buffer<0
      ?{title:'Close the allocation gap',copy:`Remove at least ${formatNumber(shortfall)} m³ of planned demand, starting with the least productive citrus and vegetable blocks.`,timing:'Before area approval'}
      :{title:'Ring-fence the reserve',copy:`Keep ${formatNumber(reserveTarget)} m³ uncommitted so the cooperative can absorb heat-driven demand or a delayed rainfall event.`,timing:'Before planting commitments'},
    dryForecast
      ?{title:'Activate the dry-week protocol',copy:`The live forecast shows ${live.rainfall.toFixed(0)} mm rain and ET₀ of ${live.et0.toFixed(1)} mm/day. Move irrigation to cooler hours and inspect priority blocks every 48 hours.`,timing:'Start this week'}
      :live
        ?{title:'Use the forecast window',copy:`The next seven days show ${live.rainfall.toFixed(0)} mm rain and a ${Math.round(live.maxTemp)}°C maximum. Adjust the next irrigation cycle before releasing additional water.`,timing:'Review in 7 days'}
        :{title:'Monitor field conditions',copy:'Live weather is unavailable. Use observed rainfall and field moisture before releasing the next irrigation block.',timing:'Check within 7 days'},
    region.overallStatus==='red'
      ?{title:'Cap high-demand exposure',copy:'Hold citrus near 25% of planted area and require board approval before moving flexible hectares away from the olive-led plan.',timing:'Board control point'}
      :region.overallStatus==='yellow'
        ?{title:'Protect high-value parcels',copy:'Concentrate citrus irrigation on the strongest commercial blocks and keep flexible hectares available for lower-demand crops.',timing:'Confirm parcel ranking'}
        :{title:'Keep flexibility in the mix',copy:'Maintain the diversified plan, but avoid committing all available water while summer conditions can still change.',timing:'Reassess monthly'}
  ];

  return{
    score,grade,title,copy,actions,usePercent,
    bufferValue:`${buffer>=0?'+':''}${buffer.toFixed(1)}%`,
    bufferNote:buffer<0?'Demand exceeds allocation':buffer<7?'Below the 7% safety threshold':'Seasonal demand remains covered',
    climateValue:live?`ET₀ ${live.et0.toFixed(1)} mm/d`:region.overallLabel,
    climateNote:live?`${live.rainfall.toFixed(0)} mm rain · max ${Math.round(live.maxTemp)}°C next 7 days`:'Regional baseline · live feed unavailable',
    postureValue:buffer<7?'Rebalance':state.stress>=4?'Controlled':'Maintain',
    postureNote:`${region.name} · ${state.focus.replace('-', ' ')} scenario`,
    reviewLabel:live?'Review after the next 7-day forecast':'Review after field observations'
  };
}

function renderScenarios(){const demand=blendedDemand(), multiplier=getStressMultiplier(), modeMultiplier=state.focus==='water-first'?0.93:state.focus==='yield-first'?1.04:1, seasonalValues=crops.map(c=>Math.round(c.demand*state.area*(c.mix/100)*multiplier*modeMultiplier)); qs('#scenario-grid').innerHTML=crops.map((crop,index)=>{const seasonal=seasonalValues[index],pressure=Math.min(100,Math.round((seasonal/Math.max(state.water,1))*100)),isRecommended=crop.id==='olive';return `<article class="scenario-card ${isRecommended?'recommended':''}"><div class="scenario-top"><span class="crop-name">${crop.name}</span>${isRecommended?'<span class="scenario-tag">RECOMMENDED</span>':''}</div><p class="scenario-desc">${crop.note}</p><div class="scenario-metrics"><div class="metric"><span>Water need</span><strong>${formatNumber(seasonal)} m³</strong></div><div class="metric"><span>Yield index</span><strong>${crop.yield.toFixed(1)} / 10</strong></div><div class="metric"><span>Efficiency</span><strong>${crop.efficiency}%</strong></div><div class="metric"><span>Mock area</span><strong>${crop.mix}%</strong></div></div><div class="scenario-bar"><span style="width:${pressure}%"></span></div><div class="scenario-foot"><span>Water pressure</span><strong>${pressure}%</strong></div></article>`;}).join('');
  document.querySelectorAll('[data-crop-row]').forEach((row,index)=>{row.querySelector('.bar-track i').style.width=`${Math.min(100,(seasonalValues[index]/Math.max(state.water,1))*100)}%`;row.querySelector('em').textContent=`${Math.round(seasonalValues[index]/1000)}k`;});
  qs('#chart-total-demand').style.width=`${Math.min(100,(demand/Math.max(state.water,1))*100)}%`;qs('#chart-total-label').textContent=`${Math.round(demand/1000)}k`;
}
function render(){
  qs('#water-value').textContent=`${formatNumber(state.water)} m³`;
  qs('#area-value').textContent=`${state.area} ha`;
  qs('#stress-value').textContent=stressNames[state.stress-1];
  qs('#kpi-water').textContent=formatNumber(state.water);
  const demand=blendedDemand(),buffer=((state.water-demand)/Math.max(demand,1))*100,efficiency=Math.max(45,Math.min(96,Math.round(100-(demand/Math.max(state.water,1))*25-(state.stress-3)*5))),rec=recommendation();
  qs('#kpi-demand').textContent=formatNumber(demand);
  qs('#kpi-buffer').textContent=`${buffer>=0?'+':''}${buffer.toFixed(1)}% buffer`;
  qs('#kpi-buffer').className=`chip ${buffer>=5?'positive':'neutral'}`;
  qs('#kpi-efficiency').textContent=`${efficiency}%`;
  qs('#efficiency-bar').style.width=`${efficiency}%`;
  qs('#kpi-mix').textContent=rec.score>=68?'Olive-led':'Rebalance';
  qs('#kpi-alert').textContent=state.stress>=4?'High heat weeks':'Watch heat weeks';
  qs('#recommendation-score').textContent=rec.score;
  qs('#recommendation-grade').textContent=rec.grade;
  qs('#recommendation-title').textContent=rec.title;
  qs('#recommendation-copy').textContent=rec.copy;
  qs('#recommendation-buffer').textContent=rec.bufferValue;
  qs('#recommendation-buffer-note').textContent=rec.bufferNote;
  qs('#recommendation-climate').textContent=rec.climateValue;
  qs('#recommendation-climate-note').textContent=rec.climateNote;
  qs('#recommendation-posture').textContent=rec.postureValue;
  qs('#recommendation-posture-note').textContent=rec.postureNote;
  qs('#recommendation-region').textContent=`${regions[state.region].name} · ${regions[state.region].country}`;
  qs('#action-list').innerHTML=rec.actions.map((action,index)=>`<div><span>0${index+1}</span><strong>${action.title}</strong><small>${action.copy}</small><em>${action.timing}</em></div>`).join('');
  qs('#budget-use-percent').textContent=`${rec.usePercent}%`;
  qs('#budget-use-note').textContent=rec.usePercent>100?'of allocation · corrective action required':'of available allocation';
  qs('#budget-review-date').textContent=rec.reviewLabel;
  qs('#chart-status').textContent=buffer>=0?'Within budget':'Over budget';
  qs('#chart-status').style.color=buffer>=0?'#4f7e58':'#b6523f';
  renderScenarios();
}
qs('#water').addEventListener('input',e=>{state.water=Number(e.target.value);render();});qs('#area').addEventListener('input',e=>{state.area=Number(e.target.value);render();});qs('#stress').addEventListener('input',e=>{state.stress=Number(e.target.value);render();});qs('#scenario-select').addEventListener('change',e=>{state.focus=e.target.value;render();});qs('#region-select').addEventListener('change',e=>applyRegion(e.target.value));qs('#sign-out').addEventListener('click',()=>{sessionStorage.removeItem('aquaCropSession');window.location.replace('login.html');});
document.querySelectorAll('.nav-item').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(item=>item.classList.remove('active'));link.classList.add('active');}));

applyRegion(state.region);

const uiRepairLink=document.createElement('link');
uiRepairLink.rel='stylesheet';
uiRepairLink.href='ui-fixes.css';
document.head.appendChild(uiRepairLink);

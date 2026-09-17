const crops = [
  { id: 'olive', name: 'Olives', note: 'Drought-resilient Mediterranean anchor', demand: 5400, yield: 8.8, efficiency: 92, mix: 34 },
  { id: 'citrus', name: 'Citrus', note: 'High-value perennial with steady demand', demand: 9200, yield: 9.4, efficiency: 68, mix: 14 },
  { id: 'vegetables', name: 'Field vegetables', note: 'Flexible seasonal horticulture block', demand: 6900, yield: 8.1, efficiency: 76, mix: 10 },
  { id: 'tomato', name: 'Tomatoes', note: 'High-value processing and fresh crop', demand: 6500, yield: 8.7, efficiency: 82, mix: 12 },
  { id: 'grape', name: 'Grapes', note: 'Quality-focused vineyard allocation', demand: 4500, yield: 8.4, efficiency: 89, mix: 14 },
  { id: 'wheat', name: 'Wheat', note: 'Lower-irrigation winter cereal', demand: 2500, yield: 7.4, efficiency: 94, mix: 9 },
  { id: 'maize', name: 'Maize', note: 'Productive summer cereal with peak demand', demand: 7000, yield: 8.2, efficiency: 72, mix: 7 }
];

const regions = { pending: { name:'Selected region', country:'Southern Europe', overallStatus:'yellow', overallLabel:'Loading', irrigationCoverage:50, irrigation:4100000, stress:3 } };

const state = { region:'pending', water:4100000, area:420, stress:5, focus:'balanced', live:null, coords:null };
const stressNames=['Very low','Low','Moderate','High','Severe'];
const qs=(selector)=>document.querySelector(selector);
const statusColors={green:'#4f9563',yellow:'#d49a2f',red:'#c95d46'};

function formatNumber(n){return Math.round(n).toLocaleString('en-US');}
const WATER_EPSILON=1e-6;
function budgetUseLabel(demand){if(state.water<=WATER_EPSILON)return 'No irrigation water allocated';const percent=Math.round((demand/state.water)*100);return percent>999?'999%+':`${percent}%`;}
function cropImpactLabel(seasonal){if(state.water<=WATER_EPSILON)return 'No water allocated for this crop';const percent=((seasonal-state.water)/state.water)*100;return Math.abs(percent)>999?`${percent>0?'+':'-'}999%+`:`${percent>0?'+':''}${percent.toFixed(0)}%`+(percent>0?' over available budget':' under available budget');}
function getStressMultiplier(){return 1+(state.stress-3)*0.08;}
function blendedDemand(){const base=crops.reduce((sum,c)=>sum+c.demand*(c.mix/100),0)*state.area;return Math.round(base*getStressMultiplier()*(state.focus==='yield-first'?1.04:state.focus==='water-first'?0.94:1));}
function setStatus(selector,baseClass,status){qs(selector).className=`${baseClass} status-${status}`;}
function currentLiveMetrics(){
  if(!state.live?.daily) return null;
  const daily=state.live.daily;
  const et0=(daily.et0_fao_evapotranspiration||[]).reduce((total,value)=>total+value,0)/(daily.et0_fao_evapotranspiration?.length||1);
  const rainfall=(daily.precipitation_sum||[]).reduce((total,value)=>total+value,0);
  const maxTemp=Math.max(...(daily.temperature_2m_max||[0]));
  return { et0, rainfall, maxTemp };
}

function recommendation(){
  const demand=blendedDemand();
  const buffer=((state.water-demand)/Math.max(demand,1))*100;
  const fit=Math.max(0,Math.min(100,(state.water/Math.max(demand,1))*78));
  const stressPenalty=(state.stress-1)*3;
  const focusBonus=state.focus==='water-first'?7:state.focus==='yield-first'?-4:4;
  const score=Math.round(Math.max(42,Math.min(96,fit-stressPenalty+focusBonus)));
  const region=regions[state.region];
  const live=currentLiveMetrics();
  const usePercent=state.water<=WATER_EPSILON?null:Math.round((demand/state.water)*100);
  const shortfall=Math.max(0,demand-state.water);
  const reserveTarget=Math.round(state.water*0.1);
  const dryForecast=live&&(live.rainfall<10||live.et0>4);
  const grade=buffer<0?'Immediate rebalance':buffer<7?'Proceed with caution':state.stress>=4?'Proceed with controls':'Proceed as planned';
  const title=buffer<0?'Cut high-demand area before approval':buffer<7?'Build a 10% water reserve before planting':state.stress>=4?'Protect an olive-led mix through peak heat':'Maintain the diversified crop plan';
  const copy=buffer<0
    ?`${region.name} is projected to exceed its available allocation by ${formatNumber(shortfall)} m³. Reduce maize and the least productive tomato or citrus blocks before approving the seasonal plan.`
    :buffer<7
      ?`${region.name} remains inside budget, but the margin is too narrow for forecast error. Hold back at least ${formatNumber(reserveTarget)} m³ before fixing planted area.`
      :state.stress>=4
        ?`${region.name} has ${buffer.toFixed(1)}% water headroom, but severe heat and drought pressure can erode it quickly. Keep olives and wheat as the resilient base, and gate maize or tomato expansion behind weekly checks.`
        :`${region.name} can support the diversified mix with ${buffer.toFixed(1)}% headroom. Preserve the reserve, prioritise grapes and tomatoes on suitable parcels, and review the plan against the next forecast.`;
  const actions=[
    buffer<0
      ?{title:'Close the allocation gap',copy:`Remove at least ${formatNumber(shortfall)} m³ of planned demand, starting with maize and the least productive tomato or citrus blocks.`,timing:'Before area approval'}
      :{title:'Ring-fence the reserve',copy:`Keep ${formatNumber(reserveTarget)} m³ uncommitted so the cooperative can absorb heat-driven demand or a delayed rainfall event.`,timing:'Before planting commitments'},
    dryForecast
      ?{title:'Activate the dry-week protocol',copy:`The live forecast shows ${live.rainfall.toFixed(0)} mm rain and ET₀ of ${live.et0.toFixed(1)} mm/day. Move irrigation to cooler hours and inspect priority blocks every 48 hours.`,timing:'Start this week'}
      :live
        ?{title:'Use the forecast window',copy:`The next seven days show ${live.rainfall.toFixed(0)} mm rain and a ${Math.round(live.maxTemp)}°C maximum. Adjust the next irrigation cycle before releasing additional water.`,timing:'Review in 7 days'}
        :{title:'Monitor field conditions',copy:'Live weather is unavailable. Use observed rainfall and field moisture before releasing the next irrigation block.',timing:'Check within 7 days'},
    region.overallStatus==='red'
      ?{title:'Cap high-demand exposure',copy:'Keep maize, citrus, and tomatoes within the approved shares, and require board approval before moving wheat or olive hectares into higher-demand crops.',timing:'Board control point'}
      :region.overallStatus==='yellow'
        ?{title:'Protect high-value parcels',copy:'Concentrate citrus, grape, and tomato irrigation on the strongest commercial blocks, while retaining wheat as a lower-water option.',timing:'Confirm parcel ranking'}
        :{title:'Keep flexibility in the mix',copy:'Maintain the seven-crop plan, but avoid committing all available water to maize and summer horticulture while conditions can still change.',timing:'Reassess monthly'}
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

function applyLiveDecisionRegion(region, metrics={}){
  const baseline=regions[state.region]||regions.pending;
  const score=Number.isFinite(metrics.irrigationScore)?metrics.irrigationScore:baseline.irrigationCoverage;
  const status=metrics.irrigationStatus?.css||baseline.overallStatus;
  const stress=status==='red'?5:status==='yellow'?3:2;
  const water=Math.round(Math.max(3000000,Math.min(7000000,3000000+(score/100)*4000000))/100000)*100000;
  regions[region.id]={...baseline,name:region.name,country:region.country,overallStatus:status,overallLabel:metrics.irrigationStatus?.label||baseline.overallLabel,liveHeadline:metrics.pressure?`${region.name}'s water outlook is ${metrics.pressure.label.toLowerCase()} this season.`:null,irrigation:water,stress};
  state.region=region.id;
  state.water=water;
  state.stress=stress;
  state.live=metrics.weather||null;
  qs('#water').value=String(water);
  qs('#stress').value=String(stress);
  render();
}

window.AQUACROP_DECISION={applyLiveRegion:applyLiveDecisionRegion};

function renderScenarios(){const demand=blendedDemand(), multiplier=getStressMultiplier(), modeMultiplier=state.focus==='water-first'?0.93:state.focus==='yield-first'?1.04:1, seasonalValues=crops.map(c=>Math.round(c.demand*state.area*(c.mix/100)*multiplier*modeMultiplier)); qs('#scenario-grid').innerHTML=crops.map((crop,index)=>{const seasonal=seasonalValues[index],pressure=Math.min(100,Math.round((seasonal/Math.max(state.water,1))*100)),isRecommended=crop.id==='olive',selectorLabel=crop.id==='maize'?'Corn':crop.name,impactText=cropImpactLabel(seasonal);return `<article class="scenario-card ${isRecommended?'recommended':''}"><div class="scenario-top"><span class="crop-name">${selectorLabel}</span>${isRecommended?'<span class="scenario-tag">RESILIENT BASE</span>':''}</div><p class="scenario-desc">${crop.note}</p><div class="scenario-metrics"><div class="metric"><span>Water need</span><strong>${formatNumber(seasonal)} m³</strong></div><div class="metric"><span>Yield index</span><strong>${crop.yield.toFixed(1)} / 10</strong></div><div class="metric"><span>Efficiency</span><strong>${crop.efficiency}%</strong></div><div class="metric"><span>Planning share</span><strong>${crop.mix}%</strong></div></div><p class="scenario-impact">${state.water<=WATER_EPSILON?impactText:`Choosing this crop uses ${impactText}.`}</p><div class="scenario-bar"><span style="width:${pressure}%"></span></div><div class="scenario-foot"><span>Water pressure</span><strong>${pressure}%</strong></div></article>`;}).join('');
  qs('#crop-budget-chart').innerHTML=crops.map((crop,index)=>{const pressure=Math.min(100,(seasonalValues[index]/Math.max(state.water,1))*100);return `<div class="bar-row" data-crop-row="${crop.id}"><span>${crop.name}</span><div class="bar-track"><b style="width:${crop.mix}%"></b><i style="width:${pressure}%"></i></div><em>${Math.round(seasonalValues[index]/1000)}k</em></div>`;}).join('')+`<div class="bar-row total"><span>Total</span><div class="bar-track"><b style="width:100%"></b><i id="chart-total-demand" style="width:${Math.min(100,(demand/Math.max(state.water,1))*100)}%"></i></div><em id="chart-total-label">${Math.round(demand/1000)}k</em></div>`;
}
function render(){
  qs('#water-value').textContent=`${formatNumber(state.water)} m³`;
  qs('#area-value').textContent=`${state.area} ha`;
  qs('#stress-value').textContent=stressNames[state.stress-1];
  if(qs('#kpi-water'))qs('#kpi-water').textContent=formatNumber(state.water);
  const demand=blendedDemand(),buffer=((state.water-demand)/Math.max(demand,1))*100,efficiency=Math.max(45,Math.min(96,Math.round(100-(demand/Math.max(state.water,1))*25-(state.stress-3)*5))),rec=recommendation();
  if(qs('#kpi-demand'))qs('#kpi-demand').textContent=formatNumber(demand);
  if(qs('#kpi-buffer')){qs('#kpi-buffer').textContent=`${buffer>=0?'+':''}${buffer.toFixed(1)}% buffer`;qs('#kpi-buffer').className=`chip ${buffer>=5?'positive':'neutral'}`;}
  if(qs('#kpi-efficiency'))qs('#kpi-efficiency').textContent=`${efficiency}%`;
  if(qs('#efficiency-bar'))qs('#efficiency-bar').style.width=`${efficiency}%`;
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
  qs('#budget-use-percent').textContent=budgetUseLabel(demand);
  qs('#budget-use-note').textContent=state.water<=WATER_EPSILON?'Increase allocation to calculate usage':rec.usePercent>999?'of allocation · corrective action required':rec.usePercent>100?'of allocation · corrective action required':'of available allocation';
  qs('#budget-review-date').textContent=rec.reviewLabel;
  qs('#chart-status').textContent=buffer>=0?'Within budget':'Over budget';
  qs('#chart-status').style.color=buffer>=0?'#4f7e58':'#b6523f';
  renderScenarios();
}
qs('#water').addEventListener('input',e=>{state.water=Number(e.target.value);render();});qs('#area').addEventListener('input',e=>{state.area=Number(e.target.value);render();});qs('#stress').addEventListener('input',e=>{state.stress=Number(e.target.value);render();});qs('#scenario-select').addEventListener('change',e=>{state.focus=e.target.value;render();});qs('#sign-out').addEventListener('click',()=>{sessionStorage.removeItem('aquaCropSession');window.location.replace('login.html');});
document.querySelectorAll('.nav-item').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(item=>item.classList.remove('active'));link.classList.add('active');}));

render();


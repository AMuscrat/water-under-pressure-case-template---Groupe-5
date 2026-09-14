(function(){
  const remoteGeoUrl='https://raw.githubusercontent.com/leakyMirror/map-of-europe/master/GeoJSON/europe.geojson';
  const nativeFetch=window.fetch.bind(window);
  const MIN_LON=-25, MAX_LON=42, MIN_LAT=35, MAX_LAT=72, SVG_W=960, SVG_H=520;
  const toLonLat=(x,y)=>[(Number(x)/SVG_W)*(MAX_LON-MIN_LON)+MIN_LON,MAX_LAT-(Number(y)/SVG_H)*(MAX_LAT-MIN_LAT)];
  async function loadLocalGeo(){
    const response=await nativeFetch('europe-map.svg',{cache:'no-store'});
    if(!response.ok) throw new Error('Local Europe map could not be loaded');
    const svgText=await response.text();
    const doc=new DOMParser().parseFromString(svgText,'image/svg+xml');
    const grouped=new Map();
    doc.querySelectorAll('polygon.country').forEach(poly=>{
      const iso=poly.getAttribute('data-iso')||'';
      const name=poly.getAttribute('data-name')||'Country';
      const points=(poly.getAttribute('points')||'').trim().split(/\s+/).map(pair=>pair.split(',')).filter(pair=>pair.length===2&&Number.isFinite(Number(pair[0]))&&Number.isFinite(Number(pair[1]))).map(([x,y])=>toLonLat(x,y));
      if(points.length<3) return;
      const key=`${iso}|${name}`;
      const item=grouped.get(key)||{iso,name,rings:[]};
      item.rings.push(points);
      grouped.set(key,item);
    });
    return {type:'FeatureCollection',features:[...grouped.values()].map(item=>({type:'Feature',properties:{ISO_A3:item.iso,name:item.name},geometry:{type:item.rings.length===1?'Polygon':'MultiPolygon',coordinates:item.rings.length===1?[item.rings[0]]:item.rings.map(r=>[r])}}))};
  }
  window.fetch=async function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(url===remoteGeoUrl){
      const geo=await loadLocalGeo();
      return new Response(JSON.stringify(geo),{status:200,headers:{'Content-Type':'application/geo+json'}});
    }
    return nativeFetch(input,init);
  };
})();
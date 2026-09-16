if (sessionStorage.getItem('aquaCropSession') !== 'active') {
  window.location.replace('login.html');
} else {
  document.querySelector('#sign-out')?.addEventListener('click', () => {
    sessionStorage.removeItem('aquaCropSession');
    sessionStorage.removeItem('aquaCropUser');
    window.location.replace('login.html');
  });

  const waterSlider = document.querySelector('#water');
  if (waterSlider) waterSlider.min = '0';

  const load = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });

  (async () => {
    await load('app-water-api-copy.js');
    await load('app-water-api.js');
  })().catch((error) => console.error('Water API loader failed', error));
}

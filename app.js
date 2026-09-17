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

  const farmInputs = document.querySelector('#farm-inputs');
  const overview = document.querySelector('#overview');
  if (farmInputs && overview) {
    overview.insertAdjacentElement('afterend', farmInputs);
    farmInputs.classList.add('farm-inputs-priority');

    const heading = farmInputs.querySelector('.section-heading');
    const eyebrow = heading?.querySelector('.eyebrow');
    const title = heading?.querySelector('h2');
    const pill = heading?.querySelector('.panel-pill');
    if (eyebrow) eyebrow.textContent = 'START HERE · COOPERATIVE DATA';
    if (title) title.textContent = 'Set your cooperative assumptions';
    if (pill) pill.textContent = 'STEP 1 · ENTER DATA';

    if (!farmInputs.querySelector('.farm-inputs-intro')) {
      const intro = document.createElement('p');
      intro.className = 'farm-inputs-intro';
      intro.textContent = 'Enter your cooperative or company assumptions first. Add your irrigation setup, soil, growing season, and crops; API data then drives the crop comparison and downstream decision workspace.';
      heading?.insertAdjacentElement('afterend', intro);
    }

    const callout = farmInputs.querySelector('.callout-panel');
    if (callout) {
      const calloutEyebrow = callout.querySelector('.eyebrow');
      const calloutTitle = callout.querySelector('h2');
      const calloutCopy = callout.querySelector('p');
      if (calloutEyebrow) calloutEyebrow.textContent = 'WHY THIS COMES FIRST';
      if (calloutTitle) calloutTitle.textContent = 'Your company data drives every result.';
      if (calloutCopy) calloutCopy.textContent = 'Set available water, farm area, irrigation efficiency and method, soil type, growing season, and crops before reviewing the climate outlook, crop scenarios, and board recommendations.';
    }
  }

  const nav = document.querySelector('.sidebar nav');
  const overviewLink = nav?.querySelector('a[href="#overview"]');
  const farmLink = nav?.querySelector('a[href="#farm-inputs"]');
  if (overviewLink && farmLink) overviewLink.insertAdjacentElement('afterend', farmLink);

  const navNumbers = [
    ['a[href="#overview"]', '01'],
    ['a[href="#farm-inputs"]', '02'],
    ['a[href="map.html"]', '03'],
    ['a[href="#water-climate"]', '04'],
    ['a[href="#crop-scenarios"]', '05'],
    ['a[href="#recommendations"]', '06'],
    ['a[href="#methodology"]', '07']
  ];
  navNumbers.forEach(([selector, number]) => {
    const span = nav?.querySelector(selector)?.querySelector('span');
    if (span) span.textContent = number;
  });

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
    await load('farm-inputs-api.js');
  })().catch((error) => console.error('Dashboard API loader failed', error));
}

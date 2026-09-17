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
      intro.textContent = 'Enter your cooperative or company assumptions first. These values drive the water budget, crop scenarios, and recommendations shown below.';
      heading?.insertAdjacentElement('afterend', intro);
    }

    const callout = farmInputs.querySelector('.callout-panel');
    if (callout) {
      const calloutEyebrow = callout.querySelector('.eyebrow');
      const calloutTitle = callout.querySelector('h2');
      const calloutCopy = callout.querySelector('p');
      if (calloutEyebrow) calloutEyebrow.textContent = 'WHY THIS COMES FIRST';
      if (calloutTitle) calloutTitle.textContent = 'Your company data drives every result.';
      if (calloutCopy) calloutCopy.textContent = 'Set your available irrigation water, farm area, and drought pressure before reviewing the climate outlook, crop scenarios, and board recommendations.';
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

}

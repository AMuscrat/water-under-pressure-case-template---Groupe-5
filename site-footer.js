(() => {
  const style = document.createElement('style');
  style.textContent = `
    .site-info-footer{margin-top:38px;border:1px solid var(--line);border-radius:20px;overflow:hidden;background:#123b37;color:#fff;box-shadow:var(--shadow)}
    .site-info-main{display:grid;grid-template-columns:minmax(0,1.5fr) repeat(2,minmax(140px,.55fr));gap:34px;padding:34px 36px}
    .site-info-brand{max-width:540px}.site-info-brand .eyebrow{color:#9ed4cc}.site-info-brand h2{font-size:24px;margin:8px 0 10px;color:#fff}.site-info-brand p{color:#bdd2ce;line-height:1.65;font-size:12px}
    .site-info-col strong{display:block;margin-bottom:11px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#9ed4cc}.site-info-col a{display:block;width:max-content;max-width:100%;margin:8px 0;color:#e6f3f1;text-decoration:none;font-size:12px}.site-info-col a:hover{text-decoration:underline;color:#fff}
    .site-info-bottom{display:flex;justify-content:space-between;gap:20px;align-items:center;padding:15px 36px;border-top:1px solid rgba(255,255,255,.12);background:#0e312e;color:#91b0ab;font-size:10px}.site-info-bottom a{color:#b9d1cd;text-decoration:none;margin-left:18px}.site-info-bottom a:hover{color:#fff}
    @media(max-width:800px){.site-info-main{grid-template-columns:1fr 1fr;padding:28px 24px}.site-info-brand{grid-column:1/-1}.site-info-bottom{align-items:flex-start;flex-direction:column;padding:15px 24px}.site-info-bottom a{margin:0 18px 0 0}}
    @media(max-width:520px){.site-info-main{grid-template-columns:1fr}.site-info-brand{grid-column:auto}}
  `;
  document.head.appendChild(style);

  const oldFooter = document.querySelector('footer.footer');
  if (!oldFooter || document.querySelector('.site-info-footer')) return;
  const footer = document.createElement('section');
  footer.className = 'site-info-footer';
  footer.setAttribute('aria-label', 'About AquaCrop Decision Lab');
  footer.innerHTML = `
    <div class="site-info-main">
      <div class="site-info-brand">
        <span class="eyebrow">ABOUT AQUACROP DECISION LAB</span>
        <h2>Better crop-water decisions, before the season starts.</h2>
        <p>AquaCrop Decision Lab is a university decision-support prototype for Southern European agricultural cooperatives and growers. It brings water availability, climate pressure and crop scenarios into one clear workspace so users can compare trade-offs, protect scarce water reserves and discuss a more resilient seasonal crop plan.</p>
      </div>
      <nav class="site-info-col" aria-label="Product information">
        <strong>Explore</strong>
        <a href="#overview">About</a>
        <a href="#water-climate">Features</a>
        <a href="#methodology">FAQ</a>
      </nav>
      <nav class="site-info-col" aria-label="Support and legal">
        <strong>Support & legal</strong>
        <a href="mailto:aquacrop@example.com">Contact</a>
        <a href="#methodology">Privacy Policy</a>
        <a href="#methodology">Terms</a>
      </nav>
    </div>
    <div class="site-info-bottom">
      <span>© 2026 AquaCrop Decision Lab · ESCP university project prototype · Not agronomic or financial advice.</span>
      <span><a href="#overview">Back to top ↑</a></span>
    </div>`;
  oldFooter.replaceWith(footer);
})();

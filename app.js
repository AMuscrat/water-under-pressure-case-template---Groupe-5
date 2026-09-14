(() => {
  const core = document.createElement('script');
  core.src = 'app-core.js';
  core.onload = () => {
    const footer = document.createElement('script');
    footer.src = 'site-footer.js';
    document.body.appendChild(footer);
  };
  document.body.appendChild(core);
})();

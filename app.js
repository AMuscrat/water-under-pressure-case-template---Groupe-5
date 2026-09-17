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

}

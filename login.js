const DEMO_USERNAME = 'planner';
const DEMO_PASSWORD = 'water2026';

const form = document.querySelector('#login-form');
const username = document.querySelector('#username');
const password = document.querySelector('#password');
const togglePassword = document.querySelector('#toggle-password');
const loginError = document.querySelector('#login-error');

if (sessionStorage.getItem('aquaCropSession') === 'active') {
  window.location.replace('index.html');
}

function setFieldError(input, message) {
  const error = document.querySelector(`#${input.id}-error`);
  input.closest('.text-field').classList.toggle('invalid', Boolean(message));
  input.setAttribute('aria-invalid', String(Boolean(message)));
  error.textContent = message;
}

function validateRequiredFields() {
  const missingUsername = !username.value.trim();
  const missingPassword = !password.value;
  setFieldError(username, missingUsername ? 'Enter your username.' : '');
  setFieldError(password, missingPassword ? 'Enter your password.' : '');
  return !missingUsername && !missingPassword;
}

togglePassword.addEventListener('click', () => {
  const isVisible = password.type === 'text';
  password.type = isVisible ? 'password' : 'text';
  togglePassword.textContent = isVisible ? 'Show' : 'Hide';
  togglePassword.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
  password.focus();
});

[username, password].forEach((input) => input.addEventListener('input', () => {
  setFieldError(input, '');
  loginError.hidden = true;
}));

form.addEventListener('submit', (event) => {
  event.preventDefault();
  loginError.hidden = true;
  if (!validateRequiredFields()) return;

  if (username.value.trim() !== DEMO_USERNAME || password.value !== DEMO_PASSWORD) {
    loginError.hidden = false;
    password.select();
    return;
  }

  sessionStorage.setItem('aquaCropSession', 'active');
  window.location.replace('index.html');
});

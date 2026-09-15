const DEFAULT_USERS = [
  { username: 'planner', password: 'water2026', role: 'planner', active: true }
];

const form = document.querySelector('#login-form');
const username = document.querySelector('#username');
const password = document.querySelector('#password');
const togglePassword = document.querySelector('#toggle-password');
const loginError = document.querySelector('#login-error');

const uiRepairLink = document.createElement('link');
uiRepairLink.rel = 'stylesheet';
uiRepairLink.href = 'ui-fixes.css';
document.head.appendChild(uiRepairLink);

if (sessionStorage.getItem('aquaCropSession') === 'active') {
  window.location.replace('index.html');
}

function getLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem('aquaCropUsers') || '[]');
  } catch {
    return [];
  }
}

function getAllUsers() {
  return [...DEFAULT_USERS, ...getLocalUsers()];
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

  const enteredUsername = username.value.trim().toLowerCase();
  const enteredPassword = password.value;
  const match = getAllUsers().find((user) =>
    user.active !== false &&
    String(user.username).toLowerCase() === enteredUsername &&
    user.password === enteredPassword
  );

  if (!match) {
    loginError.hidden = false;
    password.select();
    return;
  }

  sessionStorage.setItem('aquaCropSession', 'active');
  sessionStorage.setItem('aquaCropUser', match.username);
  window.location.replace('index.html');
});

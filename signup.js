const DEFAULT_USERNAMES = ['planner'];

const form = document.querySelector('#signup-form');
const username = document.querySelector('#signup-username');
const password = document.querySelector('#signup-password');
const confirmPassword = document.querySelector('#signup-confirm');
const success = document.querySelector('#signup-success');

function getLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem('aquaCropUsers') || '[]');
  } catch {
    return [];
  }
}

function saveLocalUsers(users) {
  localStorage.setItem('aquaCropUsers', JSON.stringify(users));
}

function setFieldError(input, message) {
  const error = document.querySelector(`#${input.id}-error`);
  input.closest('.text-field').classList.toggle('invalid', Boolean(message));
  input.setAttribute('aria-invalid', String(Boolean(message)));
  error.textContent = message;
}

function passwordRules(value) {
  return {
    length: value.length >= 8,
    letter: /[A-Za-z]/.test(value),
    number: /\d/.test(value)
  };
}

function updatePasswordChecks() {
  const rules = passwordRules(password.value);
  document.querySelectorAll('.password-checks [data-rule]').forEach((item) => {
    item.classList.toggle('valid', Boolean(rules[item.dataset.rule]));
  });
  return Object.values(rules).every(Boolean);
}

function usernameExists(value) {
  const normalized = value.trim().toLowerCase();
  return DEFAULT_USERNAMES.includes(normalized) || getLocalUsers().some((user) => String(user.username).toLowerCase() === normalized);
}

function validateForm() {
  let valid = true;
  const userValue = username.value.trim();

  if (userValue.length < 3) {
    setFieldError(username, 'Use at least 3 characters.');
    valid = false;
  } else if (!/^[A-Za-z0-9._-]+$/.test(userValue)) {
    setFieldError(username, 'Use letters, numbers, dots, dashes or underscores only.');
    valid = false;
  } else if (usernameExists(userValue)) {
    setFieldError(username, 'That username is already in use.');
    valid = false;
  } else {
    setFieldError(username, '');
  }

  if (!updatePasswordChecks()) {
    setFieldError(password, 'Password does not meet all requirements.');
    valid = false;
  } else {
    setFieldError(password, '');
  }

  if (!confirmPassword.value) {
    setFieldError(confirmPassword, 'Repeat your password.');
    valid = false;
  } else if (confirmPassword.value !== password.value) {
    setFieldError(confirmPassword, 'Passwords do not match.');
    valid = false;
  } else {
    setFieldError(confirmPassword, '');
  }

  return valid;
}

password.addEventListener('input', () => {
  updatePasswordChecks();
  setFieldError(password, '');
  success.hidden = true;
});

[username, confirmPassword].forEach((input) => input.addEventListener('input', () => {
  setFieldError(input, '');
  success.hidden = true;
}));

document.querySelectorAll('[data-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.toggle);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.textContent = show ? 'Hide' : 'Show';
    button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    input.focus();
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  success.hidden = true;
  if (!validateForm()) return;

  const users = getLocalUsers();
  users.push({
    id: `local-${Date.now()}`,
    username: username.value.trim(),
    password: password.value,
    role: 'planner',
    active: true
  });
  saveLocalUsers(users);

  form.reset();
  updatePasswordChecks();
  success.hidden = false;
});

updatePasswordChecks();

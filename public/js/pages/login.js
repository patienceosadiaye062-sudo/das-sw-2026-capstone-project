import { logIn, signUp } from '../api.js';
import { el } from '../ui.js';

const message = document.querySelector('#auth-message');
const loginForm = document.querySelector('#login-form');
const signupForm = document.querySelector('#signup-form');
const returnTo = new URLSearchParams(location.search).get('returnTo');

function showMessage(text, type = 'error') {
  message.textContent = text;
  message.className = `notice ${type}`;
}

function destination(user) {
  if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) return returnTo;
  return user.role === 'organizer' ? '/organizer.html' : '/tickets.html';
}

async function submit(form, action) {
  const button = form.querySelector('button');
  button.disabled = true;
  showMessage('Working…', 'success');
  try {
    const result = await action(Object.fromEntries(new FormData(form)));
    location.assign(destination(result.user));
  } catch (error) {
    showMessage(error.message);
  } finally {
    button.disabled = false;
  }
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  submit(loginForm, logIn);
});

signupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  submit(signupForm, signUp);
});

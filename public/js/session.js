const SESSION_KEY = 'gather.session';

export function getSession() {
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return undefined;
  try {
    const session = JSON.parse(stored);
    if (typeof session.token === 'string' && session.user) return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
  return undefined;
}

export function getToken() {
  return getSession()?.token;
}

export function getUser() {
  return getSession()?.user;
}

export function setSession(session) {
  if (
    !session ||
    typeof session.token !== 'string' ||
    !session.user ||
    typeof session.user.email !== 'string' ||
    typeof session.user.role !== 'string'
  ) {
    throw new TypeError('The server returned an invalid sign-in session.');
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

import { getToken, setSession } from './session.js';

async function request(path, { method = 'GET', body, authenticated = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  const token = authenticated ? getToken() : undefined;
  if (token) headers.authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(`Could not reach the server: ${error.message}`);
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The server returned an invalid response.');
  }
  if (!response.ok) {
    const error = new Error(result.error?.message ?? 'The request failed.');
    error.error = result.error ?? { code: 'REQUEST_FAILED', message: error.message };
    error.status = response.status;
    throw error;
  }
  return result;
}

export async function signUp(credentials) {
  const result = await request('/api/auth/signup', {
    method: 'POST',
    body: credentials,
    authenticated: false,
  });
  setSession(result);
  return result;
}

export async function logIn(credentials) {
  const result = await request('/api/auth/login', {
    method: 'POST',
    body: credentials,
    authenticated: false,
  });
  setSession(result);
  return result;
}

export async function getMe() {
  return request('/api/auth/me');
}

export async function listEvents(criteria = {}) {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(criteria)) {
    if (value !== undefined && value !== null && value !== '') {
      parameters.set(key, String(value));
    }
  }
  const queryString = parameters.toString();
  const query = queryString ? `?${queryString}` : '';
  return request(`/api/events${query}`, { authenticated: false });
}

export async function getEvent(eventId) {
  return request(`/api/events/${encodeURIComponent(eventId)}`, { authenticated: false });
}

export async function createBooking(input) {
  return request('/api/bookings', { method: 'POST', body: input });
}

export async function pay(reference, { decline = false } = {}) {
  return request(`/api/bookings/${encodeURIComponent(reference)}/pay`, {
    method: 'POST',
    body: { decline },
  });
}

export async function listMyBookings() {
  return request('/api/bookings');
}

export async function createEvent(input) {
  return request('/api/events', { method: 'POST', body: input });
}

export async function addTicketTier(eventId, input) {
  return request(`/api/events/${encodeURIComponent(eventId)}/tiers`, {
    method: 'POST',
    body: input,
  });
}

export async function publishEvent(eventId) {
  return request(`/api/events/${encodeURIComponent(eventId)}/publish`, { method: 'POST' });
}

export async function unpublishEvent(eventId) {
  return request(`/api/events/${encodeURIComponent(eventId)}/unpublish`, { method: 'POST' });
}

export async function listOrganizerEvents() {
  return request('/api/organizer/events');
}

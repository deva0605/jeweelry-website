/**
 * api.js — Centralised fetch wrapper for all backend API calls.
 *
 * Environment configuration:
 *
 * VITE_API_URL — Backend API base URL
 *   Development:  http://localhost:3001
 *   Production:   https://api.example.com
 *   PUBLIC — not a secret
 *
 * Security notes:
 * - credentials: 'include' sends the httpOnly auth cookie automatically.
 * - Errors from the server are forwarded as-is (already generic).
 * - Never attach tokens to request headers or query strings here.
 * - Do NOT put database passwords, WhatsApp tokens, or secrets into VITE_* variables.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include', // send/receive httpOnly cookies
    ...options,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    // Surface the server's generic error message
    throw new Error(data.error ?? 'An error occurred. Please try again.')
  }

  return data
}

export const authApi = {
  register: (name, email, password, confirmPassword) =>
    apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, confirmPassword }),
    }),

  login: (email, password) =>
    apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    apiFetch('/api/auth/logout', { method: 'POST' }),

  me: () =>
    apiFetch('/api/auth/me'),
}

/**
 * Checkout API — send canonical payload with product IDs and quantities only
 * The backend handles all price calculations and order creation
 */
export const checkoutApi = {
  submit: (customerName, phone, address, cartItems) =>
    apiFetch('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ customerName, phone, address, cartItems }),
    }),
}


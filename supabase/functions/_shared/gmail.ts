import { createClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

export function createAdminClient() {
  const projectUrl = requiredEnv('SUPABASE_URL');
  const secretMap = Deno.env.get('SUPABASE_SECRET_KEYS');
  const secretKey = secretMap ? JSON.parse(secretMap).default : Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secretKey) throw new Error('Supabase server key is not configured.');
  return createClient(projectUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function getPublishableKey() {
  const keyMap = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  const key = keyMap ? JSON.parse(keyMap).default : Deno.env.get('SUPABASE_ANON_KEY');
  if (!key) throw new Error('Supabase publishable key is not configured.');
  return key;
}

export async function getAuthenticatedUser(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const userClient = createClient(requiredEnv('SUPABASE_URL'), getPublishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient.auth.getUser(token);
  return error ? null : data.user;
}

export function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function toBase64Url(bytes: Uint8Array) {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function tokenEncryptionKey() {
  const encodedKey = requiredEnv('GMAIL_TOKEN_ENCRYPTION_KEY');
  const rawKey = fromBase64(encodedKey);
  if (rawKey.length !== 32) throw new Error('GMAIL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  return crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptTokens(tokens: { access_token: string; refresh_token: string }) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await tokenEncryptionKey();
  const plaintext = new TextEncoder().encode(JSON.stringify(tokens));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { encryptedTokens: toBase64(new Uint8Array(ciphertext)), iv: toBase64(iv) };
}

export async function decryptTokens(ciphertext: string, iv: string) {
  const key = await tokenEncryptionKey();
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, key, fromBase64(ciphertext));
  return JSON.parse(new TextDecoder().decode(plaintext)) as { access_token: string; refresh_token: string };
}

export async function hashState(state: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(state));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const GOOGLE_CALLBACK_URL = 'https://unsfgyrcrspnplqvygbt.supabase.co/functions/v1/gmail-oauth-callback';
export const GOOGLE_SCOPE = 'openid email https://www.googleapis.com/auth/gmail.readonly';

export function allowedAppRedirect(value: unknown): value is string {
  if (value === 'inboxapp://integrations') return true;
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.origin === 'http://localhost:8081' && url.pathname === '/' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function appRedirectWithResult(redirectUri: string, params: Record<string, string>) {
  const url = new URL(redirectUri);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

export function callbackError(message: string, status = 400) {
  return new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}

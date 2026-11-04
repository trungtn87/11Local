import test from 'node:test';
import assert from 'node:assert/strict';
import { safeReturnTo, isValidGoogleIdentity, isGoogleAuthConfigured, googleOAuthCallbackUrl } from './google-auth.ts';

test('return destination stays on 11Local, including backslash and control attacks', () => {
  for (const path of ['//evil.example', '/\\evil.example', '/\n/evil.example', 'https://evil.example', null]) {
    assert.equal(safeReturnTo(path), '/tai-khoan');
  }
  assert.equal(safeReturnTo('/ban-do?place=pac-bo&detail=1#review'), '/ban-do?place=pac-bo&detail=1#review');
});

test('Google identity must have matching issuer, audience, verified email and live expiry', () => {
  const now = 1800000000000;
  const profile = { iss: 'https://accounts.google.com', aud: 'client', sub: '123', email: 'user@example.com', email_verified: 'true', exp: String(now / 1000 + 60) };
  assert.equal(isValidGoogleIdentity(profile, 'client', now), true);
  for (const change of [{ iss: 'https://evil.example' }, { aud: 'other' }, { sub: '' }, { email: '' }, { email_verified: 'false' }, { exp: String(now / 1000) }, { exp: 'NaN' }]) {
    assert.equal(isValidGoogleIdentity({ ...profile, ...change }, 'client', now), false);
  }
});

test('Google login requires all server configuration', () => {
  const keys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'USER_SESSION_SECRET', 'DATABASE_URL'];
  const saved = keys.map(key => process.env[key]);
  try {
    keys.forEach(key => { process.env[key] = 'x'.repeat(32); });
    assert.equal(isGoogleAuthConfigured(), true);
    for (const key of keys) {
      const value = process.env[key]; delete process.env[key];
      assert.equal(isGoogleAuthConfigured(), false);
      process.env[key] = value;
    }
    process.env.USER_SESSION_SECRET = 'short';
    assert.equal(isGoogleAuthConfigured(), false);
  } finally {
    keys.forEach((key, index) => { if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index]; });
  }
});

test('Google OAuth redirect URI uses public site despite internal Docker origin', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSite = process.env.SITE_URL;
  try {
    process.env.NODE_ENV = 'production';
    process.env.SITE_URL = 'https://11local.vn';
    assert.equal(googleOAuthCallbackUrl('https://0.0.0.0:3000'), 'https://11local.vn/api/auth/google/callback');
    process.env.SITE_URL = 'http://0.0.0.0:3000';
    assert.equal(googleOAuthCallbackUrl('https://0.0.0.0:3000'), 'https://11local.vn/api/auth/google/callback');
  } finally {
    if (originalEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalEnv;
    if (originalSite === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = originalSite;
  }
});

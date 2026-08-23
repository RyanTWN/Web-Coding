'use strict';
// Sign in with Apple / Google 登入的 identity token 驗證。
//
// 原生 App 端用 AuthenticationServices（Apple）或 Google Sign-In SDK 完成登入後，
// 會拿到一段 JWT（identityToken / idToken），App 把它原封不動送到我們的後端，
// 後端在這裡對 Apple / Google 官方公開的 JWKS 做簽章驗證，確認這確實是 Apple/Google
// 簽發、給「我們這個 App」用的合法 token，才可以信任裡面的 sub（使用者穩定 ID）與 email。
//
// 需要在 .env 設定：
//   APPLE_CLIENT_ID  — Sign in with Apple 的 Services ID / App Bundle ID
//   GOOGLE_CLIENT_ID — Google Cloud Console 建立的 OAuth 用戶端 ID
// 這兩個值要等 Apple Developer / Google Play Console 帳號申請完成、
// 並在後台設定好 Sign in with Apple / OAuth 用戶端之後才會拿到，
// 在那之前呼叫這裡的函式會直接丟出明確的設定錯誤，而不是靜默通過。

const { createRemoteJWKSet, jwtVerify } = require('jose');

const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

async function verifyAppleIdentityToken(identityToken) {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('尚未設定 APPLE_CLIENT_ID，請先完成 Apple Developer 帳號與 Sign in with Apple 設定');
  }
  const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
    issuer: 'https://appleid.apple.com',
    audience: clientId
  });
  return {
    sub: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
    emailVerified: payload.email_verified === true || payload.email_verified === 'true'
  };
}

async function verifyGoogleIdToken(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('尚未設定 GOOGLE_CLIENT_ID，請先完成 Google Cloud Console OAuth 用戶端設定');
  }
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId
  });
  return {
    sub: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
    emailVerified: payload.email_verified === true
  };
}

module.exports = { verifyAppleIdentityToken, verifyGoogleIdToken };

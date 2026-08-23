// Google 登入封裝。
//
// 前置作業（尚未完成，需要 Google Cloud Console 專案後才能做）：
//   1. Google Cloud Console 建立 OAuth 2.0 用戶端 ID，iOS / Android / Web 各建一個
//      （Web 用戶端 ID 是 "webClientId"，也是後端驗證 idToken 時要用的 audience，
//       填進後端 .env 的 GOOGLE_CLIENT_ID）。
//   2. 把下面的 WEB_CLIENT_ID 換成實際的 Web 用戶端 ID。
//   3. iOS 另外要在 Info.plist 設定 URL Scheme（見套件官方文件）。

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { apiFetch } from '../api/client';
import type { GuardianAuthResponse } from '../types/api';

// TODO: 換成 Google Cloud Console 實際核發的 Web 用戶端 ID。
const WEB_CLIENT_ID = 'replace-with-google-oauth-web-client-id.apps.googleusercontent.com';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, offlineAccess: false });
  configured = true;
}

export async function signInWithGoogle(): Promise<GuardianAuthResponse> {
  ensureConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const userInfo = await GoogleSignin.signIn();
  const idToken = userInfo.data?.idToken;
  if (!idToken) {
    throw new Error('沒有取得 Google idToken，請重新登入');
  }

  // idToken 交給後端驗證簽章與 audience，App 端不解析、不信任 token 內容。
  return apiFetch<GuardianAuthResponse>('/guardian/oauth/google', {
    method: 'POST',
    skipAuth: true,
    body: { idToken },
  });
}

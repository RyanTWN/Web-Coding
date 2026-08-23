// Sign in with Apple 封裝。
//
// 前置作業（尚未完成，需要 Apple Developer 帳號後才能做）：
//   1. Apple Developer 後台為這個 App 的 Bundle ID 開啟 "Sign in with Apple" capability。
//   2. Xcode 專案 → Signing & Capabilities → 加入 "Sign in with Apple"。
//   3. 把這個 App 的 Bundle ID 設定到後端 .env 的 APPLE_CLIENT_ID
//      （原生 App 直接用 Bundle ID 當 audience，不需要另外申請 Services ID）。
//
// 這支只在 iOS 有意義；Android 呼叫前請先用 Platform.OS === 'ios' 判斷。

import { Platform } from 'react-native';
import appleAuth, {
  AppleRequestOperation,
  AppleRequestScope,
} from '@invertase/react-native-apple-authentication';
import { apiFetch } from '../api/client';
import type { GuardianAuthResponse } from '../types/api';

export function isAppleSignInAvailable(): boolean {
  return Platform.OS === 'ios' && appleAuth.isSupported;
}

export async function signInWithApple(): Promise<GuardianAuthResponse> {
  if (!isAppleSignInAvailable()) {
    throw new Error('這台裝置不支援 Sign in with Apple');
  }

  const appleAuthRequestResponse = await appleAuth.performRequest({
    requestedOperation: AppleRequestOperation.LOGIN,
    requestedScopes: [AppleRequestScope.EMAIL, AppleRequestScope.FULL_NAME],
  });

  const { identityToken, fullName } = appleAuthRequestResponse;
  if (!identityToken) {
    throw new Error('沒有取得 Apple identityToken，請重新登入');
  }

  const displayName = fullName?.givenName
    ? `${fullName.givenName}${fullName.familyName ?? ''}`
    : undefined;

  // identityToken 交給後端驗證簽章與 audience，App 端不解析、不信任 token 內容。
  return apiFetch<GuardianAuthResponse>('/guardian/oauth/apple', {
    method: 'POST',
    skipAuth: true,
    body: { identityToken, displayName },
  });
}

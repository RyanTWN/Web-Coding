// 統一的後端 API 呼叫封裝。
// 對應網頁版 cool_learning/assets/js/app.js 裡的 apiFetch，但改用 AsyncStorage 存 token
// （網頁版是用 sessionStorage，原生 App 沒有這個概念，且應該用更安全的方式存放 token —
// 上線前建議評估改用 react-native-keychain，這裡先用 AsyncStorage 起步）。

import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: 正式環境請改成你實際的後端網域；開發期間可用 .env 或 react-native-config 管理。
const API_BASE_URL = 'https://learning.ifit.myds.me:4061/api';

const TOKEN_STORAGE_KEY = 'cool_learning_guardian_token';

let onUnauthorized: (() => void) | null = null;

// AuthContext 會呼叫這個函式註冊「收到 401 時要做什麼」（通常是清空登入狀態、導回登入頁）。
export function registerUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_STORAGE_KEY);
}

export async function setStoredToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
}

export class ApiRequestError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.payload = payload;
  }
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, skipAuth, headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  if (!skipAuth) {
    const token = await getStoredToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // 沒有 body（例如某些 webhook 回應）時忽略解析錯誤。
  }

  if (response.status === 401 && !skipAuth) {
    await setStoredToken(null);
    onUnauthorized?.();
  }

  if (!response.ok) {
    const message =
      (payload as { error?: string; message?: string } | null)?.error ??
      (payload as { error?: string; message?: string } | null)?.message ??
      `伺服器錯誤（${response.status}）`;
    throw new ApiRequestError(message, response.status, payload);
  }

  return payload as T;
}

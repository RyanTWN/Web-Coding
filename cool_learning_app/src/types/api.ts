// 對齊 cool_learning_backend/server.js 裡 B2C 家長帳號相關 API 的回傳格式。
// 修改後端回傳格式時，記得同步更新這裡，否則畫面會拿到型別對不上的資料而不自知。

export interface Guardian {
  id: number;
  email: string;
  displayName: string | null;
}

export interface ChildProfile {
  id: number;
  nickname: string;
  avatar_key: string | null;
  grade_level: string | null;
  linked_seat_no: string;
  created_at: string;
}

export type SubscriptionStatus =
  | 'none'
  | 'trial'
  | 'active'
  | 'grace_period'
  | 'billing_retry'
  | 'expired'
  | 'canceled'
  | 'revoked';

export interface SubscriptionInfo {
  platform: 'apple' | 'google';
  product_id: string;
  status: SubscriptionStatus;
  environment: 'sandbox' | 'production';
  expires_at: string | null;
  updated_at: string;
}

export interface SubscriptionResponse {
  success: boolean;
  status: SubscriptionStatus;
  isEntitled?: boolean;
  data: SubscriptionInfo | null;
}

// 家長註冊/登入/OAuth 三種方式，成功時回傳格式一致。
export interface GuardianAuthResponse {
  success: boolean;
  token?: string;
  guardian?: Guardian;
  error?: string;
  status?: 'locked';
  message?: string;
}

export interface ChildSelectResponse {
  success: boolean;
  token?: string;
  data?: { seatNo: string; nickname: string };
  error?: string;
}

export interface ApiError {
  success: false;
  error: string;
  status?: string;
  message?: string;
}

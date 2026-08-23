// App 內購（訂閱）封裝：StoreKit 2（iOS）/ Google Play Billing（Android）。
// 目前優先做 Google Play 上架，下面的商品 ID 先只填 Android 那組；
// Apple 的 SKU 等要上 App Store 時再補上即可，程式碼結構不用重寫。
//
// 前置作業（尚未完成，需要 Google Play Console 帳號後才能做）：
//   1. Google Play Console：在「訂閱項目」建立商品（例如月費、年費，含 7 天免費試用），
//      把 Product ID 填進下面的 SUBSCRIPTION_SKUS.android。
//   2. 後端要設定好 GOOGLE_PLAY_PACKAGE_NAME / GOOGLE_SERVICE_ACCOUNT_JSON /
//      GOOGLE_PUBSUB_AUDIENCE（見 cool_learning_backend/.env.example），
//      /api/guardian/subscription/verify-purchase 才能真正查到訂閱狀態。
//
// 設計原則：react-native-iap 的購買流程是非同步事件（purchaseUpdatedListener），
// 不是 requestSubscription 呼叫完就結束。收到購買事件後，一定要送
// purchaseToken 給後端驗證（呼叫 Google Play Developer API 拿到真實狀態），
// 確認成功才呼叫 finishTransaction；不要只憑本地事件觸發就當作訂閱已生效，
// 避免離線竄改或重放攻擊。

import { Platform } from 'react-native';
import RNIap, {
  type Subscription,
  type SubscriptionPurchase,
  type PurchaseError,
  purchaseErrorListener,
  purchaseUpdatedListener,
} from 'react-native-iap';
import { apiFetch } from '../api/client';

// TODO: 換成 Google Play Console 實際建立的訂閱商品 ID；Apple 的先留空，之後上架時再補。
const SUBSCRIPTION_SKUS = Platform.select({
  ios: [] as string[],
  android: ['monthly_subscription', 'yearly_subscription'],
  default: [] as string[],
}) as string[];

interface VerifyPurchaseResponse {
  success: boolean;
  status?: string;
  error?: string;
}

let updateListenerHandle: { remove: () => void } | null = null;
let errorListenerHandle: { remove: () => void } | null = null;

export async function initIapConnection(): Promise<void> {
  await RNIap.initConnection();
}

export async function endIapConnection(): Promise<void> {
  stopPurchaseListeners();
  await RNIap.endConnection();
}

export async function fetchAvailableSubscriptions(): Promise<Subscription[]> {
  return RNIap.getSubscriptions({ skus: SUBSCRIPTION_SKUS });
}

export async function purchaseSubscription(sku: string): Promise<void> {
  await RNIap.requestSubscription({ sku });
}

// 在畫面掛載時呼叫一次，訂閱「購買完成/購買失敗」事件；
// 卸載時記得呼叫 stopPurchaseListeners() 避免重複註冊。
export function startPurchaseListeners(
  onVerified: (status: string) => void,
  onError: (message: string) => void
): void {
  updateListenerHandle = purchaseUpdatedListener(async (purchase: SubscriptionPurchase) => {
    try {
      const purchaseToken = purchase.purchaseToken;
      const productId = purchase.productId;
      if (!purchaseToken || !productId) {
        throw new Error('沒有取得 purchaseToken/productId，無法驗證這筆購買');
      }

      // 把 purchaseToken 交給後端，向 Google Play Developer API 查詢真實狀態並寫入 subscriptions 表。
      const result = await apiFetch<VerifyPurchaseResponse>('/guardian/subscription/verify-purchase', {
        method: 'POST',
        body: { purchaseToken, productId },
      });

      // 不論後端驗證結果如何，都要 finishTransaction，避免同一筆購買卡在待處理佇列裡。
      await RNIap.finishTransaction({ purchase, isConsumable: false });

      if (result.success) {
        onVerified(result.status ?? 'active');
      } else {
        onError(result.error ?? '訂閱驗證失敗，請稍後至「訂閱狀態」頁面重新整理確認');
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : '訂閱驗證發生錯誤');
    }
  });

  errorListenerHandle = purchaseErrorListener((error: PurchaseError) => {
    onError(error.message);
  });
}

export function stopPurchaseListeners(): void {
  updateListenerHandle?.remove();
  updateListenerHandle = null;
  errorListenerHandle?.remove();
  errorListenerHandle = null;
}

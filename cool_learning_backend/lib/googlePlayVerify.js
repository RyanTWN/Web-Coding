// Google Play 訂閱驗證：
//   1) 驗證 Real-time Developer Notifications（RTDN）推播真的是 Google Cloud Pub/Sub 送來的
//   2) 呼叫 Google Play Developer API（androidpublisher）查詢某個 purchaseToken 的真實訂閱狀態
//
// 需要的環境變數（上架 Google Play、設定好服務帳號後才會有）：
//   GOOGLE_PLAY_PACKAGE_NAME        App 的 package name，例如 com.coollearning.app
//   GOOGLE_SERVICE_ACCOUNT_JSON     具備 Google Play Console API 存取權限的服務帳號金鑰（JSON 字串）
//   GOOGLE_PUBSUB_AUDIENCE          Pub/Sub push 訂閱設定的這支 webhook 完整網址，用來驗證 OIDC token 的 aud
//   GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL（選填，多一層保護）Pub/Sub push 訂閱使用的服務帳號 email
//
// 在還沒設定這些變數前，以下函式會丟出明確的錯誤，而不是靜默略過驗證。

const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const pubsubOidcClient = new OAuth2Client();
let androidPublisherClientPromise = null;

function getGooglePlayPackageName() {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (!packageName) {
    throw new Error('尚未設定 GOOGLE_PLAY_PACKAGE_NAME，請先在 .env 填入 App 的 package name');
  }
  return packageName;
}

function getGoogleServiceAccountCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('尚未設定 GOOGLE_SERVICE_ACCOUNT_JSON，無法呼叫 Google Play Developer API');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON 不是合法的 JSON，請確認貼上的內容完整');
  }
}

// 服務帳號的 GoogleAuth client 只需要建立一次，重複使用即可。
function getAndroidPublisherClient() {
  if (!androidPublisherClientPromise) {
    const credentials = getGoogleServiceAccountCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });
    androidPublisherClientPromise = Promise.resolve(google.androidpublisher({ version: 'v3', auth }));
  }
  return androidPublisherClientPromise;
}

// 驗證這次 HTTP 請求真的是 Google Cloud Pub/Sub push 訂閱送來的（而不是任何人直接打這支 API）。
// Pub/Sub push 會在 Authorization header 帶一個 Google 簽發的 OIDC token。
async function verifyPubSubPushRequest(req) {
  const audience = process.env.GOOGLE_PUBSUB_AUDIENCE;
  if (!audience) {
    throw new Error('尚未設定 GOOGLE_PUBSUB_AUDIENCE，無法驗證 Pub/Sub 推播來源');
  }
  const authHeader = req.headers?.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) throw new Error('缺少 Pub/Sub 推播的驗證 token（Authorization header）');

  const ticket = await pubsubOidcClient.verifyIdToken({ idToken: token, audience });
  const payload = ticket.getPayload();

  const expectedServiceAccount = process.env.GOOGLE_PUBSUB_SERVICE_ACCOUNT_EMAIL;
  if (expectedServiceAccount && payload?.email !== expectedServiceAccount) {
    throw new Error('Pub/Sub 推播的服務帳號與預期不符，拒絕處理');
  }
  return payload;
}

// 依 Google Play 訂閱資料判斷我們自己系統裡的狀態。
// 規則參考 Google 官方文件：paymentState 2=試用中、0=付款中(等待扣款)；
// 有 cancelReason 代表使用者已取消自動續訂，但在到期日前仍應視為有權限使用。
function mapSubscriptionStatus(subscriptionPurchase) {
  const expiryMs = Number(subscriptionPurchase.expiryTimeMillis);
  if (Number.isFinite(expiryMs) && expiryMs <= Date.now()) return 'expired';
  if (subscriptionPurchase.paymentState === 2) return 'trial';
  if (subscriptionPurchase.paymentState === 0) return 'billing_retry';
  if (subscriptionPurchase.cancelReason !== undefined && subscriptionPurchase.cancelReason !== null) return 'canceled';
  return 'active';
}

// 用 purchaseToken 向 Google 查詢這筆訂閱的最新真實狀態（不要只信任 RTDN 通知本身帶的內容）。
// 同時處理 Google 規定的「3 天內要 acknowledge，否則自動退款」。
async function fetchAndAcknowledgeSubscription({ purchaseToken, productId }) {
  const packageName = getGooglePlayPackageName();
  const androidPublisher = await getAndroidPublisherClient();

  const { data: subscriptionPurchase } = await androidPublisher.purchases.subscriptions.get({
    packageName,
    subscriptionId: productId,
    token: purchaseToken,
  });

  if (subscriptionPurchase.acknowledgementState === 0) {
    await androidPublisher.purchases.subscriptions.acknowledge({
      packageName,
      subscriptionId: productId,
      token: purchaseToken,
      requestBody: {},
    });
  }

  return {
    status: mapSubscriptionStatus(subscriptionPurchase),
    expiresAt: subscriptionPurchase.expiryTimeMillis ? new Date(Number(subscriptionPurchase.expiryTimeMillis)) : null,
    environment: String(subscriptionPurchase.purchaseType) === '0' ? 'sandbox' : 'production',
    raw: subscriptionPurchase,
  };
}

module.exports = {
  verifyPubSubPushRequest,
  fetchAndAcknowledgeSubscription,
  mapSubscriptionStatus,
};

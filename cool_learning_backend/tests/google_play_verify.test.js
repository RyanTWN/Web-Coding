// 驗證 Google Play 訂閱驗證模組在尚未設定必要環境變數時，會丟出明確錯誤而不是靜默通過，
// 以及訂閱狀態判斷邏輯（mapSubscriptionStatus）本身是否正確。
const assert = require('assert');

(async () => {
  delete process.env.GOOGLE_PLAY_PACKAGE_NAME;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  delete process.env.GOOGLE_PUBSUB_AUDIENCE;

  const { verifyPubSubPushRequest, fetchAndAcknowledgeSubscription, mapSubscriptionStatus } = require('../lib/googlePlayVerify');

  await assert.rejects(
    () => verifyPubSubPushRequest({ headers: { authorization: 'Bearer fake' } }),
    /GOOGLE_PUBSUB_AUDIENCE/,
    '未設定 GOOGLE_PUBSUB_AUDIENCE 時應丟出明確錯誤'
  );

  await assert.rejects(
    () => fetchAndAcknowledgeSubscription({ purchaseToken: 'fake', productId: 'fake' }),
    /GOOGLE_PLAY_PACKAGE_NAME/,
    '未設定 GOOGLE_PLAY_PACKAGE_NAME 時應丟出明確錯誤'
  );

  process.env.GOOGLE_PLAY_PACKAGE_NAME = 'com.example.app';
  await assert.rejects(
    () => fetchAndAcknowledgeSubscription({ purchaseToken: 'fake', productId: 'fake' }),
    /GOOGLE_SERVICE_ACCOUNT_JSON/,
    '設定了 package name 但沒設定服務帳號金鑰時，仍應丟出明確錯誤'
  );
  delete process.env.GOOGLE_PLAY_PACKAGE_NAME;

  const now = Date.now();
  assert.strictEqual(
    mapSubscriptionStatus({ expiryTimeMillis: String(now - 60_000), paymentState: 1 }),
    'expired',
    '到期時間已過應判定為 expired（優先於 paymentState）'
  );
  assert.strictEqual(
    mapSubscriptionStatus({ expiryTimeMillis: String(now + 60_000), paymentState: 2 }),
    'trial',
    'paymentState=2 應判定為試用中'
  );
  assert.strictEqual(
    mapSubscriptionStatus({ expiryTimeMillis: String(now + 60_000), paymentState: 0 }),
    'billing_retry',
    'paymentState=0 應判定為扣款失敗重試中'
  );
  assert.strictEqual(
    mapSubscriptionStatus({ expiryTimeMillis: String(now + 60_000), paymentState: 1, cancelReason: 0 }),
    'canceled',
    '有 cancelReason 但尚未到期，應判定為已取消（到期前仍可使用，由 isEntitled 另外判斷）'
  );
  assert.strictEqual(
    mapSubscriptionStatus({ expiryTimeMillis: String(now + 60_000), paymentState: 1 }),
    'active',
    '正常付款中且未到期應判定為 active'
  );

  console.log('google play verify logic tests passed');
})();

// Apple / Google 訂閱 webhook 接收端點。
const express = require('express');

module.exports = function createWebhooksRouter({
  pool, verifyPubSubPushRequest, fetchAndAcknowledgeSubscription,
}) {
  const router = express.Router();

// ------------------------------------------------------------
// Apple App Store Server Notifications V2：目前優先做 Google Play 上架，這支先維持骨架。
//   - Apple 會 POST 一段 signedPayload（JWS），需要用 Apple 根憑證鏈驗證簽章，
//     建議改用官方 SDK：npm i @apple/app-store-server-library
//   - 在 App Store Connect 後台設定這支端點的 URL 作為 Notification URL
//   - 目前只會把原始 payload 存進 subscription_events，方便之後接上真實驗證時比對。
// ------------------------------------------------------------
  router.post('/webhooks/apple-subscription', async (req, res) => {
  try {
    await pool.query(
      "INSERT INTO subscription_events (platform, notification_type, payload) VALUES ('apple', ?, ?)",
      [req.body?.notificationType || null, JSON.stringify(req.body || {})]
    );
    // TODO: 驗證 signedPayload 簽章、解析出 guardian/訂閱狀態，更新 subscriptions 表。
    res.status(200).json({ received: true });
  } catch (err) {
    res.status(500).json({ received: false, error: err.message });
  }
});

// [API] Google Play Real-time Developer Notifications（RTDN）
// 在 Google Cloud Pub/Sub 建立 push 訂閱、Endpoint URL 指向這支即可（見 .env.example 說明）。
  router.post('/webhooks/google-subscription', async (req, res) => {
  let verifiedPayload;
  try {
    verifiedPayload = await verifyPubSubPushRequest(req);
  } catch (err) {
    // 驗證失敗代表這次請求不是 Google 送來的（或設定有誤），直接拒絕，不寫入任何資料。
    console.error('拒絕 Google 訂閱 webhook：', err.message);
    return res.status(401).json({ received: false, error: err.message });
  }

  const messageDataBase64 = req.body?.message?.data;
  let decoded = null;
  try {
    if (messageDataBase64) {
      decoded = JSON.parse(Buffer.from(messageDataBase64, 'base64').toString('utf8'));
    }
  } catch (err) {
    console.error('Google 訂閱 webhook payload 解析失敗：', err.message);
  }

  const notification = decoded?.subscriptionNotification;
  try {
    await pool.query(
      "INSERT INTO subscription_events (platform, notification_type, payload) VALUES ('google', ?, ?)",
      [notification ? String(notification.notificationType) : null, JSON.stringify(decoded ?? req.body ?? {})]
    );
  } catch (err) {
    console.error('寫入 subscription_events 失敗：', err.message);
  }

  // 只有帶 purchaseToken 的訂閱相關通知才需要重新查詢狀態；
  // 其他類型（例如 Google 測試推播 testNotification）先確認收到即可。
  if (!notification?.purchaseToken || !notification?.subscriptionId) {
    return res.status(200).json({ received: true });
  }

  try {
    const [existing] = await pool.query(
      'SELECT guardian_id FROM subscriptions WHERE purchase_token = ? LIMIT 1',
      [notification.purchaseToken]
    );
    if (existing.length === 0) {
      // 還沒有對應的家長帳號紀錄（理論上前端購買完成時會先呼叫 verify-purchase 建立），
      // 先把通知存起來，之後前端補呼叫 verify-purchase 時就會補上關聯。
      console.warn('收到 Google 訂閱通知，但找不到對應的家長帳號，purchaseToken=', notification.purchaseToken);
      return res.status(200).json({ received: true, warning: 'no matching guardian yet' });
    }

    const { status, expiresAt, environment, raw } = await fetchAndAcknowledgeSubscription({
      purchaseToken: notification.purchaseToken,
      productId: notification.subscriptionId,
    });
    await pool.query(
      `UPDATE subscriptions
       SET status = ?, expires_at = ?, environment = ?, raw_payload = ?,
           last_notification_type = ?, updated_at = CURRENT_TIMESTAMP
       WHERE purchase_token = ?`,
      [status, expiresAt, environment, JSON.stringify(raw), String(notification.notificationType), notification.purchaseToken]
    );
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('處理 Google 訂閱 webhook 失敗：', err.message, '（已驗證來源為', verifiedPayload?.email, '）');
    // 已確認來源合法，只是後續處理出錯：回 200 避免 Google 判定失敗而無限重送，
    // 錯誤已經記錄在 server log 與 subscription_events，可事後排查補救。
    res.status(200).json({ received: true, error: err.message });
  }
});

  return router;
};

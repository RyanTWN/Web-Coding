import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { apiFetch } from '../api/client';
import type { SubscriptionResponse } from '../types/api';
import {
  fetchAvailableSubscriptions,
  purchaseSubscription,
  startPurchaseListeners,
  stopPurchaseListeners,
} from '../services/iap';

const STATUS_LABEL: Record<string, string> = {
  none: '尚未開始訂閱',
  trial: '免費試用中',
  active: '訂閱中',
  grace_period: '付款處理中（寬限期）',
  billing_retry: '付款失敗，重試中',
  expired: '已到期',
  canceled: '已取消',
  revoked: '已被撤銷（例如退款）',
};

export default function SubscriptionScreen() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  async function loadSubscription() {
    setLoading(true);
    try {
      const result = await apiFetch<SubscriptionResponse>('/guardian/subscription');
      setSubscription(result);
    } catch (err) {
      Alert.alert('讀取訂閱狀態失敗', err instanceof Error ? err.message : '請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscription();

    // 購買結果是非同步事件：這裡註冊監聽器，收到「後端已驗證完成」才重新整理畫面狀態。
    startPurchaseListeners(
      () => {
        setPurchasing(false);
        loadSubscription();
      },
      (message) => {
        setPurchasing(false);
        Alert.alert('訂閱處理失敗', message);
      }
    );
    return () => stopPurchaseListeners();
  }, []);

  async function handlePurchase() {
    setPurchasing(true);
    try {
      const products = await fetchAvailableSubscriptions();
      if (products.length === 0) {
        Alert.alert('目前沒有可購買的訂閱方案', '這通常代表 Google Play Console 的訂閱商品尚未設定完成。');
        setPurchasing(false);
        return;
      }
      // 購買結果透過上面註冊的 purchaseUpdatedListener 非同步處理，這裡只負責發起購買。
      await purchaseSubscription(products[0].productId);
    } catch (err) {
      setPurchasing(false);
      Alert.alert('購買失敗', err instanceof Error ? err.message : '請稍後再試');
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  const status = subscription?.status ?? 'none';
  const isEntitled = subscription?.isEntitled ?? false;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>訂閱狀態</Text>
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>{STATUS_LABEL[status] ?? status}</Text>
        {subscription?.data?.expires_at && (
          <Text style={styles.statusMeta}>到期日：{new Date(subscription.data.expires_at).toLocaleDateString()}</Text>
        )}
      </View>

      {!isEntitled && (
        <TouchableOpacity style={styles.purchaseButton} onPress={handlePurchase} disabled={purchasing}>
          {purchasing ? <ActivityIndicator color="#fff" /> : <Text style={styles.purchaseButtonText}>開始 7 天免費試用</Text>}
        </TouchableOpacity>
      )}

      <Text style={styles.footnote}>
        訂閱透過 Google Play 處理，可隨時在 Google Play 的訂閱管理中取消。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginTop: 12, marginBottom: 16 },
  statusCard: { backgroundColor: '#fff7ed', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#fed7aa' },
  statusLabel: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  statusMeta: { fontSize: 13, color: '#94a3b8', marginTop: 6 },
  purchaseButton: { backgroundColor: '#f97316', borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  purchaseButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  footnote: { fontSize: 12, color: '#94a3b8', marginTop: 16, textAlign: 'center' },
});

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { ChildProfile } from '../types/api';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Children'>;

export default function ChildrenScreen({ navigation }: Props) {
  const { selectChild, logout } = useAuth();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [creating, setCreating] = useState(false);

  const loadChildren = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<{ success: boolean; data: ChildProfile[] }>('/guardian/children');
      setChildren(result.data || []);
    } catch (err) {
      Alert.alert('讀取子女檔案失敗', err instanceof Error ? err.message : '請稍後再試');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  async function handleAddChild() {
    if (!newNickname.trim()) {
      Alert.alert('請輸入暱稱');
      return;
    }
    setCreating(true);
    try {
      await apiFetch('/guardian/children', {
        method: 'POST',
        body: { nickname: newNickname.trim() },
      });
      setNewNickname('');
      setAddModalVisible(false);
      await loadChildren();
    } catch (err) {
      Alert.alert('新增失敗', err instanceof Error ? err.message : '請稍後再試');
    } finally {
      setCreating(false);
    }
  }

  async function handleSelectChild(child: ChildProfile) {
    try {
      await selectChild(child.id);
      // 選定後導向學習內容（此範例骨架尚未包含科目畫面本身，交由既有網頁版或後續開發銜接）。
      navigation.navigate('Subscription');
    } catch (err) {
      Alert.alert('無法進入學習畫面', err instanceof Error ? err.message : '請稍後再試');
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>選擇要學習的小朋友</Text>

      <FlatList
        data={children}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>還沒有新增任何子女檔案，點選下方按鈕新增一位吧！</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.childCard} onPress={() => handleSelectChild(item)}>
            <Text style={styles.childName}>{item.nickname}</Text>
            {item.grade_level ? <Text style={styles.childMeta}>{item.grade_level}</Text> : null}
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
        <Text style={styles.addButtonText}>+ 新增子女檔案</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Subscription')}>
        <Text style={styles.linkText}>訂閱狀態</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={logout}>
        <Text style={styles.logoutText}>登出</Text>
      </TouchableOpacity>

      <Modal visible={addModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>新增子女檔案</Text>
            <Text style={styles.modalHint}>只需要暱稱就可以了，不用填真實姓名</Text>
            <TextInput
              style={styles.input}
              placeholder="例如：小明"
              value={newNickname}
              onChangeText={setNewNickname}
              editable={!creating}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} disabled={creating}>
                <Text style={styles.modalCancel}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleAddChild} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalConfirmText}>新增</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 16, marginTop: 12 },
  listContent: { paddingBottom: 12 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  childCard: {
    backgroundColor: '#fff7ed', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#fed7aa',
  },
  childName: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  childMeta: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  addButton: { backgroundColor: '#f97316', borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  addButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  linkText: { textAlign: 'center', color: '#f97316', marginTop: 16, fontWeight: '600' },
  logoutText: { textAlign: 'center', color: '#94a3b8', marginTop: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalHint: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },
  input: { borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 16 },
  modalCancel: { color: '#94a3b8', fontWeight: '700', paddingVertical: 10 },
  modalConfirm: { backgroundColor: '#f97316', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  modalConfirmText: { color: '#fff', fontWeight: '700' },
});

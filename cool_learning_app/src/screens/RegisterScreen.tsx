import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { GuardianAuthResponse } from '../types/api';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

// 與後端 isValidGuardianPassword 保持一致：至少 8 碼，需同時包含英文字母與數字。
function isValidPassword(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

export default function RegisterScreen({ navigation }: Props) {
  const { applyGuardianAuthResult } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleRegister() {
    if (!email.trim()) {
      Alert.alert('請輸入 Email');
      return;
    }
    if (!isValidPassword(password)) {
      Alert.alert('密碼格式不符', '密碼至少需要 8 碼，且需同時包含英文字母與數字');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('兩次輸入的密碼不一致');
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiFetch<GuardianAuthResponse>('/guardian/register', {
        method: 'POST',
        skipAuth: true,
        body: { email: email.trim(), password, displayName: displayName.trim() || undefined },
      });
      await applyGuardianAuthResult(result);
    } catch (err) {
      Alert.alert('註冊失敗', err instanceof Error ? err.message : '請稍後再試');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>建立家長帳號</Text>

      <TextInput
        style={styles.input}
        placeholder="你的稱呼（選填）"
        value={displayName}
        onChangeText={setDisplayName}
        editable={!submitting}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!submitting}
      />
      <TextInput
        style={styles.input}
        placeholder="密碼（至少 8 碼，含英文字母與數字）"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!submitting}
      />
      <TextInput
        style={styles.input}
        placeholder="再輸入一次密碼"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        editable={!submitting}
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleRegister} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>註冊並登入</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} disabled={submitting}>
        <Text style={styles.linkText}>已經有帳號了，返回登入</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 24, color: '#1e293b' },
  input: {
    borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16,
    paddingVertical: 12, marginBottom: 12, fontSize: 16,
  },
  primaryButton: { backgroundColor: '#f97316', borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  linkText: { textAlign: 'center', color: '#f97316', marginTop: 16, fontWeight: '600' },
});

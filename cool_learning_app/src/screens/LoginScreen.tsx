// 目前只上 Google Play，先只做 Email+密碼 + Google 登入。
// Sign in with Apple 的程式碼留在 src/services/appleAuth.ts，之後要上 Apple Store
// 時把 import 加回來、把下面被註解掉的按鈕區塊打開即可，不需要重寫。
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { signInWithGoogle } from '../services/googleAuth';
import type { GuardianAuthResponse } from '../types/api';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { applyGuardianAuthResult } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState<'email' | 'google' | null>(null);

  async function handleEmailLogin() {
    if (!email.trim() || !password) {
      Alert.alert('請輸入 Email 與密碼');
      return;
    }
    setSubmitting('email');
    try {
      const result = await apiFetch<GuardianAuthResponse>('/guardian/login', {
        method: 'POST',
        skipAuth: true,
        body: { email: email.trim(), password },
      });
      await applyGuardianAuthResult(result);
    } catch (err) {
      Alert.alert('登入失敗', err instanceof Error ? err.message : '請稍後再試');
    } finally {
      setSubmitting(null);
    }
  }

  async function handleGoogleLogin() {
    setSubmitting('google');
    try {
      const result = await signInWithGoogle();
      await applyGuardianAuthResult(result);
    } catch (err) {
      Alert.alert('Google 登入失敗', err instanceof Error ? err.message : '請稍後再試');
    } finally {
      setSubmitting(null);
    }
  }

  const busy = submitting !== null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>酷學習</Text>
      <Text style={styles.subtitle}>家長登入</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!busy}
      />
      <TextInput
        style={styles.input}
        placeholder="密碼"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!busy}
      />

      <TouchableOpacity style={styles.primaryButton} onPress={handleEmailLogin} disabled={busy}>
        {submitting === 'email' ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>登入</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')} disabled={busy}>
        <Text style={styles.linkText}>還沒有帳號？註冊一個</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin} disabled={busy}>
        {submitting === 'google' ? <ActivityIndicator /> : <Text style={styles.googleButtonText}>使用 Google 帳號登入</Text>}
      </TouchableOpacity>

      {/*
        之後要上 Apple Store 時，把這段打開，並把
        `import { isAppleSignInAvailable, signInWithApple } from '../services/appleAuth';`
        和 `Platform` 的 import 加回來即可：

        {Platform.OS === 'ios' && isAppleSignInAvailable() && (
          <TouchableOpacity style={styles.appleButton} onPress={handleAppleLogin} disabled={busy}>
            <Text style={styles.appleButtonText}> Sign in with Apple</Text>
          </TouchableOpacity>
        )}
      */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: '900', textAlign: 'center', color: '#f97316' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#64748b', marginBottom: 24 },
  input: {
    borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16,
    paddingVertical: 12, marginBottom: 12, fontSize: 16,
  },
  primaryButton: { backgroundColor: '#f97316', borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  primaryButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  linkText: { textAlign: 'center', color: '#f97316', marginTop: 16, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 24 },
  appleButton: { backgroundColor: '#000', borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  appleButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  googleButton: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 16,
    paddingVertical: 14, alignItems: 'center',
  },
  googleButtonText: { color: '#1e293b', fontWeight: '700', fontSize: 16 },
});

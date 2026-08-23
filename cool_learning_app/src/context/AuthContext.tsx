// 管理「家長登入狀態」與「目前選擇的子女檔案」。
//
// 分兩層 token：
//   - guardianToken：家長登入後拿到，角色 role='guardian'，用來呼叫
//     /api/guardian/* 系列 API（子女檔案管理、訂閱查詢）。
//   - studentToken：家長在 App 內選擇某個子女檔案後，呼叫
//     /api/guardian/children/:id/select 換來的，角色 role='student'，
//     用來呼叫既有的英文/數學/自然科學習 API（沿用 requireOwnSeat 保護的路由）。
// 兩者都存在 AsyncStorage；apiFetch 目前只認一組「目前使用中的 token」，
// 切換「家長管理畫面」和「子女學習畫面」時要呼叫對應的 setActiveRole。

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, registerUnauthorizedHandler, setStoredToken } from '../api/client';
import type { Guardian, GuardianAuthResponse, ChildSelectResponse } from '../types/api';

const GUARDIAN_TOKEN_KEY = 'cool_learning_guardian_token';
const STUDENT_TOKEN_KEY = 'cool_learning_student_token';
const STUDENT_INFO_KEY = 'cool_learning_student_info';

interface StudentSession {
  seatNo: string;
  nickname: string;
}

interface AuthContextValue {
  isLoading: boolean;
  guardian: Guardian | null;
  studentSession: StudentSession | null;
  applyGuardianAuthResult: (result: GuardianAuthResponse) => Promise<void>;
  selectChild: (childId: number) => Promise<void>;
  exitChildSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [guardian, setGuardian] = useState<Guardian | null>(null);
  const [studentSession, setStudentSession] = useState<StudentSession | null>(null);

  // App 啟動時嘗試從 AsyncStorage 還原登入狀態。
  useEffect(() => {
    (async () => {
      try {
        const [storedGuardianToken, storedStudentToken, storedStudentInfoRaw] = await Promise.all([
          AsyncStorage.getItem(GUARDIAN_TOKEN_KEY),
          AsyncStorage.getItem(STUDENT_TOKEN_KEY),
          AsyncStorage.getItem(STUDENT_INFO_KEY),
        ]);
        if (storedGuardianToken) {
          await setStoredToken(storedGuardianToken);
          // token 是否仍有效交由第一次呼叫 API 時的 401 處理機制判斷，這裡先樂觀還原。
          setGuardian({ id: 0, email: '', displayName: null });
        }
        if (storedStudentToken && storedStudentInfoRaw) {
          setStudentSession(JSON.parse(storedStudentInfoRaw));
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // 收到 401（token 過期/被撤銷）時，統一清空登入狀態、導回登入頁。
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setGuardian(null);
      setStudentSession(null);
      AsyncStorage.multiRemove([GUARDIAN_TOKEN_KEY, STUDENT_TOKEN_KEY, STUDENT_INFO_KEY]).catch(() => {});
    });
  }, []);

  const applyGuardianAuthResult = useCallback(async (result: GuardianAuthResponse) => {
    if (!result.success || !result.token || !result.guardian) {
      throw new Error(result.error || result.message || '登入失敗');
    }
    await AsyncStorage.setItem(GUARDIAN_TOKEN_KEY, result.token);
    await setStoredToken(result.token);
    setGuardian(result.guardian);
  }, []);

  const selectChild = useCallback(async (childId: number) => {
    // 切換到家長 token，確保這個請求是用家長身份呼叫。
    const guardianToken = await AsyncStorage.getItem(GUARDIAN_TOKEN_KEY);
    if (guardianToken) await setStoredToken(guardianToken);

    const result = await apiFetch<ChildSelectResponse>(`/guardian/children/${childId}/select`, {
      method: 'POST',
    });
    if (!result.success || !result.token || !result.data) {
      throw new Error(result.error || '選擇子女檔案失敗');
    }
    await AsyncStorage.setItem(STUDENT_TOKEN_KEY, result.token);
    await AsyncStorage.setItem(STUDENT_INFO_KEY, JSON.stringify(result.data));
    await setStoredToken(result.token);
    setStudentSession({ seatNo: result.data.seatNo, nickname: result.data.nickname });
  }, []);

  // 從「子女學習畫面」返回「家長管理畫面」：清掉 student token、換回 guardian token。
  const exitChildSession = useCallback(async () => {
    await AsyncStorage.removeItem(STUDENT_TOKEN_KEY);
    await AsyncStorage.removeItem(STUDENT_INFO_KEY);
    setStudentSession(null);
    const guardianToken = await AsyncStorage.getItem(GUARDIAN_TOKEN_KEY);
    await setStoredToken(guardianToken);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([GUARDIAN_TOKEN_KEY, STUDENT_TOKEN_KEY, STUDENT_INFO_KEY]);
    await setStoredToken(null);
    setGuardian(null);
    setStudentSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ isLoading, guardian, studentSession, applyGuardianAuthResult, selectChild, exitChildSession, logout }),
    [isLoading, guardian, studentSession, applyGuardianAuthResult, selectChild, exitChildSession, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必須在 AuthProvider 底下使用');
  return ctx;
}

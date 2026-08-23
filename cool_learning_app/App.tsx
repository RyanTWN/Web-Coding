import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

// 這支 App.tsx 要複製進用 `react-native init` 產生的真正專案殼之後才能實際執行
// （目前這個資料夾沒有 ios/android 原生專案，只有 TypeScript 商業邏輯與畫面）。
export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

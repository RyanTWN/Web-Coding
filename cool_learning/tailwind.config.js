// Tailwind 設定：對齊原本各 HTML 頁面裡透過 CDN <script> 內嵌的 tailwind.config。
// brand-400/500/600/700 其實就是 Tailwind 內建 blue 色階的原值，只是自訂了較淺的
// 50/100，因此 200/300 也直接沿用 Tailwind 內建 blue-200/blue-300，維持色階連續。
//
// content 涵蓋所有 HTML 頁面與 assets/js 底下的程式碼——admin.js/app.js/nature.js/quiz.js
// 裡有不少 class 是用字串組成的 HTML 片段（例如管理後台的狀態徽章），Tailwind 的靜態掃描
// 必須看得到這些檔案，才不會漏產生對應的 CSS。
module.exports = {
  content: ['./*.html', './assets/js/**/*.js'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
      fontFamily: {
        sans: ['Fredoka', 'Noto Sans TC', 'sans-serif'],
      },
      boxShadow: {
        // 漫畫風專屬粗黑陰影；原本只在 english.html 的內嵌 tailwind.config 有定義，
        // 但 app.js 裡也有用到 shadow-comic 系列 class，所以併入共用設定，
        // 避免其他頁面（例如 index.html）用到時因為沒有這個設定而沒有樣式。
        comic: '5px 5px 0px 0px rgba(15, 23, 42, 1)',
        'comic-lg': '8px 8px 0px 0px rgba(15, 23, 42, 1)',
        'comic-active': '2px 2px 0px 0px rgba(15, 23, 42, 1)',
      },
    },
  },
  plugins: [],
};

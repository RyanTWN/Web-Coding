// 共用日期工具函式。

function getTaipeiDateKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date());
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

module.exports = { getTaipeiDateKey, isDateKey };

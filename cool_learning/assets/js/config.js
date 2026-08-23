// 全站共用設定：唯一的 API_BASE_URL 來源。
// 這個檔案必須在 app.js / nature.js / math.html 的內嵌 script 之前載入，
// 這幾支檔案都會直接使用這裡定義的全域常數，不再各自宣告一份。
// 之後如果要切換環境（例如本機開發用 http://localhost:4060/api），只需要改這一個地方。
const API_BASE_URL = 'https://learning.ifit.myds.me:4061/api';

// 邊玩邊學小遊戲（搶救字母大作戰、洞築機先、光速小鼠、傑克與魔豆）成績與遊玩記錄
const express = require('express');

module.exports = function createGamesRouter({ pool, requireAuth, requireOwnSeat }) {
  const router = express.Router();
  const VALID_GAMES = new Set(['rescue', 'idiom', 'mouse', 'beanstalk']);

  // [API] 儲存/更新小遊戲遊玩成績與最高紀錄
  router.post('/games/record', requireAuth, requireOwnSeat, async (req, res) => {
    const seatNo = String(req.body?.seatNo || '').trim();
    const gameId = String(req.body?.gameId || '').trim().toLowerCase();
    const score = Math.max(0, Math.round(Number(req.body?.score || 0)));
    const stat = Math.max(0, Math.round(Number(req.body?.stat || 0)));

    if (!seatNo || !VALID_GAMES.has(gameId)) {
      return res.status(400).json({ success: false, error: '無效的學生座號或遊戲代碼' });
    }

    try {
      await pool.query(
        `INSERT INTO student_game_records (seat_no, game_id, play_count, high_score, max_stat, last_played_at)
         VALUES (?, ?, 1, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           play_count = play_count + 1,
           high_score = GREATEST(high_score, VALUES(high_score)),
           max_stat = GREATEST(max_stat, VALUES(max_stat)),
           last_played_at = NOW()`,
        [seatNo, gameId, score, stat]
      );
      res.json({ success: true, gameId, score, stat });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // [API] 查詢指定學生的 4 款小遊戲成績
  router.get('/games/records', requireAuth, requireOwnSeat, async (req, res) => {
    const seatNo = String(req.query?.seatNo || '').trim();
    if (!seatNo) return res.status(400).json({ success: false, error: '缺少座號' });

    try {
      const [rows] = await pool.query(
        'SELECT game_id, play_count, high_score, max_stat, last_played_at FROM student_game_records WHERE seat_no = ?',
        [seatNo]
      );
      res.json({ success: true, records: rows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // [API] 繁體中文手寫筆跡辨識反向代理（備援方案）
  router.post('/games/handwriting', async (req, res) => {
    try {
      const ink = req.body?.ink;
      if (!ink || !Array.isArray(ink)) {
        return res.status(400).json({ success: false, error: '缺少筆跡資訊' });
      }
      const width = Number(req.body?.width) || 300;
      const height = Number(req.body?.height) || 300;
      const payload = {
        app_version: 0.4,
        api_level: '537.36',
        device: '537.36',
        input_type: '0',
        options: 'enable_pre_space',
        requests: [{
          writing_guide: { writing_area_width: width, writing_area_height: height },
          pre_context: '',
          max_num_results: 10,
          max_completions: 0,
          language: 'zh_TW',
          ink: ink
        }]
      };
      const googleRes = await fetch('https://inputtools.google.com/request?ime=handwriting&app=cool_learning&cs=1&oe=UTF-8', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await googleRes.json();
      if (Array.isArray(data) && data[0] === 'SUCCESS' && data[1] && data[1][0]) {
        const candidates = data[1][0][1] || [];
        return res.json({ success: true, candidates });
      }
      res.json({ success: true, candidates: [] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};

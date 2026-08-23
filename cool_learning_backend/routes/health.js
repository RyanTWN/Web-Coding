// 健康檢查端點。
const express = require('express');

module.exports = function createHealthRouter({ pool, APP_VERSION }) {
  const router = express.Router();

  router.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', version: APP_VERSION, database: 'connected' });
    } catch (err) {
      res.status(503).json({ status: 'error', version: APP_VERSION, database: 'unavailable' });
    }
  });

  return router;
};

const express = require('express');
const router = express.Router();

// 引入我们的保安（鉴权中间件）
const { protect } = require('../middlewares/auth');
// 引入我们的业务员（赛事控制器）
const { createMatch } = require('../controllers/matchController');

// 定义路径：POST /
// 注意这里的流水线顺序：先经过 protect 检查，通过了才进入 createMatch
router.post('/', protect, createMatch);

module.exports = router;

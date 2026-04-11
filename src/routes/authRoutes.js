const express = require('express');
const router = express.Router();
// 引入上面写的逻辑控制器
const { wxLogin } = require('../controllers/authController');

// 定义路径：当收到 POST 请求到 /register 时，执行 register 函数
router.post('/wx-login', wxLogin);

module.exports = router;

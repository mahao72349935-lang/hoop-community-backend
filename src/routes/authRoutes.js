const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// 手机号 + 密码 注册（附带微信 code 静默绑定 openid）
router.post('/register', register);

// 手机号 + 密码 登录（附带微信 code 静默绑定 openid）
router.post('/login', login);

module.exports = router;

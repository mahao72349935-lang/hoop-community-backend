const express = require('express');
const router = express.Router();
const { getUserInfo, updateUserInfo } = require('../controllers/userController');
const { protect } = require('../middlewares/auth');

// 以下所有路由都需要登录 Token
router.use(protect);

// 获取当前用户信息
router.get('/profile/info', getUserInfo);

// 更新当前用户信息
router.post('/updateUserInfo', updateUserInfo);

module.exports = router;

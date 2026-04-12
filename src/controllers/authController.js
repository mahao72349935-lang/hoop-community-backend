const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 辅助函数：生成 JWT Token
const generateToken = (id) => {
	return jwt.sign({ id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRE,
	});
};

// @desc    微信一键登录/注册
// @route   POST /api/v1/auth/wx-login
exports.wxLogin = async (req, res, next) => {
	try {
		const { code, nickName, avatarUrl } = req.body;

		if (!code) {
			return res.status(400).json({ success: false, message: '请提供微信 code' });
		}

		// ─── 【修复后的测试后门逻辑】 ────────────────────────────
		if (code === 'mock_test_code') {
			const mockOpenid = 'test_openid_888';
			let user = await User.findOne({ openId: mockOpenid });

			if (!user) {
				user = await User.create({
					openId: mockOpenid,
					username: `wx_mock_${Date.now()}`,
					password: 'default_mock_password',
					nickname: nickName || '测试队长',
					avatarUrl: avatarUrl || '',
				});
			}

			const token = generateToken(user._id);
			return res.status(200).json({
				success: true,
				message: '【Mock模式】登录成功',
				token,
				data: user,
			});
		}
		// ───────────────────────────────────────────────────

		// 1. 调用微信 API 换取 openid (真实流程)
		const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${process.env.WX_APP_ID}&secret=${process.env.WX_APP_SECRET}&js_code=${code}&grant_type=authorization_code`;

		const wxResponse = await axios.get(wxUrl);
		const { openid, errmsg } = wxResponse.data;

		if (!openid) {
			return res.status(400).json({ success: false, message: `微信登录失败: ${errmsg}` });
		}

		// 2. 查找用户是否存在，不存在则创建
		let user = await User.findOne({ openId: openid });
		if (!user) {
			user = await User.create({
				openId: openid,
				username: `wx_${openid.substring(0, 8)}_${Date.now()}`,
				password: 'default_wx_password',
				nickname: nickName,
				avatarUrl,
			});
		}

		// 3. 签发 Token
		const token = generateToken(user._id);

		res.status(200).json({
			success: true,
			token,
			data: user,
		});
	} catch (err) {
		next(err);
	}
};

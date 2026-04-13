const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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
		const { code, encryptedData, iv, nickName, avatarUrl } = req.body;

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
					phone: '18629949036',
					username: `wx_mock_${Date.now()}`,
					password: 'default_mock_password',
					nickname: nickName || '测试队长',
					avatarUrl: avatarUrl || '',
				});
			} else if (!user.phone) {
				user.phone = '18629949036';
				await user.save();
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

		// 1. 调用微信 API 换取 openid 和 session_key (真实流程)
		const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${process.env.WX_APP_ID}&secret=${process.env.WX_APP_SECRET}&js_code=${code}&grant_type=authorization_code`;

		const wxResponse = await axios.get(wxUrl);
		const { openid, session_key, errmsg } = wxResponse.data;

		if (!openid) {
			return res.status(400).json({ success: false, message: `微信登录失败: ${errmsg}` });
		}

		// 若有授权手机号的数据，则尝试解密以提取手机号
		let phone = undefined;
		if (encryptedData && iv && session_key) {
			try {
				const sessionKeyBuffer = Buffer.from(session_key, 'base64');
				const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
				const ivBuffer = Buffer.from(iv, 'base64');

				const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer);
				decipher.setAutoPadding(true);
				let decoded = decipher.update(encryptedDataBuffer, 'binary', 'utf8');
				decoded += decipher.final('utf8');
				decoded = JSON.parse(decoded);

				if (decoded.watermark && decoded.watermark.appid === process.env.WX_APP_ID) {
					phone = decoded.purePhoneNumber || decoded.phoneNumber;
				}
			} catch (decodeErr) {
				console.error('微信手机号解密失败:', decodeErr);
				// 当解密失败时，可以只抛出警告而不阻断登录
			}
		}

		// 2. 查找用户是否存在，不存在则创建
		let user = await User.findOne({ openId: openid });
		if (!user) {
			user = await User.create({
				openId: openid,
				phone: phone,
				username: `wx_${openid.substring(0, 8)}_${Date.now()}`,
				password: 'default_wx_password',
				nickname: nickName,
				avatarUrl,
			});
		} else if (phone && !user.phone) {
			// 更新老用户之前没有的手机号
			user.phone = phone;
			await user.save();
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

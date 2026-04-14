const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 辅助函数：生成 JWT Token
const generateToken = (id) => {
	return jwt.sign({ id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRE,
	});
};

// ─── 内部工具：静默换取微信 openid ────────────────────────────
// 失败时返回 null，不抛异常，不阻断主流程
const resolveWechatOpenid = async (wechatCode) => {
	if (!wechatCode) return null;
	try {
		const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${process.env.WX_APP_ID}&secret=${process.env.WX_APP_SECRET}&js_code=${wechatCode}&grant_type=authorization_code`;
		const wxRes = await axios.get(wxUrl);
		if (wxRes.data && wxRes.data.openid) {
			return wxRes.data.openid;
		}
		console.warn('微信 code 换取 openid 失败:', wxRes.data.errmsg);
	} catch (err) {
		console.warn('微信接口请求异常，跳过 openid 绑定:', err.message);
	}
	return null;
};

// @desc    手机号 + 密码 注册
// @route   POST /api/v1/auth/register
exports.register = async (req, res, next) => {
	try {
		const { phone, password, wechatCode } = req.body;
		console.log('%c [ req.body ]-34', 'font-size:13px; background:pink; color:#bf2c9f;', req.body)

		if (!phone || !password) {
			return res.status(400).json({ code: 400, success: false, message: '请提供手机号和密码' });
		}

		// 检查手机号是否已被注册
		const existing = await User.findOne({ phone });
		if (existing) {
			return res.status(409).json({ code: 409, success: false, message: '该手机号已注册，请直接登录' });
		}

		// 静默换取微信 openid（失败不阻断注册）
		let wechatOpenid = await resolveWechatOpenid(wechatCode);

		// 若 openid 已被其他账号绑定，则放弃绑定（不阻止注册）
		if (wechatOpenid) {
			const openidConflict = await User.findOne({ openId: wechatOpenid });
			if (openidConflict) {
				console.warn(`openid ${wechatOpenid} 已被用户 ${openidConflict._id} 绑定，本次注册跳过 openid 绑定`);
				wechatOpenid = null;
			}
		}

		const newUser = await User.create({
			phone,
			password,
			username: `user_${phone.slice(-4)}_${Date.now()}`, // 默认用户名，后续可在个人信息页修改
			...(wechatOpenid ? { openId: wechatOpenid } : {}),
		});

		const token = generateToken(newUser._id);
		const userInfo = newUser.toObject();
		delete userInfo.password;

		return res.status(200).json({
			code: 200,
			success: true,
			message: '注册成功',
			data: {
				userInfo,
				accessToken: token,
			},
		});
	} catch (err) {
		next(err);
	}
};

// @desc    手机号 + 密码 登录（附带微信 code 静默绑定 openid）
// @route   POST /api/v1/auth/login
exports.login = async (req, res, next) => {
	try {
		const { phone, password, wechatCode } = req.body;

		if (!phone || !password) {
			return res.status(400).json({ code: 400, success: false, message: '请提供手机号和密码' });
		}

		// 查找用户（select +password 因为 schema 中设了 select: false）
		const user = await User.findOne({ phone }).select('+password');
		if (!user) {
			return res.status(401).json({ code: 401, success: false, message: '手机号未注册' });
		}

		if (!user.password) {
			return res.status(401).json({ code: 401, success: false, message: '该账号未设置密码，请使用其他方式登录' });
		}

		const isMatch = await user.correctPassword(password);
		if (!isMatch) {
			return res.status(401).json({ code: 401, success: false, message: '密码错误' });
		}

		// 静默换取微信 openid，若用户尚未绑定则顺手绑定
		if (!user.openId) {
			const wechatOpenid = await resolveWechatOpenid(wechatCode);
			if (wechatOpenid) {
				const openidConflict = await User.findOne({ openId: wechatOpenid });
				if (!openidConflict) {
					user.openId = wechatOpenid;
				} else {
					console.warn(`openid ${wechatOpenid} 已被用户 ${openidConflict._id} 绑定，跳过本次绑定`);
				}
			}
		}

		user.lastLoginAt = new Date();
		await user.save();

		const token = generateToken(user._id);
		const userInfo = user.toObject();
		delete userInfo.password;

		return res.status(200).json({
			code: 200,
			success: true,
			message: '登录成功',
			data: {
				userInfo,
				accessToken: token,
			},
		});
	} catch (err) {
		next(err);
	}
};

const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const generateToken = (id) => {
	return jwt.sign({ id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRE,
	});
};

// 静默换取微信 openid，失败返回 null 不抛异常
const resolveWechatOpenid = async (wechatCode) => {
	if (!wechatCode) return null;
	try {
		const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${process.env.WX_APP_ID}&secret=${process.env.WX_APP_SECRET}&js_code=${wechatCode}&grant_type=authorization_code`;
		const wxRes = await axios.get(wxUrl);
		if (wxRes.data?.openid) {
			return wxRes.data.openid;
		}
		console.warn('微信 code 换取 openid 失败:', wxRes.data.errmsg);
	} catch (err) {
		console.warn('微信接口请求异常，跳过 openid 绑定:', err.message);
	}
	return null;
};

// 尝试绑定 openid，已被占用则放弃
const tryBindOpenid = async (wechatCode) => {
	const openid = await resolveWechatOpenid(wechatCode);
	if (!openid) return null;

	const conflict = await User.findOne({ openId: openid });
	if (conflict) {
		console.warn(`openid ${openid} 已被用户 ${conflict._id} 绑定，跳过`);
		return null;
	}
	return openid;
};

/**
 * 注册：手机号 + 密码
 * @returns {{ userInfo: object, accessToken: string }}
 * @throws  业务异常（Controller 层负责映射到 HTTP 状态码）
 */
exports.register = async ({ phone, password, wechatCode }) => {
	if (!phone || !password) {
		throw new AppError('请提供手机号和密码', 400);
	}

	const existing = await User.findOne({ phone });
	if (existing) {
		throw new AppError('该手机号已注册，请直接登录', 409);
	}

	const wechatOpenid = await tryBindOpenid(wechatCode);

	const newUser = await User.create({
		phone,
		password,
		username: `user_${phone.slice(-4)}_${Date.now()}`,
		...(wechatOpenid ? { openId: wechatOpenid } : {}),
	});

	const token = generateToken(newUser._id);
	const userInfo = newUser.toObject();
	delete userInfo.password;

	return { userInfo, accessToken: token };
};

/**
 * 登录：手机号 + 密码（附带静默绑定微信 openid）
 * @returns {{ userInfo: object, accessToken: string }}
 */
exports.login = async ({ phone, password, wechatCode }) => {
	if (!phone || !password) {
		throw new AppError('请提供手机号和密码', 400);
	}

	const user = await User.findOne({ phone }).select('+password');
	if (!user) {
		throw new AppError('手机号未注册', 401);
	}

	if (!user.password) {
		throw new AppError('该账号未设置密码，请使用其他方式登录', 401);
	}

	const isMatch = await user.correctPassword(password);
	if (!isMatch) {
		throw new AppError('密码错误', 401);
	}

	if (!user.openId) {
		const openid = await tryBindOpenid(wechatCode);
		if (openid) user.openId = openid;
	}

	user.lastLoginAt = new Date();
	await user.save();

	const token = generateToken(user._id);
	const userInfo = user.toObject();
	delete userInfo.password;

	return { userInfo, accessToken: token };
};

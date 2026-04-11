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

		// 1. 调用微信 API 换取 openid
		const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${process.env.WX_APP_ID}&secret=${process.env.WX_APP_SECRET}&js_code=${code}&grant_type=authorization_code`;

		const wxResponse = await axios.get(wxUrl);
		const { openid, errmsg } = wxResponse.data;

		if (!openid) {
			return res.status(400).json({ success: false, message: `微信登录失败: ${errmsg}` });
		}

		// 2. 查找用户是否存在，不存在则创建（自动注册）
		let user = await User.findOne({ openid });

		if (!user) {
			user = await User.create({
				openid,
				nickName,
				avatarUrl,
				// 其他体育数据初次创建时可留空，后续引导用户完善
			});
		}

		// 3. 签发 Token（有效期半年）
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

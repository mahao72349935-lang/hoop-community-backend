const { register, login } = require('../services/authService');
// @desc    手机号 + 密码 注册
// @route   POST /api/v1/auth/register
exports.register = async (req, res, next) => {
	try {
		const result = await register(req.body);
		return res.status(200).json({
			code: 200,
			success: true,
			message: '注册成功',
			data: result,
		});
	} catch (err) {
		next(err);
	}
};

// @desc    手机号 + 密码 登录
// @route   POST /api/v1/auth/login
exports.login = async (req, res, next) => {
	try {
		const result = await login(req.body);
		return res.status(200).json({
			code: 200,
			success: true,
			message: '登录成功',
			data: result,
		});
	} catch (err) {
		next(err);
	}
};

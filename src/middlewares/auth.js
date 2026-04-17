const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

exports.protect = async (req, res, next) => {
	try {
		// 1. 从请求头提取 token
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new AppError('未登录，请先登录', 401);
		}
		const token = authHeader.split(' ')[1];
		if (!token) throw new AppError('未登录，请先登录', 401);

		// 2. 验证 token（不合法/过期会抛错，走下面 catch）
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// 3. 兼容两种签发 key（id 或 userId），迁移期很方便
		const userId = decoded.id || decoded.userId;
		if (!userId) throw new AppError('Token 无效', 401);

		// 4. 查用户
		const user = await User.findById(userId);
		if (!user) throw new AppError('Token 对应的用户不存在', 401);

		// 5. 挂到 req 上
		req.user = user;
		next();
	} catch (err) {
		// 区分 JWT 自带的错误类型，给前端更精确的提示
		if (err.name === 'TokenExpiredError') {
			return next(new AppError('登录已过期，请重新登录', 401));
		}
		if (err.name === 'JsonWebTokenError') {
			return next(new AppError('Token 无效', 401));
		}
		next(err);
	}
};

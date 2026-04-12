const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 保护路由的中间件
exports.protect = async (req, res, next) => {
	try {
		let token;

		// 1. 检查请求头里是否有 Authorization 且以 Bearer 开头
		if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
			token = req.headers.authorization.split(' ')[1];
		}

		if (!token) {
			return res.status(401).json({ success: false, message: '请先登录以访问此资源' });
		}

		// 2. 验证 Token
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// 3. 把当前用户信息存入 req 对象，方便后续 Controller 使用
		req.user = await User.findById(decoded.id);

		next();
	} catch (err) {
		res.status(401).json({ success: false, message: '登录已失效，请重新登录' });
	}
};

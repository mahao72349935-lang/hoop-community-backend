const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 保护路由的中间件
exports.protect = async (req, res, next) => {
	let token;

	// 1. 从请求头中提取 Token（Authorization: Bearer xxxx）
	if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
		token = req.headers.authorization.split(' ')[1];
	}

	if (!token) {
		return res.status(401).json({ success: false, message: '未登录，请先登录' });
	}

	try {
		// 2. 验证 Token 是否合法 / 是否过期
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// 3. 根据 Token 里的 id 查询用户
		const user = await User.findById(decoded.id);
		if (!user) {
			return res.status(401).json({ success: false, message: 'Token 对应的用户不存在' });
		}

		// 4. 挂载到 req，供后续 Controller 使用（password 在 Schema 中 select: false，不会返回）
		req.user = user;
		next();
	} catch (err) {
		return res.status(401).json({ success: false, message: 'Token 无效或已过期' });
	}
};

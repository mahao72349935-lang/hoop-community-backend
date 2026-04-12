const Match = require('../models/Match');

// @desc    创建/发布约赛
// @route   POST /api/v1/matches
// @access  Private (需要登录)
exports.createMatch = async (req, res, next) => {
	try {
		// 【核心安全逻辑】：千万不能相信前端传过来的用户 ID！
		// 前端如果传来别人的 ID，就能伪造别人发比赛。
		// 我们必须从 req.user (这是 auth 中间件解析 Token 后挂载的真实用户) 中获取

		// 初始化 initiator 对象，提取前端可能传来的团队 ID，但 user 必须是当前登录的真实用户
		const matchData = {
			...req.body,
			initiator: {
				...(req.body.initiator || {}), // 如果前端传了 initiator.team，保留它
				user: req.user.id, // 强行覆盖 user 为当前真实登录用户
			},
		};

		// 在数据库中创建这条赛事记录
		const match = await Match.create(matchData);

		// 返回成功响应
		res.status(201).json({
			success: true,
			data: match,
		});
	} catch (err) {
		// 如果缺少必填字段（比如 venue），Mongoose 会报错，交给全局异常处理器
		next(err);
	}
};

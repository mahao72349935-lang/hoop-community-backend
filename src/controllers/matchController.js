const { createMatch } = require('../services/matchService');

// @desc    创建/发布约赛
// @route   POST /api/v1/matches
// @access  Private (需要登录)
exports.createMatch = async (req, res, next) => {
	try {
		const match = await createMatch({
			body: req.body,
			currentUserId: req.user._id,
		});
		res.status(201).json({
			success: true,
			data: match,
		});
	} catch (err) {
		next(err);
	}
};

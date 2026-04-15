const { getUserInfo, updateUserInfo } = require('../services/userService');

// @desc    获取用户信息：不传 userId → 当前登录用户；?userId= → 指定用户（脱敏）
// @route   GET /api/v1/user/profile/info
// @access  Private（需要 Token）
exports.getUserInfo = async (req, res, next) => {
	try {
		const userInfo = await getUserInfo({
			currentUserId: req.user._id,
			queryUserId: req.query.userId,
		});
		return res.status(200).json({
			code: 200,
			success: true,
			message: '获取用户信息成功',
			data: userInfo,
		});
	} catch (err) {
		next(err);
	}
};

// @desc    更新当前登录用户的个人信息
// @route   PUT /api/v1/user/info
// @access  Private（需要 Token）
exports.updateUserInfo = async (req, res, next) => {
	try {
		await updateUserInfo({ userId: req.user._id, body: req.body });
		return res.status(200).json({
			code: 200,
			success: true,
			message: '更新成功',
		});
	} catch (err) {
		next(err);
	}
};

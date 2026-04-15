const { createTeam, updateTeam } = require('../services/teamService');

// @desc    创建球队
// @route   POST /api/v1/teams
// @access  Private（需要 Token）
exports.createTeam = async (req, res, next) => {
	try {
		const newTeam = await createTeam({ ...req.body, userId: req.user._id });
		return res.status(201).json({
			code: 201,
			success: true,
			message: '球队创建成功',
			data: newTeam,
		});
	} catch (err) {
		next(err);
	}
};

// @desc    编辑球队基本信息
// @route   POST /api/v1/teams/update
// @access  Private（需要 Token）
exports.updateTeam = async (req, res, next) => {
	try {
		const updatedTeam = await updateTeam({ userId: req.user._id, body: req.body });
		return res.status(200).json({
			code: 200,
			success: true,
			message: '球队资料更新成功',
			data: updatedTeam,
		});
	} catch (err) {
		next(err);
	}
};

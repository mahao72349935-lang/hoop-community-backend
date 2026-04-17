const mongoose = require('mongoose');
const Team = require('../../../models/Team');
const AppError = require('../../../utils/AppError');

/**
 * 校验"当前用户是该球队成员"，可选限制角色
 * @param 67 opts
 * @returns {Promise<{68}>}
 */
exports.assertTeamMember = async ({ teamId, userId, allowedRoles }) => {
	if (!mongoose.isValidObjectId(teamId)) {
		throw new AppError('teamId 不合法', 400);
	}

	const team = await Team.findById(teamId);
	if (!team) throw new AppError('找不到该球队', 404);
	if (team.status === 'disbanded') throw new AppError('该球队已解散', 410);

	const member = team.members.find((m) => m.user.toString() === userId.toString());
	if (!member) throw new AppError('你不是该球队成员', 403);

	if (allowedRoles && !allowedRoles.includes(member.role)) {
		throw new AppError('权限不足', 403);
	}

	return { team, member };
};

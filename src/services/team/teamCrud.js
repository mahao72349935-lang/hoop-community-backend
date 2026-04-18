const crypto = require('crypto');
const Team = require('../../models/Team');
const User = require('../../models/User');
const AppError = require('../../utils/AppError');
const { assertTeamMember } = require('./helpers/authHelper');
const { attachTags } = require('./helpers/tagHelper');

const ALLOWED_UPDATES = ['name', 'logoUrl', 'description', 'preferredIntensity', 'region'];

// ─── 生成唯一邀请码 ─────────────────────────────
const generateInviteCode = async () => {
	for (let i = 0; i < 10; i++) {
		const code = crypto.randomBytes(3).toString('hex').toUpperCase();
		const exist = await Team.findOne({ inviteCode: code }).lean();
		if (!exist) return code;
	}
	throw new AppError('邀请码生成失败，请稍后重试', 500);
};

// ─── 创建球队 ───────────────────────────────────
exports.create = async ({ userId, payload }) => {
	const inviteCode = await generateInviteCode();
	const team = await Team.create({
		...payload,
		inviteCode,
		members: [{ user: userId, role: 'captain', joinedAt: new Date() }],
	});

	await User.findByIdAndUpdate(userId, {
		$addToSet: { joinedTeams: team._id },
		activeTeamId: team._id,
	});

	return team;
};

// ─── 编辑球队 ───────────────────────────────────
exports.update = async ({ userId, teamId, payload }) => {
	await assertTeamMember({
		teamId,
		userId,
		allowedRoles: ['captain', 'vice_captain'],
	});

	const updates = {};
	for (const field of ALLOWED_UPDATES) {
		if (payload[field] !== undefined) updates[field] = payload[field];
	}
	if (Object.keys(updates).length === 0) {
		throw new AppError('没有可更新的字段', 400);
	}

	return Team.findByIdAndUpdate(teamId, { $set: updates }, { new: true, runValidators: true });
};

// ─── 解散球队 ───────────────────────────────────
exports.remove = async ({ userId, teamId }) => {
	const { team } = await assertTeamMember({
		teamId,
		userId,
		allowedRoles: ['captain'],
	});

	team.status = 'disbanded';
	await team.save();

	const memberIds = team.members.map((m) => m.user);
	await User.updateMany({ _id: { $in: memberIds } }, { $pull: { joinedTeams: team._id }, $unset: { activeTeamId: '' } });

	return { teamId: team._id.toString() };
};

// ─── 球队详情 ───────────────────────────────────
exports.getDetail = async ({ teamId }) => {
	if (!teamId) throw new Error('teamId不能为空');
	const team = await Team.findById(teamId);
	if (!team) throw new Error('球队不存在');
	await team.populate([
		{ path: 'members.user', select: 'nickname avatar gender' },
		{ path: 'nicknames.targetUser', select: 'nickname avatar' },
		{ path: 'nicknames.nominatedBy', select: 'nickname avatar' },
	]);
	return attachTags(team);
};

// ─── 我加入的球队列表 ───────────────────────────
exports.getJoinList = async ({ userId }) => {
	const teams = await Team.find({
		'members.user': userId,
		status: 'active',
	})
		.select('name logoUrl description preferredIntensity region members stats inviteCode tags')
		.populate({ path: 'members.user', select: 'gender' })
		.sort({ updatedAt: -1 });

	return teams.map(attachTags);
};

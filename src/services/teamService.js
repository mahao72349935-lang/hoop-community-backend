const crypto = require('crypto');
const mongoose = require('mongoose');
const Team = require('../models/Team');
const User = require('../models/User');
const AppError = require('../utils/AppError');

// ─── 常量 ────────────────────────────────────────────
const MAX_TEAMS_PER_USER = 5; // 每人最多加入球队数（按需调整）
const MAX_MEMBERS_PER_TEAM = 15; // 与 schema 保持一致
const ALLOWED_TEAM_UPDATES = ['name', 'logoUrl', 'description', 'preferredIntensity', 'region'];

// ─── 工具函数 ────────────────────────────────────────

/**
 * 生成唯一的 6 位邀请码（加上次数上限，防死循环）
 */
const generateInviteCode = async () => {
	for (let i = 0; i < 10; i++) {
		const code = crypto.randomBytes(3).toString('hex').toUpperCase();
		const existing = await Team.findOne({ inviteCode: code }).lean();
		if (!existing) return code;
	}
	throw new AppError('邀请码生成失败，请稍后重试', 500);
};

/**
 * 校验并返回球队 + 当前用户在队内的成员信息
 * @param {Object} opts
 * @param {string|import('mongoose').Types.ObjectId} opts.teamId
 * @param {string|import('mongoose').Types.ObjectId} opts.userId
 * @param {Array<string>} [opts.allowedRoles] - 允许通过的角色，默认任意成员
 */
const assertTeamMember = async ({ teamId, userId, allowedRoles }) => {
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

// ─── 创建球队 ───────────────────────────────────────
/**
 * @param  userId: import('mongoose').Types.ObjectId, payload: object  params
 */
exports.create = async ({ userId, payload }) => {
	const { name, logoUrl, description, preferredIntensity, region } = payload;

	if (!name || !name.trim()) {
		throw new AppError('请输入队名', 400);
	}

	// 限制一个人能加入的球队数量（可选）
	const joinedCount = await Team.countDocuments({
		'members.user': userId,
		status: 'active',
	});
	if (joinedCount >= MAX_TEAMS_PER_USER) {
		throw new AppError(`最多加入 ${MAX_TEAMS_PER_USER} 个球队`, 400);
	}

	const inviteCode = await generateInviteCode();

	const newTeam = await Team.create({
		name,
		logoUrl,
		description,
		preferredIntensity,
		region,
		inviteCode,
		members: [{ user: userId, role: 'captain', joinedAt: new Date() }],
	});

	await User.findByIdAndUpdate(userId, {
		$addToSet: { joinedTeams: newTeam._id },
		activeTeamId: newTeam._id,
	});

	return newTeam;
};

// ─── 编辑球队 ───────────────────────────────────────
/**
 * @param  userId, teamId, payload  params
 */
exports.update = async ({ userId, teamId, payload }) => {
	await assertTeamMember({
		teamId,
		userId,
		allowedRoles: ['captain', 'vice_captain'],
	});

	const updates = {};
	for (const field of ALLOWED_TEAM_UPDATES) {
		if (payload[field] !== undefined) {
			updates[field] = payload[field];
		}
	}

	if (Object.keys(updates).length === 0) {
		throw new AppError('没有可更新的字段', 400);
	}

	return Team.findByIdAndUpdate(teamId, { $set: updates }, { new: true, runValidators: true });
};

// ─── 解散球队（软删除） ─────────────────────────────
/**
 * @param  userId, teamId  params
 */
exports.remove = async ({ userId, teamId }) => {
	const { team } = await assertTeamMember({
		teamId,
		userId,
		allowedRoles: ['captain'],
	});

	team.status = 'disbanded';
	await team.save();

	// 从所有成员的 joinedTeams 里移除，清理 activeTeamId
	const memberIds = team.members.map((m) => m.user);
	await User.updateMany(
		{ _id: { $in: memberIds } },
		{
			$pull: { joinedTeams: team._id },
			$unset: {
				activeTeamId: '', // 清空 activeTeamId（如果恰好是被解散的队）
			},
		},
	);

	return { teamId: team._id.toString() };
};

// ─── 获取我加入的球队列表 ───────────────────────────
/**
 * @param  userId  params
 */
exports.getJoinList = async ({ userId }) => {
	return Team.find({
		'members.user': userId,
		status: 'active',
	})
		.select('name logoUrl description preferredIntensity region members')
		.sort({ updatedAt: -1 });
};

// ─── 获取球队详情 ───────────────────────────────────
/**
 * @param  userId, teamId  params
 */
exports.getDetail = async ({ userId, teamId }) => {
	// 只验证"是成员"，不限制角色
	const { team } = await assertTeamMember({ teamId, userId });

	// populate 成员和绰号相关的用户信息
	await team.populate([
		{ path: 'members.user', select: 'nickname avatar' },
		{ path: 'nicknames.targetUser', select: 'nickname avatar' },
		{ path: 'nicknames.nominatedBy', select: 'nickname avatar' },
	]);

	return team;
};

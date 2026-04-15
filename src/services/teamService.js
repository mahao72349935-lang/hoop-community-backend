const crypto = require('crypto');
const Team = require('../models/Team');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const generateInviteCode = async () => {
	let isUnique = false;
	let code = '';
	while (!isUnique) {
		code = crypto.randomBytes(3).toString('hex').toUpperCase();
		const existing = await Team.findOne({ inviteCode: code });
		if (!existing) isUnique = true;
	}
	return code;
};

/**
 * @param {{ userId: import('mongoose').Types.ObjectId, name: string, logoUrl?: string, description?: string, preferredIntensity?: string, region?: object }} params
 */
exports.createTeam = async ({ userId, name, logoUrl, description, preferredIntensity, region }) => {
	const inviteCode = await generateInviteCode();

	const newTeam = await Team.create({
		name,
		logoUrl,
		description,
		preferredIntensity,
		region,
		inviteCode,
		members: [
			{
				user: userId,
				role: 'captain',
				joinedAt: Date.now(),
			},
		],
	});

	await User.findByIdAndUpdate(userId, {
		$addToSet: { joinedTeams: newTeam._id },
		activeTeamId: newTeam._id,
	});

	return newTeam;
};

const ALLOWED_TEAM_UPDATES = ['name', 'logoUrl', 'description', 'preferredIntensity', 'region'];

/**
 * @param {{ userId: import('mongoose').Types.ObjectId, body: object }} params
 */
exports.updateTeam = async ({ userId, body }) => {
	const { teamId, ...rest } = body;

	if (!teamId) {
		throw new AppError('请在请求体中提供 teamId', 400);
	}

	const team = await Team.findById(teamId);
	if (!team) {
		throw new AppError('找不到该球队', 404);
	}

	const currentMember = team.members.find((m) => m.user.toString() === userId.toString());
	if (!currentMember || !['captain', 'vice_captain'].includes(currentMember.role)) {
		throw new AppError('无权操作，仅队长或副队长可修改资料', 403);
	}

	const updates = {};
	for (const field of ALLOWED_TEAM_UPDATES) {
		if (rest[field] !== undefined) {
			updates[field] = rest[field];
		}
	}

	return Team.findByIdAndUpdate(teamId, { $set: updates }, { new: true, runValidators: true });
};

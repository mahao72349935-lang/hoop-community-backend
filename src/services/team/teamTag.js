const Team = require('../../models/Team');
const AppError = require('../../utils/AppError');
const { TEAM_TAGS, TEAM_TAG_KEYS } = require('../../constants/teamTags');
const { attachTags } = require('./helpers/tagHelper');

// 获取所有可投票的标签选项
exports.getTagOptions = async () => TEAM_TAGS;

/**
 * 给球队投/取消投某个标签（toggle）
 */
exports.voteTag = async ({ userId, teamId, tagKey }) => {
	if (!TEAM_TAG_KEYS.includes(tagKey)) {
		throw new AppError('无效的标签', 400);
	}

	const team = await Team.findById(teamId);
	if (!team) throw new AppError('球队不存在', 404);
	if (team.status === 'disbanded') throw new AppError('该球队已解散', 410);

	let tag = team.tags.find((t) => t.key === tagKey);
	if (!tag) {
		team.tags.push({ key: tagKey, voters: [userId] });
	} else {
		const idx = tag.voters.findIndex((v) => v.toString() === userId.toString());
		if (idx >= 0) tag.voters.splice(idx, 1);
		else tag.voters.push(userId);
	}

	await team.save();
	await team.populate({ path: 'members.user', select: 'gender' });
	return attachTags(team);
};

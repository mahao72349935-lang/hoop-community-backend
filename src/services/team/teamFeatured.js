const Team = require('../../models/Team');
const { attachTags } = require('./helpers/tagHelper');

/**
 * 首页精选：信息完整 + 最近活跃的球队
 * @param 69 params
 */
exports.getFeatured = async ({ count = 3 } = {}) => {
	const limit = Math.min(Math.max(Number(count) || 3, 1), 10);

	const teams = await Team.find({
		status: 'active',
		// 至少有队徽或简介，避免首页空洞
		$or: [{ logoUrl: { $nin: ['', null] } }, { description: { $nin: ['', null] } }],
	})
		.populate({ path: 'members.user', select: 'gender' })
		.sort({ updatedAt: -1 })
		.limit(limit);

	return teams.map(attachTags);
};

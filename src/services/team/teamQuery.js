const Team = require('../../models/Team');
const { attachTags } = require('./helpers/tagHelper');

exports.getList = async ({ page = 1, size = 10, keyword, city, intensity, sort = 'latest' } = {}) => {
	const pageNum = Math.max(Number(page) || 1, 1);
	const pageSize = Math.min(Math.max(Number(size) || 10, 1), 50);
	const skip = (pageNum - 1) * pageSize;

	const filter = { status: 'active' };

	if (keyword) {
		const safe = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		filter.name = { $regex: safe, $options: 'i' };
	}
	if (city) filter['region.city'] = city;
	if (intensity && intensity !== 'ANY') filter.preferredIntensity = intensity;

	const sortMap = {
		latest: { createdAt: -1 },
		hot: { 'stats.totalMatches': -1, updatedAt: -1 },
		winRate: { 'stats.wins': -1 },
	};

	const [list, total] = await Promise.all([
		Team.find(filter)
			.select('name logoUrl description preferredIntensity region members stats tags')
			.populate({ path: 'members.user', select: 'gender' })
			.sort(sortMap[sort] || sortMap.latest)
			.skip(skip)
			.limit(pageSize),
		Team.countDocuments(filter),
	]);

	return {
		list: list.map(attachTags),
		pagination: {
			page: pageNum,
			size: pageSize,
			total,
			totalPages: Math.ceil(total / pageSize),
			hasMore: skip + list.length < total,
		},
	};
};

// 未来可能还会加：
// exports.searchByTag = async (...) => { ... };
// exports.getByCity = async (...) => { ... };
// exports.getFriendsTeams = async ({ userId }) => { ... };

const Match = require('../models/Match');

/**
 * 创建/发布约赛（发起方用户 ID 必须由服务端注入，不可信任前端）
 * @param {{ body: object, currentUserId: import('mongoose').Types.ObjectId }} params
 */
exports.createMatch = async ({ body, currentUserId }) => {
	const matchData = {
		...body,
		initiator: {
			...(body.initiator || {}),
			user: currentUserId,
		},
	};

	return Match.create(matchData);
};

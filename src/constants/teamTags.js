// 前后端共用的标签字典，改这里就全改
const TEAM_TAGS = [
	{ key: 'friendly', label: '队友热情', emoji: '❤️' },
	{ key: 'funny', label: '氛围搞笑', emoji: '😂' },
	{ key: 'newbie', label: '欢迎新人', emoji: '🙌' },
	{ key: 'serious', label: '认真打球', emoji: '💼' },
	{ key: 'skillful', label: '有大神指导', emoji: '👨‍🏫' },
	{ key: 'punctual', label: '守时靠谱', emoji: '⏰' },
	{ key: 'casual', label: '轻松休闲', emoji: '🎯' },
	{ key: 'afterWork', label: '下班局', emoji: '🌆' },
];

const TEAM_TAG_KEYS = TEAM_TAGS.map((t) => t.key);

module.exports = { TEAM_TAGS, TEAM_TAG_KEYS };

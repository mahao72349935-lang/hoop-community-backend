// 前后端共用的标签字典，改这里就全改
const TEAM_TAGS = [
	{ key: 'friendly', label: '队友热情' },
	{ key: 'funny', label: '氛围搞笑' },
	{ key: 'newbie', label: '欢迎新人' },
	{ key: 'serious', label: '认真打球' },
	{ key: 'skillful', label: '有大神指导' },
	{ key: 'punctual', label: '守时靠谱' },
	{ key: 'casual', label: '轻松休闲' },
	{ key: 'afterWork', label: '下班局' },
];

const TEAM_TAG_KEYS = TEAM_TAGS.map((t) => t.key);

module.exports = { TEAM_TAGS, TEAM_TAG_KEYS };

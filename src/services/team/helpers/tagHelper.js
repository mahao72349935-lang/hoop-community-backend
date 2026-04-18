const { TEAM_TAGS } = require('../../../constants/teamTags');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const teamHasFemaleMember = (members) =>
	(members || []).some((m) => {
		const u = m?.user;
		return u != null && typeof u === 'object' && u.gender === 'female';
	});

/**
 * 根据球队数据算出系统标签（不写库，展示用）
 */
const computeSystemTags = (team) => {
	const tags = [];
	const now = Date.now();
	const created = new Date(team.createdAt).getTime();
	const updated = new Date(team.updatedAt).getTime();

	if (now - created <= SEVEN_DAYS_MS) {
		tags.push({ key: 'new', label: '新球队' });
	}
	if (now - updated <= THIRTY_DAYS_MS) {
		tags.push({ key: 'active', label: '最近活跃' });
	}
	if (team.stats?.totalMatches >= 10) {
		tags.push({ key: 'frequent', label: '常打球' });
	}
	if ((team.members?.length || 0) < 15) {
		tags.push({ key: 'recruiting', label: '还招人' });
	}
	if (teamHasFemaleMember(team.members)) {
		tags.push({ key: 'hasFemale', label: '有妹子' });
	}
	return tags;
};

/**
 * 给单支球队挂上展示标签：systemTags（系统算出） + displayTags（社交投票） → allTags
 */
const attachTags = (team) => {
	const obj = team.toJSON ? team.toJSON() : team;
	const systemTags = computeSystemTags(obj);
	obj.allTags = [...systemTags, ...(obj.displayTags || [])];
	return obj;
};

module.exports = { computeSystemTags, attachTags };

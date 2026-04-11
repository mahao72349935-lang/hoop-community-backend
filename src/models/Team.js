const mongoose = require('mongoose');

// 绰号子文档 schema（嵌套在 Team 里，因为绰号是球队上下文里产生的）
const nicknameSchema = new mongoose.Schema(
	{
		targetUser: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true, // 被起绰号的人
		},
		nominatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true, // 提名人
		},
		name: {
			type: String,
			required: true,
			maxlength: [20, '绰号不能超过20字'],
			trim: true, // 例如"双流杜兰特"
		},
		likes: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User', // 存点赞人的 id，防止重复点赞
			},
		],
		// 本人对这个绰号的态度
		status: {
			type: String,
			enum: ['pending', 'accepted', 'rejected'],
			default: 'pending', // pending=待本人确认，accepted=接受显示，rejected=拒绝
		},
	},
	{ timestamps: true },
);

// 球队成员子文档
const memberSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	role: {
		type: String,
		enum: ['captain', 'vice_captain', 'member'],
		default: 'member', // 队长、副队长、普通队员
	},
	joinedAt: {
		type: Date,
		default: Date.now,
	},
	// 该成员在本队的出场统计（队内维度，不影响User全局stats）
	teamStats: {
		games: { type: Number, default: 0 },
		wins: { type: Number, default: 0 },
		losses: { type: Number, default: 0 },
	},
});

const teamSchema = new mongoose.Schema(
	{
		// ─── 基础信息 ──────────────────────────────────────
		name: {
			type: String,
			required: [true, '请输入队名'],
			trim: true,
			maxlength: [30, '队名不能超过30字'],
		},
		logoUrl: {
			type: String,
			default: '', // 队徽图片
		},
		description: {
			type: String,
			maxlength: [200, '队伍简介不能超过200字'],
			default: '',
		},
		preferredIntensity: {
			type: String,
			enum: ['养生局', '强度局', '专业局', '不限'],
			default: '不限', // 球队整体偏好强度，约赛时展示给对方看
		},

		// ─── 地区 ──────────────────────────────────────────
		region: {
			province: { type: String, default: '' },
			city: { type: String, default: '' },
			district: { type: String, default: '' },
		},

		// ─── 成员（上限15人，队长算在内） ─────────────────
		members: {
			type: [memberSchema],
			validate: {
				validator: function (val) {
					return val.length <= 15;
				},
				message: '球队成员不能超过15人',
			},
		},

		// ─── 邀请机制 ──────────────────────────────────────
		inviteCode: {
			type: String,
			unique: true, // 6位随机码，分享链接用
		},
		inviteExpiredAt: {
			type: Date,
			default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后过期
		},

		// ─── 绰号池（本队产生的所有绰号） ─────────────────
		nicknames: [nicknameSchema],

		// ─── 球队战绩 ──────────────────────────────────────
		stats: {
			totalMatches: { type: Number, default: 0 },
			wins: { type: Number, default: 0 },
			losses: { type: Number, default: 0 },
			draws: { type: Number, default: 0 },
		},

		// ─── 状态 ──────────────────────────────────────────
		status: {
			type: String,
			enum: ['active', 'disbanded'],
			default: 'active',
		},
	},
	{ timestamps: true },
);

// ─── 虚拟字段：胜率 ────────────────────────────────────
teamSchema.virtual('winRate').get(function () {
	const total = this.stats.totalMatches;
	if (total === 0) return 0;
	return ((this.stats.wins / total) * 100).toFixed(1);
});

// ─── 虚拟字段：成员数 ──────────────────────────────────
teamSchema.virtual('memberCount').get(function () {
	return this.members.length;
});

module.exports = mongoose.model('Team', teamSchema);

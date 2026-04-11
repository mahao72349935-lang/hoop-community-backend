const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
	{
		// ─── 微信登录（小程序核心） ───────────────────────
		openId: {
			type: String,
			unique: true,
			sparse: true, // 允许为空（兼容非微信注册）
			index: true,
		},
		unionId: {
			type: String,
			sparse: true, // 同一微信主体下多个小程序互通用
		},

		// ─── 基础账号信息 ─────────────────────────────────
		username: {
			type: String,
			required: [true, '请提供用户名'],
			unique: true,
			trim: true,
		},
		password: {
			type: String,
			minlength: 6,
			select: false,
		},
		avatarUrl: {
			type: String,
			default: '', // 微信头像 URL 或自定义上传
		},
		phone: {
			type: String,
			sparse: true,
			unique: true, // 手机号，微信授权获取
		},

		// ─── 身份系统（支持多身份） ───────────────────────
		// 用数组：['player'] 纯球友，['venue_owner'] 纯老板，['player','venue_owner'] 两者都是
		roles: {
			type: [String],
			enum: ['player', 'venue_owner', 'admin'],
			default: ['player'],
		},
		// 当前激活的身份（切换身份按钮控制）
		activeRole: {
			type: String,
			enum: ['player', 'venue_owner', 'admin'],
			default: 'player',
		},

		// ─── 地理信息 ─────────────────────────────────────
		region: {
			province: { type: String, default: '' }, // 省
			city: { type: String, default: '' }, // 市
			district: { type: String, default: '' }, // 区/县
		},

		// ─── 球员核心数据 ─────────────────────────────────
		realName: {
			type: String,
			trim: true,
			default: '', // 真实姓名（可选，隐私保护）
		},
		// 微信头像和昵称
		nickname: {
			type: String,
			trim: true,
			maxlength: [20, '绰号不能超过20个字'],
			default: '', // 自己设置的绰号，例如"社区科比"
		},
		// 别人给起的绰号列表
		givenNicknames: [
			{
				fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
				fromTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
				name: { type: String, maxlength: 20 }, // "双流杜兰特"
				createdAt: { type: Date, default: Date.now },
				likes: { type: Number, default: 0 }, // 其他人点赞这个绰号
			},
		],
		age: {
			type: Number,
			min: [5, '年龄太小了'],
			max: [100, '年龄超限'],
		},
		height: { type: Number }, // 单位：cm
		weight: { type: Number }, // 单位：kg
		yearsOfPlaying: {
			type: Number,
			default: 0, // 球龄（年）
		},
		position: {
			type: String,
			enum: ['控卫', '得分后卫', '小前锋', '大前锋', '中锋', '自由人', '未设置'],
			default: '未设置',
		},
		preferredIntensity: {
			type: String,
			enum: ['养生局', '强度局', '专业局', '未设置'],
			default: '未设置', // 偏好的球局强度
		},
		hasInjury: {
			type: Boolean,
			default: false,
		},
		injuryDetails: {
			type: String,
			maxlength: [200, '伤病描述请不要超过200字'],
			default: '',
		},

		// ─── 社交 & 统计 ──────────────────────────────────
		currentTeamId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Team',
			default: null, // 当前所属球队（一人同时只在一队）
		},
		stats: {
			totalGames: { type: Number, default: 0 }, // 总出场次数
			totalWins: { type: Number, default: 0 }, // 胜场
			totalLosses: { type: Number, default: 0 }, // 负场
			noShowCount: { type: Number, default: 0 }, // 爽约次数（信用体系用）
		},
		creditScore: {
			type: Number,
			default: 100, // 信用分，爽约扣分
			min: 0,
			max: 100,
		},

		// ─── 账号状态 ─────────────────────────────────────
		status: {
			type: String,
			enum: ['active', 'inactive', 'banned'],
			default: 'active',
		},
		banReason: {
			type: String,
			default: '', // 你的后台封号时填写原因
		},
		lastLoginAt: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true, // 自动生成 createdAt 和 updatedAt，不用手写
	},
);

// ─── 密码加密（保存前自动执行） ────────────────────────
userSchema.pre('save', async function (next) {
	if (!this.isModified('password') || !this.password) return next();
	this.password = await bcrypt.hash(this.password, 12);
	next();
});

// ─── 实例方法：校验密码 ────────────────────────────────
userSchema.methods.correctPassword = async function (candidatePassword) {
	return await bcrypt.compare(candidatePassword, this.password);
};

// ─── 虚拟字段：胜率 ───────────────────────────────────
userSchema.virtual('winRate').get(function () {
	const total = this.stats.totalGames;
	if (total === 0) return 0;
	return ((this.stats.totalWins / total) * 100).toFixed(1);
});

module.exports = mongoose.model('User', userSchema);

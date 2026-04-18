const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
	{
		// ─── 账号核心信息 ─────────────────────────────────
		username: {
			type: String,
			required: [true, '请提供用户名'],
			unique: true,
			trim: true,
		},
		password: {
			type: String,
			required: [true, '请设置密码'],
			minlength: 6,
			select: false, // 查询时默认不返回密码，保护安全
		},
		phone: {
			type: String,
			sparse: true,
			unique: true,
		},
		openId: {
			type: String,
			unique: true,
			sparse: true,
			index: true,
		},

		// ─── 个人档案 ─────────────────────────────────────
		region: {
			province: { type: String, default: '' },
			city: { type: String, default: '' },
			district: { type: String, default: '' },
			// 街道门牌等详细地址
			detail: { type: String, default: '', maxlength: [30, '详细地址不能超过30个字'] },
		},
		nickname: {
			type: String,
			trim: true,
			maxlength: [20, '绰号不能超过20个字'],
			default: '',
		},
		avatarUrl: {
			type: String,
			default: '',
		},
		realName: {
			type: String,
			trim: true,
			default: '',
		},
		birthday: {
			type: Date,
			default: null, // 建议存储生日而非年龄
		},
		gender: {
			type: String,
			enum: ['unknown', 'male', 'female'],
			default: 'unknown',
		},
		height: { type: Number }, // cm
		weight: { type: Number }, // kg
		yearsOfPlaying: {
			type: Number,
			default: 0,
		},

		// ─── 篮球偏好（使用 Code 枚举） ─────────────────────
		position: {
			type: String,
			enum: ['UNKNOWN', 'PG', 'SG', 'SF', 'PF', 'C', 'GF', 'F', 'CPF', 'ALL'],
			default: 'UNKNOWN',
		},
		preferredIntensity: {
			type: String,
			enum: ['UNKNOWN', 'CASUAL', 'MODERATE', 'COMPETITIVE'],
			default: 'UNKNOWN',
		},

		// ─── 伤病状态 ─────────────────────────────────────
		hasInjury: {
			type: Boolean,
			default: false,
		},
		injuryDetails: {
			type: String,
			maxlength: [200, '描述请控制在200字以内'],
			default: '',
		},

		// ─── 角色与身份 ───────────────────────────────────
		roles: {
			type: [String],
			enum: ['player', 'venue_owner', 'admin'],
			default: ['player'],
		},
		activeRole: {
			type: String,
			enum: ['player', 'venue_owner', 'admin'],
			default: 'player',
		},

		// ─── 球队关联 ─────────────────────────────────────
		// 用户加入的球队列表
		joinedTeams: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Team',
			},
		],
		// 当前代表出战的主队
		activeTeamId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Team',
			default: null,
		},

		// ─── 统计数据与信用 ─────────────────────────────────
		stats: {
			totalGames: { type: Number, default: 0 },
			totalWins: { type: Number, default: 0 },
			noShowCount: { type: Number, default: 0 }, // 爽约次数
		},
		creditScore: {
			type: Number,
			default: 100,
			min: 0,
			max: 100,
		},

		// ─── 账号状态 ─────────────────────────────────────
		status: {
			type: String,
			enum: ['active', 'inactive', 'banned'],
			default: 'active',
		},
		lastLoginAt: { type: Date, default: null },
	},
	{
		timestamps: true,
		toJSON: { virtuals: true }, // 确保转换 JSON 时包含计算字段
		toObject: { virtuals: true },
	},
);

// ─── 虚拟字段：与前端约定的用户主键别名（底层仍为 MongoDB 的 _id） ───
userSchema.virtual('userId').get(function () {
	return this._id != null ? this._id.toString() : undefined;
});

// ─── 虚拟字段：动态计算胜率 ──────────────────────────────
userSchema.virtual('winRate').get(function () {
	const total = this.stats.totalGames;
	return total > 0 ? ((this.stats.totalWins / total) * 100).toFixed(1) : 0;
});

// ─── 虚拟字段：动态计算年龄 ──────────────────────────────
userSchema.virtual('age').get(function () {
	if (!this.birthday) return null;
	const ageDifMs = Date.now() - this.birthday.getTime();
	const ageDate = new Date(ageDifMs);
	return Math.abs(ageDate.getUTCFullYear() - 1970);
});

// ─── 中间件：保存前加密密码 ──────────────────────────────
// Mongoose 9：async 钩子不再注入 next，错误通过 throw 传递
userSchema.pre('save', async function () {
	if (!this.isModified('password')) return;

	const salt = await bcrypt.genSalt(10);
	this.password = await bcrypt.hash(this.password, salt);
});

// ─── 实例方法：校验密码 ──────────────────────────────────
userSchema.methods.correctPassword = async function (candidatePassword) {
	// this.password 只有在查询时显式用 .select('+password') 才会出现
	return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

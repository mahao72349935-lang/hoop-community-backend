const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── 绰号子文档 ──────────────────────────────────
const nicknameSchema = new Schema(
	{
		targetUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		nominatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		name: {
			type: String,
			required: true,
			maxlength: [20, '绰号不能超过20字'],
			trim: true,
		},
		likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
		status: {
			type: String,
			enum: ['pending', 'accepted', 'rejected'],
			default: 'pending',
		},
	},
	{ timestamps: true },
);

// ─── 成员子文档 ──────────────────────────────────
const memberSchema = new Schema({
	user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	role: {
		type: String,
		enum: ['captain', 'vice_captain', 'member'],
		default: 'member',
	},
	joinedAt: { type: Date, default: Date.now },
	teamStats: {
		games: { type: Number, default: 0 },
		wins: { type: Number, default: 0 },
		losses: { type: Number, default: 0 },
	},
});

// ─── 球队主 Schema ──────────────────────────────
const teamSchema = new Schema(
	{
		name: {
			type: String,
			required: [true, '请输入队名'],
			trim: true,
			maxlength: [30, '队名不能超过30字'],
		},
		logoUrl: { type: String, default: '' },
		description: { type: String, maxlength: [200, '球队简介不能超过200字'], default: '' },
		preferredIntensity: {
			type: String,
			enum: ['ANY', 'CASUAL', 'MODERATE', 'COMPETITIVE'],
			default: 'ANY',
		},
		region: {
			province: { type: String, default: '' },
			city: { type: String, default: '' },
			district: { type: String, default: '' },
		},
		members: {
			type: [memberSchema],
			validate: {
				validator: (val) => val.length <= 15,
				message: '球队成员不能超过15人',
			},
		},
		inviteCode: { type: String, unique: true, sparse: true },
		inviteExpiredAt: {
			type: Date,
			default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		},
		nicknames: [nicknameSchema],
		stats: {
			totalMatches: { type: Number, default: 0 },
			wins: { type: Number, default: 0 },
			losses: { type: Number, default: 0 },
			draws: { type: Number, default: 0 },
		},
		status: { type: String, enum: ['active', 'disbanded'], default: 'active' },
	},
	{
		timestamps: true,
		toJSON: {
			virtuals: true,
			versionKey: false,
			transform: (doc, ret) => {
				ret.teamId = ret._id.toString();
				delete ret._id;
				delete ret.id;
				return ret;
			},
		},
		toObject: { virtuals: true, versionKey: false },
	},
);

// ─── 虚拟字段 ───────────────────────────────────
teamSchema.virtual('winRate').get(function () {
	const total = this.stats.totalMatches;
	if (!total) return 0;
	return ((this.stats.wins / total) * 100).toFixed(1);
});

teamSchema.virtual('memberCount').get(function () {
	return this.members.length;
});

module.exports = mongoose.model('Team', teamSchema);

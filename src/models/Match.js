const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
	{
		// ─── 类型 ──────────────────────────────────────────
		type: {
			type: String,
			enum: ['whole_court', 'walk_in'],
			required: true, // 整场约赛 or 散客拼场
		},
		intensity: {
			type: String,
			enum: ['养生局', '强度局', '专业局'],
			required: true,
		},

		// ─── 关联场地 & 时段 ───────────────────────────────
		venue: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Venue',
			required: true,
		},
		timeSlotId: {
			type: mongoose.Schema.Types.ObjectId, // 指向 Venue.timeSlots 里的某个子文档
			required: true,
		},
		scheduledDate: { type: Date, required: true }, // 约赛日期
		startTime: { type: String, required: true }, // "14:00"
		endTime: { type: String, required: true }, // "16:00"

		// ─── 发起方 ────────────────────────────────────────
		initiator: {
			team: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Team',
				default: null, // 整场约赛时必填
			},
			user: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
				required: true, // 发起人（队长 or 散客）
			},
		},

		// ─── 对手方（整场约赛时才有） ──────────────────────
		opponent: {
			team: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Team',
				default: null, // null = 开放挑战，等待接受
			},
			user: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
				default: null,
			},
			status: {
				type: String,
				enum: ['pending', 'accepted', 'rejected'],
				default: 'pending',
			},
		},

		// ─── 散客参与者列表（walk_in 模式） ────────────────
		participants: [
			{
				user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
				joinedAt: { type: Date, default: Date.now },
				status: {
					type: String,
					enum: ['confirmed', 'cancelled', 'no_show'],
					default: 'confirmed',
				},
			},
		],
		maxParticipants: {
			type: Number,
			default: 10, // 散客模式最多几人
		},

		// ─── 约赛状态流转 ──────────────────────────────────
		// pending → confirmed → ongoing → finished / cancelled
		status: {
			type: String,
			enum: ['pending', 'confirmed', 'ongoing', 'finished', 'cancelled'],
			default: 'pending',
		},
		cancelReason: {
			type: String,
			default: '',
		},
		cancelledBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			default: null,
		},

		// ─── 赛果（finished 后填写） ───────────────────────
		result: {
			winnerId: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Team',
				default: null, // 胜队 id
			},
			scoreInitiator: { type: Number, default: null }, // 发起队比分
			scoreOpponent: { type: Number, default: null }, // 对手队比分
			confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
			// 双方都确认比分才算有效，防止单方乱填
			initiatorConfirmed: { type: Boolean, default: false },
			opponentConfirmed: { type: Boolean, default: false },
		},

		// ─── 费用 ──────────────────────────────────────────
		payment: {
			totalAmount: { type: Number, default: 0 }, // 总费用
			paidAmount: { type: Number, default: 0 }, // 已付
			paymentStatus: {
				type: String,
				enum: ['unpaid', 'partial', 'paid'],
				default: 'unpaid',
			},
		},

		notes: {
			type: String,
			maxlength: [300, '备注不能超过300字'],
			default: '', // 发起方填写的额外说明
		},
	},
	{ timestamps: true },
);

// ─── 查询索引 ───────────────────────────────────────────
matchSchema.index({ venue: 1, scheduledDate: 1 }); // 按场地+日期查
matchSchema.index({ 'initiator.team': 1, status: 1 }); // 按球队查我的约赛
matchSchema.index({ status: 1, scheduledDate: 1 }); // 后台按状态+日期查

module.exports = mongoose.model('Match', matchSchema);

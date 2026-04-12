const mongoose = require('mongoose');

// ─── 参赛队子文档 ──────────────────────────────────────
const participantSchema = new mongoose.Schema({
	team: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Team',
		required: true,
	},
	registeredAt: {
		type: Date,
		default: Date.now,
	},
	status: {
		type: String,
		// pending=报名待审核  approved=已确认参赛  rejected=被拒绝  withdrawn=中途退出
		enum: ['pending', 'approved', 'rejected', 'withdrawn'],
		default: 'pending',
	},
	// 小组赛积分（小组赛阶段自动累计）
	groupStats: {
		groupName: { type: String, default: null }, // 'A组'
		played: { type: Number, default: 0 },
		wins: { type: Number, default: 0 },
		draws: { type: Number, default: 0 },
		losses: { type: Number, default: 0 },
		points: { type: Number, default: 0 }, // 胜3分 平1分 负0分
		goalsFor: { type: Number, default: 0 }, // 得分
		goalsAgainst: { type: Number, default: 0 }, // 失分
	},
	// 最终名次（赛事结束后填入）
	finalRank: {
		type: Number,
		default: null, // 1=冠军 2=亚军 3=季军 ...
	},
});

const tournamentSchema = new mongoose.Schema(
	{
		// ─── 基础信息 ────────────────────────────────────────
		name: {
			type: String,
			required: [true, '请填写赛事名称'],
			trim: true,
			maxlength: [50, '赛事名称不能超过50字'],
		},
		description: {
			type: String,
			maxlength: [1000, '赛事描述不能超过1000字'],
			default: '',
		},
		posterUrl: {
			type: String,
			default: '', // 赛事海报图
		},

		// ─── 组织者 ──────────────────────────────────────────
		organizer: {
			user: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
				required: true, // 创建赛事的人（街道组织者 or 球馆老板）
			},
			organizerName: {
				type: String,
				default: '', // 显示名称，例如"XX街道体育委员会"
			},
		},

		// ─── 关联场地 ────────────────────────────────────────
		venue: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Venue',
			required: true,
		},

		// ─── 赛事规模与赛制 ──────────────────────────────────
		format: {
			type: String,
			// knockout = 纯淘汰赛（适合4/8/16队）
			// group_knockout = 小组赛+淘汰赛（适合8队以上）
			// round_robin = 循环赛（适合队数少、时间充裕，每队都互打）
			enum: ['knockout', 'group_knockout', 'round_robin'],
			required: true,
		},
		maxTeams: {
			type: Number,
			required: true,
			// 建议限制为 2的幂次方（2/4/8/16）方便淘汰赛对阵
			enum: [2, 4, 8, 16],
		},
		intensity: {
			type: String,
			enum: ['养生局', '强度局', '专业局'],
			required: true,
		},
		// 小组数量（group_knockout 模式才有意义）
		groupCount: {
			type: Number,
			default: null, // 例如 8 队分 2 组，groupCount = 2
		},
		// 每组几支队晋级淘汰赛
		teamsAdvancingPerGroup: {
			type: Number,
			default: 2,
		},

		// ─── 时间安排 ────────────────────────────────────────
		registrationDeadline: {
			type: Date,
			required: true, // 报名截止时间
		},
		startDate: {
			type: Date,
			required: true, // 赛事开始日期
		},
		endDate: {
			type: Date,
			required: true, // 赛事预计结束日期
		},

		// ─── 参赛队伍 ────────────────────────────────────────
		participants: [participantSchema],

		// ─── 赛程（所有 Match 的 id 列表，按轮次分组） ────────
		// 不直接嵌套 Match 内容，只存引用，保持 Match 独立可查
		schedule: {
			groupStage: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
			quarterFinals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
			semiFinals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
			finals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
		},

		// ─── 赛事状态流转 ────────────────────────────────────
		// draft=草稿  registration=报名中  ongoing=进行中  finished=已结束  cancelled=取消
		status: {
			type: String,
			enum: ['draft', 'registration', 'ongoing', 'finished', 'cancelled'],
			default: 'draft',
		},

		// ─── 赛事结果 ────────────────────────────────────────
		result: {
			champion: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
			runnerUp: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
			thirdPlace: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
		},

		// ─── 规则说明 ────────────────────────────────────────
		rules: {
			pointsForWin: { type: Number, default: 3 }, // 胜得几分
			pointsForDraw: { type: Number, default: 1 }, // 平得几分
			pointsForLoss: { type: Number, default: 0 }, // 负得几分
			extraRules: { type: String, default: '' }, // 自定义文字规则说明
		},
	},
	{
		timestamps: true,
		toJSON: { virtuals: true }, // 转换为 JSON 时包含虚拟字段
		toObject: { virtuals: true }, // 转换为普通对象时包含虚拟字段
	},
);

// ─── 虚拟字段：当前已报名队伍数 ──────────────────────────
tournamentSchema.virtual('approvedTeamCount').get(function () {
	return this.participants.filter((p) => p.status === 'approved').length;
});

// ─── 虚拟字段：是否还能报名 ──────────────────────────────
tournamentSchema.virtual('isRegistrationOpen').get(function () {
	const approvedCount = this.participants.filter((p) => p.status === 'approved').length;
	return this.status === 'registration' && new Date() < this.registrationDeadline && approvedCount < this.maxTeams;
});

// ─── 索引 ─────────────────────────────────────────────────
tournamentSchema.index({ status: 1, startDate: 1 }); // 首页展示进行中赛事
tournamentSchema.index({ 'organizer.user': 1, status: 1 }); // 我组织的赛事
tournamentSchema.index({ venue: 1, startDate: 1 }); // 某场馆的赛事

module.exports = mongoose.model('Tournament', tournamentSchema);

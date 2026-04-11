const mongoose = require('mongoose');

// 时段子文档（球馆老板发布的单个空闲时段）
const timeSlotSchema = new mongoose.Schema(
	{
		date: {
			type: Date,
			required: true, // 具体日期
		},
		startTime: {
			type: String,
			required: true, // "14:00"
		},
		endTime: {
			type: String,
			required: true, // "16:00"
		},
		courtCount: {
			type: Number,
			default: 1, // 本时段开放几块场地
			min: 1,
		},
		mode: {
			type: String,
			enum: ['whole_court', 'walk_in', 'both'],
			default: 'both', // 整场包场 / 散客 / 两种都行
		},
		priceOverride: {
			// 特殊时段覆盖默认价格（节假日涨价等）
			wholeCourt: { type: Number, default: null },
			walkIn: { type: Number, default: null },
		},
		status: {
			type: String,
			enum: ['available', 'booked', 'cancelled'],
			default: 'available',
		},
		bookedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Match',
			default: null, // 关联到哪场约赛
		},
	},
	{ timestamps: true },
);

const venueSchema = new mongoose.Schema(
	{
		// ─── 归属 ──────────────────────────────────────────
		owner: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true, // 球馆老板的 userId
		},

		// ─── 基础信息 ──────────────────────────────────────
		name: {
			type: String,
			required: [true, '请输入球馆名称'],
			trim: true,
		},
		description: {
			type: String,
			maxlength: [500, '描述不能超过500字'],
			default: '',
		},
		photos: {
			type: [String],
			validate: {
				validator: (val) => val.length <= 9,
				message: '最多上传9张图片',
			},
		},

		// ─── 地址 ──────────────────────────────────────────
		address: {
			province: { type: String, required: true },
			city: { type: String, required: true },
			district: { type: String, default: '' },
			detail: { type: String, required: true }, // 详细街道门牌
			longitude: { type: Number }, // 经度，地图定位用
			latitude: { type: Number }, // 纬度
		},

		// ─── 设施信息 ──────────────────────────────────────
		renovationYear: {
			type: Number, // 装修年份，例如 2022
		},
		hasParking: {
			type: String,
			enum: ['free', 'paid', 'none'],
			default: 'none', // 停车：免费/收费/无
		},
		courtCount: {
			type: Number,
			default: 1, // 总场地数
			min: 1,
		},
		floorType: {
			type: String,
			enum: ['木地板', '塑胶地板', '水泥地', '其他'],
			default: '其他', // 地板类型
		},
		hasShower: {
			type: Boolean,
			default: false, // 是否有淋浴
		},
		hasLocker: {
			type: Boolean,
			default: false, // 是否有储物柜
		},

		// ─── 默认定价 ──────────────────────────────────────
		pricing: {
			wholeCourt: { type: Number, required: true }, // 整场包场价（元/小时）
			walkIn: { type: Number, required: true }, // 散客价（元/人/小时）
		},

		// ─── 默认开放时间（每周模板） ──────────────────────
		openHours: {
			mon: { open: String, close: String }, // "08:00" / "22:00"
			tue: { open: String, close: String },
			wed: { open: String, close: String },
			thu: { open: String, close: String },
			fri: { open: String, close: String },
			sat: { open: String, close: String },
			sun: { open: String, close: String },
		},

		// ─── 发布的空闲时段列表 ────────────────────────────
		timeSlots: [timeSlotSchema],

		// ─── 认证 & 状态 ───────────────────────────────────
		isVerified: {
			type: Boolean,
			default: false, // 你后台审核通过后置为 true，显示官方认证标
		},
		status: {
			type: String,
			enum: ['active', 'inactive', 'banned'],
			default: 'active',
		},

		// ─── 评分（后期功能） ──────────────────────────────
		rating: {
			average: { type: Number, default: 0, min: 0, max: 5 },
			count: { type: Number, default: 0 },
		},
	},
	{ timestamps: true },
);

// 地理位置索引（支持附近球馆搜索）
venueSchema.index({ 'address.longitude': 1, 'address.latitude': 1 });

module.exports = mongoose.model('Venue', venueSchema);

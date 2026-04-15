const mongoose = require('mongoose');
const User = require('../models/User');

// ─── 允许用户更新的字段白名单 ─────────────────────────
const ALLOWED_UPDATE_FIELDS = ['realName', 'nickname', 'birthday', 'yearsOfPlaying', 'position', 'preferredIntensity', 'hasInjury', 'injuryDetails', 'region'];

/** 查看「他人」资料时不返回的敏感字段（联系方式与登录标识） */
const stripOtherUserPrivateFields = (obj) => {
	delete obj.phone;
	delete obj.openId;
	delete obj.lastLoginAt;
};

// @desc    获取用户信息：不传 userId → 当前登录用户（由 Token 决定）；?userId= → 指定用户（脱敏）
// @route   GET /api/v1/user/profile/info
// @access  Private（需要 Token）
exports.getUserInfo = async (req, res, next) => {
	try {
		let targetId = req.user._id;
		const { userId: queryUserId } = req.query;

		if (queryUserId) {
			if (!mongoose.Types.ObjectId.isValid(queryUserId)) {
				return res.status(400).json({ code: 400, success: false, message: 'userId 格式无效' });
			}
			targetId = queryUserId;
		}

		const user = await User.findById(targetId);

		if (!user) {
			return res.status(404).json({ code: 404, success: false, message: '用户不存在' });
		}

		const userInfo = user.toObject();
		delete userInfo.password;

		const isSelf = String(user._id) === String(req.user._id);
		if (!isSelf) {
			stripOtherUserPrivateFields(userInfo);
		}

		return res.status(200).json({
			code: 200,
			success: true,
			message: '获取用户信息成功',
			data: userInfo,
		});
	} catch (err) {
		next(err);
	}
};

// @desc    更新当前登录用户的个人信息
// @route   PUT /api/v1/user/info
// @access  Private（需要 Token）
exports.updateUserInfo = async (req, res, next) => {
	try {
		const updates = {};

		// 只取白名单字段，防止用户篡改角色/积分等敏感数据
		for (const field of ALLOWED_UPDATE_FIELDS) {
			if (req.body[field] !== undefined) {
				updates[field] = req.body[field];
			}
		}

		// ─── 字段级校验 ───────────────────────────────────
		// realName
		if (updates.realName !== undefined) {
			updates.realName = String(updates.realName).trim();
		}

		// nickname：最长 20 字（与 Schema 对齐）
		if (updates.nickname !== undefined) {
			updates.nickname = String(updates.nickname).trim();
			if (updates.nickname.length > 20) {
				return res.status(400).json({
					code: 400,
					success: false,
					message: '绰号不能超过20个字',
				});
			}
		}

		// yearsOfPlaying：0 ~ 50 整数
		if (updates.yearsOfPlaying !== undefined) {
			const y = Number(updates.yearsOfPlaying);
			if (!Number.isFinite(y) || y < 0 || y > 50) {
				return res.status(400).json({
					code: 400,
					success: false,
					message: '球龄须为 0-50 之间的数字',
				});
			}
			updates.yearsOfPlaying = Math.floor(y);
		}

		// position：与前端枚举保持一致
		const VALID_POSITIONS = [
			'UNKNOWN', // 未设置
			'PG', // 控球后卫
			'SG', // 得分后卫
			'SF', // 小前锋
			'PF', // 大前锋
			'C', // 中锋
			'GF', // 锋卫摇摆人
			'F', // 前锋摇摆人
			'CPF', // 内线摇摆人
			'ALL', // 不固定/全能位
		];
		if (updates.position !== undefined) {
			if (!VALID_POSITIONS.includes(updates.position)) {
				return res.status(400).json({
					code: 400,
					success: false,
					message: `场上位置无效，可选值：${VALID_POSITIONS.join('、')}`,
				});
			}
		}

		// preferredIntensity：与前端枚举保持一致
		const VALID_INTENSITIES = [
			'UNKNOWN', // 未设置
			'CASUAL', // 休闲为主
			'MODERATE', // 中等对抗
			'COMPETITIVE', // 高强度竞技
		];
		if (updates.preferredIntensity !== undefined) {
			if (!VALID_INTENSITIES.includes(updates.preferredIntensity)) {
				return res.status(400).json({
					code: 400,
					success: false,
					message: `运动强度无效，可选值：${VALID_INTENSITIES.join('、')}`,
				});
			}
		}

		// region：嵌套对象只允许 province / city / district（均为字符串）
		if (updates.region !== undefined) {
			if (typeof updates.region !== 'object' || updates.region === null) {
				return res.status(400).json({
					code: 400,
					success: false,
					message: '地区信息格式有误',
				});
			}
			updates.region = {
				province: String(updates.region.province || ''),
				city: String(updates.region.city || ''),
				district: String(updates.region.district || ''),
				detail: String(updates.region.detail || ''),
			};
		}

		// injuryDetails：最长 500 字
		if (updates.injuryDetails !== undefined) {
			updates.injuryDetails = String(updates.injuryDetails).trim();
			if (updates.injuryDetails.length > 500) {
				return res.status(400).json({
					code: 400,
					success: false,
					message: '伤病描述请不要超过500字',
				});
			}
		}

		// hasInjury：布尔值（前端根据 injuryDetails 是否为空自动赋值）
		if (updates.hasInjury !== undefined) {
			updates.hasInjury = Boolean(updates.hasInjury);
		}

		// ─── 执行更新 ───────────────────────────────────
		const updatedUser = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });

		if (!updatedUser) {
			return res.status(404).json({ code: 404, success: false, message: '用户不存在' });
		}

		const userInfo = updatedUser.toObject();
		delete userInfo.password;

		return res.status(200).json({
			code: 200,
			success: true,
			message: '更新成功',
			data: userInfo,
		});
	} catch (err) {
		next(err);
	}
};

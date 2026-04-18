const mongoose = require('mongoose');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const ALLOWED_UPDATE_FIELDS = [
	'realName',
	'nickname',
	'gender',
	'birthday',
	'yearsOfPlaying',
	'position',
	'preferredIntensity',
	'hasInjury',
	'injuryDetails',
	'region',
];

const stripOtherUserPrivateFields = (obj) => {
	delete obj.phone;
	delete obj.openId;
	delete obj.lastLoginAt;
};

/**
 * @param {{ currentUserId: import('mongoose').Types.ObjectId, queryUserId?: string }} params
 */
exports.getUserInfo = async ({ currentUserId, queryUserId }) => {
	let targetId = currentUserId;

	if (queryUserId) {
		if (!mongoose.Types.ObjectId.isValid(queryUserId)) {
			throw new AppError('userId 格式无效', 400);
		}
		targetId = queryUserId;
	}

	const user = await User.findById(targetId);
	if (!user) {
		throw new AppError('用户不存在', 404);
	}

	const userInfo = user.toObject();
	delete userInfo.password;

	const isSelf = String(user._id) === String(currentUserId);
	if (!isSelf) {
		stripOtherUserPrivateFields(userInfo);
	}

	return userInfo;
};

/**
 * @param {{ userId: import('mongoose').Types.ObjectId, body: object }} params
 */
exports.updateUserInfo = async ({ userId, body }) => {
	const updates = {};

	ALLOWED_UPDATE_FIELDS.forEach((field) => {
		if (body[field] !== undefined) {
			updates[field] = body[field];
		}
	});

	if (updates.region !== undefined) {
		updates.region = {
			province: String(updates.region.province || ''),
			city: String(updates.region.city || ''),
			district: String(updates.region.district || ''),
			detail: String(updates.region.detail || ''),
		};
	}

	if (updates.hasInjury !== undefined) {
		updates.hasInjury = Boolean(updates.hasInjury);
	}

	const updatedUser = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true });

	if (!updatedUser) {
		throw new AppError('用户不存在', 404);
	}

	return updatedUser;
};

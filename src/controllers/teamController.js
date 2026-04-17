const teamService = require('../services/teamService');
const { ok, created, noContent } = require('../utils/response');

// @desc    创建球队
// @route   POST /api/v1/teams
// @access  Private
exports.createTeam = async (req, res, next) => {
	try {
		const newTeam = await teamService.create({
			userId: req.user._id,
			payload: req.body,
		});
		return created(res, newTeam, '球队创建成功');
	} catch (err) {
		next(err);
	}
};

// @desc    编辑球队信息
// @route   PATCH /api/v1/teams/:teamId
// @access  Private
exports.updateTeam = async (req, res, next) => {
	try {
		const updatedTeam = await teamService.update({
			userId: req.user._id,
			teamId: req.params.teamId,
			payload: req.body,
		});
		return ok(res, updatedTeam, '球队资料更新成功');
	} catch (err) {
		next(err);
	}
};

// @desc    解散球队
// @route   DELETE /api/v1/teams/:teamId
// @access  Private
exports.deleteTeam = async (req, res, next) => {
	try {
		await teamService.remove({
			userId: req.user._id,
			teamId: req.params.teamId,
		});
		return noContent(res); // 204，无响应体
	} catch (err) {
		next(err);
	}
};

// @desc    获取我加入的球队列表
// @route   GET /api/v1/teams/joined
// @access  Private
exports.getJoinedTeamList = async (req, res, next) => {
	try {
		const list = await teamService.getJoinList({ userId: req.user._id });
		return ok(res, list, '获取球队列表成功');
	} catch (err) {
		next(err);
	}
};

// @desc    获取球队详情
// @route   GET /api/v1/teams/:teamId
// @access  Private
exports.getTeamDetail = async (req, res, next) => {
	try {
		const team = await teamService.getDetail({
			teamId: req.params.teamId,
		});
		return ok(res, team, '获取球队详情成功');
	} catch (err) {
		next(err);
	}
};

// 获取所有球队列表
// @route   GET /api/v1/teams
// @access  Private
exports.getAllTeams = async (req, res, next) => {
	try {
		const teams = await teamService.getList();
		return ok(res, teams, '获取所有球队列表成功');
	} catch (err) {
		next(err);
	}
};

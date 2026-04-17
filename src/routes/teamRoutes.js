const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { protect } = require('../middlewares/auth'); // 你自己的鉴权中间件

router.use(protect); // 所有路由都需要登录

router.get('/joined', teamController.getJoinedTeamList);
router.post('/', teamController.createTeam);
router.get('/', teamController.getAllTeams);
router.get('/:teamId', teamController.getTeamDetail);
router.patch('/:teamId', teamController.updateTeam);
router.delete('/:teamId', teamController.deleteTeam);

module.exports = router;

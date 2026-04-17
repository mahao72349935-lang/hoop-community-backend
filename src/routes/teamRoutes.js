// src/routes/teamRoutes.js
const express = require('express');
const router = express.Router();
const { createTeam, updateTeam } = require('../controllers/teamController');
const { protect } = require('../middlewares/auth');

router.use(protect);
// 创建球队
router.post('/createTeam', createTeam);
router.post('/updateTeam', updateTeam);
router.get('/getJoinTeamList', getJoinTeamList);

module.exports = router;

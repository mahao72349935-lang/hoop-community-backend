require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middlewares/errorHandler');

const app = express();

connectDB();

const authRoutes = require('./src/routes/authRoutes');
const matchRoutes = require('./src/routes/matchRoutes');
const userRoutes = require('./src/routes/userRoutes');
const teamRoutes = require('./src/routes/teamRoutes');
app.use(morgan('dev'));

app.use(express.json());

app.get('/', (req, res) => {
	res.send('你好，社区篮球赛后端服务已启动！流水线组装完成！');
});

app.get('/test-error', (req, res, next) => {
	const err = new Error('这是一个模拟的业务报错：找不到该场地');
	err.statusCode = 404;

	next(err);
});

// 挂载 authRoutes 路由
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/matches', matchRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/teams', teamRoutes);

app.use(errorHandler);

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`服务运行成功，访问地址：http://localhost:${PORT}`);
});

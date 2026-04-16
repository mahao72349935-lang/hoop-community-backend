// 必须放在最顶部，优先加载环境变量
require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const connectDB = require('./src/config/db');
// 引入我们刚才自己写的全局异常处理中间件
const errorHandler = require('./src/middlewares/errorHandler');

const app = express();

// ==========================================
// 1. 全局前置中间件 (流水线的前端)
// ==========================================
connectDB();

const authRoutes = require('./src/routes/authRoutes');
const matchRoutes = require('./src/routes/matchRoutes');
const userRoutes = require('./src/routes/userRoutes');
const teamRoutes = require('./src/routes/teamRoutes');
// 挂载日志系统，记录每一次请求
app.use(morgan('dev'));

// 允许 Express 解析前端 POST 传过来的 JSON 格式数据
// 如果不加这行，以后我们获取 req.body 会全是 undefined
app.use(express.json());

// ==========================================
// 2. 路由层 (流水线的中端：处理具体业务)
// ==========================================

app.get('/', (req, res) => {
	res.send('你好，社区篮球赛后端服务已启动！流水线组装完成！');
});

// 我们特意写一个会报错的接口，用来测试 errorHandler 是否生效
app.get('/test-error', (req, res, next) => {
	// 模拟一个业务报错，比如前端传了错的场地 ID
	const err = new Error('这是一个模拟的业务报错：找不到该场地');
	err.statusCode = 404;

	// 使用 next(err) 把错误扔给 Express
	// Express 收到后，会直接跳过后面所有正常流程，把这个错误送到最底部的 errorHandler
	next(err);
});

// 挂载 authRoutes 路由
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/matches', matchRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/team', teamRoutes);
// ==========================================
// 3. 全局后置中间件 (流水线的末端：兜底)
// ==========================================
// 【非常重要】：错误处理中间件必须放在所有 app.use 和路由的最下面！
app.use(errorHandler);

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`服务运行成功，访问地址：http://localhost:${PORT}`);
});

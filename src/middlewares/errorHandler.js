// 全局异常处理中间件
// 注意：Express 的错误处理中间件必须严格包含 4 个参数 (err, req, res, next)
// 只有写了 4 个参数，Express 才会认出这是一个错误处理中间件
const errorHandler = (err, req, res, next) => {
	// 1. 打印错误日志到终端，方便后端开发者排查问题
	console.error('【系统报错】:', err.stack);

	// 2. 获取错误状态码，如果没有自定义，则默认报 500 (服务器内部错误)
	const statusCode = err.statusCode || 500;

	// 3. 组装统一的错误响应格式，返回给前端（例如 React Native 或小程序端）
	res.status(statusCode).json({
		success: false,
		message: err.message || '服务器开小差了，请稍后再试',
		// 技巧：如果是生产环境，为了安全不暴露具体代码行数；开发环境则暴露出来方便定位
		stack: process.env.NODE_ENV === 'production' ? null : err.stack,
	});
};

// 导出这个中间件函数
module.exports = errorHandler;

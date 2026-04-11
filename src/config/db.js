const mongoose = require('mongoose');

// 创建一个异步函数来连接数据库
const connectDB = async () => {
	try {
		// 尝试连接环境变量中定义的数据库地址
		const conn = await mongoose.connect(process.env.MONGO_URI);

		// 连接成功后在终端打印绿色的提示信息（方便调试）
		console.log(`【数据库】: MongoDB 已连接成功: ${conn.connection.host}`);
	} catch (error) {
		// 如果连接失败，打印错误原因并退出程序
		console.error(`【数据库错误】: ${error.message}`);
		process.exit(1);
	}
};

module.exports = connectDB;

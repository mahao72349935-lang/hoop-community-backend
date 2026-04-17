// 统一成功响应工具
exports.ok = (res, data = null, message = 'success', code = 200) => {
	return res.status(code).json({
		code,
		success: true,
		message,
		data,
	});
};

// 常见快捷方法
exports.created = (res, data = null, message = '创建成功', code = 201) => exports.ok(res, data, message, code);

exports.noContent = (res) => res.status(204).send();

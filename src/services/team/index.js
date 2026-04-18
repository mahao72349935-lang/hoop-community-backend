// 把所有子文件的方法合并对外导出，调用方只认这一个文件
module.exports = {
	...require('./teamCrud'),
	...require('./teamFeatured'),
	...require('./teamTag'),
	...require('./teamMember'),
	...require('./teamQuery'),
};

# Node.js 后端分层架构学习笔记

## 一、为什么要引入 Service 层？

在没有 Service 层时，Controller 同时承担：

1. **HTTP 协议处理**：解析 `req.body`、设置状态码、拼装 JSON 响应
2. **核心业务逻辑**：查重、调第三方接口、创建用户、校验密码、生成 Token 等

引入 Service 层后的好处：

| 好处            | 说明                                                  |
| --------------- | ----------------------------------------------------- |
| Controller 变薄 | 只负责「接参数 → 调 Service → 返响应」                |
| 可复用          | 其他入口（如管理后台、定时任务）可直接调 Service      |
| 可测试          | Service 是纯 async 函数，不依赖 `req`/`res`，便于单测 |

> **原则：Controller 不写业务判断，Service 不碰 `req` / `res`。**

---

## 二、各层职责

| 层             | 职责                                        | 关键词   |
| -------------- | ------------------------------------------- | -------- |
| **Route**      | 定义 URL + HTTP 方法，分发到 Controller     | 路由映射 |
| **Controller** | 从 `req` 取参数，调 Service，包装 HTTP 响应 | 协议适配 |
| **Service**    | 业务逻辑、数据库操作、第三方接口、业务规则  | 业务逻辑 |
| **Model**      | Schema、底层增删改查                        | 数据存取 |

**注意：** Service 不只处理「数据库关系」，凡属业务规则（含调微信、生成 Token、权限判断）都应放在 Service。

---

## 三、目录结构示例

```
src/
├── controllers/     # 薄层，只做 HTTP 适配
├── services/        # 核心业务逻辑
├── models/
├── routes/
├── middlewares/
└── utils/
    └── AppError.js
```

---

## 四、自定义错误 `AppError`

```javascript
// src/utils/AppError.js
class AppError extends Error {
	constructor(message, statusCode) {
		super(message);
		this.statusCode = statusCode;
	}
}
module.exports = AppError;
```

在 Service 中：`throw new AppError('说明', 400)`；全局 `errorHandler` 根据 `err.statusCode` 返回对应 HTTP 状态。

**为何用 `class extends Error` 而不是普通函数？**  
便于 `instanceof AppError` 区分业务异常与未预期错误；错误栈更准确。

---

## 五、与 Java (Spring Boot) 的对应关系

| Spring Boot               | Express (本项目)     |
| ------------------------- | -------------------- |
| `@RestController`         | `controllers/`       |
| `@Service`                | `services/`          |
| `@Repository`             | `models/` + Mongoose |
| 自定义 `RuntimeException` | `AppError`           |

分层思想一致：**Controller → Service → Model/Repository**。

---

## 六、本项目中的约定

- **认证相关**：`authService.js` + `authController.js`
- **比赛 / 球队 / 用户**：`matchService.js`、`teamService.js`、`userService.js` 与对应 Controller
- **Mongoose `ValidationError`**：在 `errorHandler.js` 中统一转为 400 与可读 `message`，避免在每个 Controller 里重复处理

---

## 七、易错点

1. `new AppError(msg, code)` 已在构造函数里设置 `statusCode`，无需再写 `err.statusCode = code`。
2. 同一 Service 内对业务错误应统一使用 `AppError`，避免混用 `new Error` + 手动挂 `statusCode`。
3. Service 入参使用**纯数据**（如 `userId`、`body`），不要传入整个 `req` 对象。

---

_文档随项目演进可继续补充。_

# WebUI API 开发规范

## 使用 ntCall 而非创建新的 HTTP API

当需要在 WebUI 前端调用 NTQQ 相关功能时，**必须使用 `ntCall` 函数**通过 `/api/ntcall/:service/:method` 端点调用，而不是在后端创建新的 HTTP API 端点。

### 可用的服务

- `ntUserApi` - 用户相关 API
- `ntGroupApi` - 群组相关 API
- `ntFriendApi` - 好友相关 API
- `ntFileApi` - 文件相关 API
- `ntMsgApi` - 消息相关 API
- `pmhq` - 协议相关 API（戳一戳等）

### 使用示例

```typescript
// 前端调用示例
import { ntCall } from '../utils/webqqApi'

// 获取用户信息
const userInfo = await ntCall('ntUserApi', 'fetchUserDetailInfo', [uid])

// 戳一戳
await ntCall('pmhq', 'sendGroupPoke', [groupCode, targetUin])
await ntCall('pmhq', 'sendFriendPoke', [targetUin])

// 获取群成员
const members = await ntCall('ntGroupApi', 'getGroupMembers', [groupCode])
```

### 为什么不创建新的 HTTP API

1. 减少后端代码维护成本
2. 保持 API 调用的一致性
3. 前端可以直接调用任何已暴露的 NT API 方法
4. 避免重复封装相同的功能

# FileManager - 企业级在线文件管理系统

> 一个基于 Vue 3 + Node.js + Express 的现代化在线文件管理系统，提供完整的文件管理和大文件上传解决方案

## 🌟 项目亮点

### 技术架构亮点
- **前后端分离架构**：Vue 3 + Express 现代化技术栈
- **TypeScript 就绪**：完整的类型支持，易于维护和扩展
- **响应式设计**：完美适配桌面端和移动端
- **模块化开发**：组件化、可复用的代码结构

### 核心功能特色
- **大文件分片上传**：100MB+ 文件自动分片上传，支持断点续传
- **实时文件管理**：完整的增删改查、重命名、文件夹管理
- **中文文件名支持**：完善的文件名编码处理，无乱码问题
- **可视化上传进度**：实时显示上传状态和进度

## 🚀 技术栈

### 前端技术
- **Vue 3** - 组合式 API，现代化响应式开发
- **Axios** - HTTP 请求库，支持拦截器和进度监控
- **原生 CSS3** - 现代化 UI 设计，无第三方 UI 依赖
- **ES6+** - 现代 JavaScript 语法

### 后端技术
- **Node.js + Express** - 高性能服务端运行时
- **express-fileupload** - 文件上传中间件
- **CORS** - 跨域请求支持
- **原生 fs 模块** - 文件系统操作

## 📁 项目结构

```
cloud-drive/
├── server/                 # 后端服务
│   ├── config/            # 配置文件
│   ├── controllers/       # 业务控制器
│   ├── middleware/        # 中间件
│   ├── routes/           # 路由定义
│   ├── uploads/          # 文件存储目录
│   └── app.js           # 服务入口
└── client/               # 前端应用
    ├── src/
    │   ├── components/   # Vue 组件
    │   │   ├── FileManager.vue
    │   │   ├── PreviewModal.vue
    │   │   ├── Modal.vue
    │   │   └── ContextMenu.vue
    │   ├── utils/        # 工具函数
    │   │   ├── upload.js
    │   │   └── formatters.js
    │   └── App.vue      # 根组件
    └── package.json
```

## 🔧 核心功能实现

### 1. 大文件分片上传
```javascript
// 智能分片策略
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB 分片
const uploadLargeFile = async (file, onProgress) => {
  // 1. 初始化上传会话
  // 2. 分片并行上传
  // 3. 服务端分片合并
  // 4. 进度实时回调
};
```

### 2. 文件管理器核心
```javascript
class FileManager {
  async getFiles(path) {}      // 文件列表获取
  async createFolder(name) {}  // 文件夹创建
  async renameFile() {}        // 文件重命名
  async deleteFile() {}        // 安全删除
}
```

## 🛠 安装和运行

### 环境要求
- Node.js >= 22.20

### 后端服务
```bash
# 前后端一起运行
pnpm run dev
```
```bash
cd server
npm install
npm start
# 服务运行在 http://localhost:3000
```

### 前端应用
```bash
cd client
npm install
npm run dev
# 应用运行在 http://localhost:8080
```

## 📊 性能优化

### 前端优化
- **虚拟滚动**：大文件列表性能优化
- **懒加载**：图片和文件按需加载
- **请求防抖**：搜索和过滤操作优化
- **内存管理**：及时释放文件对象引用

### 后端优化
- **流式处理**：大文件读写使用 Stream
- **分片上传**：降低内存占用
- **路径安全**：防止目录遍历攻击
- **错误恢复**：上传失败自动重试

## 🔒 安全特性
- **路径验证**：所有文件路径均验证在根目录内
- **文件类型限制**：可配置允许上传的文件类型
- **大小限制**：防止超大文件攻击
- **XSS 防护**：文件名和内容转义处理

## 🎯 设计模式与最佳实践

### 采用的设计模式
- **观察者模式**：文件上传进度通知
- **工厂模式**：文件预览器创建
- **策略模式**：不同文件类型的上传策略
- **单例模式**：配置管理和服务初始化

## 💡 技术决策说明

### 为什么选择 Vue 3？
- 组合式 API 更好的逻辑复用
- 更好的 TypeScript 支持
- 更小的打包体积和更好的性能
- 活跃的生态系统



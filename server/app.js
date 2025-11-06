const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fileRoutes = require('./routes/files');

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
const mainDirectory = path.join(__dirname, 'uploads');
if (!fs.existsSync(mainDirectory)) {
  fs.mkdirSync(mainDirectory, { recursive: true });
}
app.use('/static', express.static(mainDirectory));

// 路由
app.use('/api/files', fileRoutes);

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`主目录: ${mainDirectory}`);
});
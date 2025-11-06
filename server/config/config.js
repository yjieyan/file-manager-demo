const path = require('path');

// 配置基础目录 - 可以根据需要修改
const BASE_DIR = path.join(process.cwd(), 'file-storage');

module.exports = {
  BASE_DIR,
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_EXTENSIONS: ['.txt', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx', '.xls', '.xlsx']
};
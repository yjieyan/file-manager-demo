const path = require('path');

module.exports = {
  // 主目录路径
  MAIN_DIRECTORY: path.join(__dirname, '../uploads'),
  
  // 文件上传配置
  UPLOAD_CONFIG: {
    maxFileSize: 1024 * 1024 * 1024, // 1GB
    chunkSize: 5 * 1024 * 1024, // 5MB 分片大小
    tempDir: path.join(__dirname, '../temp')
  },
  
  // 允许的文件类型
  ALLOWED_FILE_TYPES: [
    'image/*',
    'video/*',
    'audio/*',
    'application/pdf',
    'text/*',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};
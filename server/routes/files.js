const express = require('express');
const fileUpload = require('express-fileupload');
const fileController = require('../controllers/fileController');

const router = express.Router();

// 文件上传中间件
router.use(fileUpload({
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
  abortOnLimit: true,
  createParentPath: true
}));

// 文件管理路由
router.get('/list', fileController.getFiles);
router.post('/folder', fileController.createFolder);
router.put('/rename', fileController.rename);
router.delete('/delete', fileController.delete);

// 文件上传路由
router.post('/upload', fileController.upload);
router.post('/upload/chunk/init', fileController.initChunkUpload);
router.post('/upload/chunk', fileController.uploadChunk);
router.post('/upload/chunk/merge', fileController.mergeChunks);

module.exports = router;
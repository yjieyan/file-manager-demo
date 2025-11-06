const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { MAIN_DIRECTORY, UPLOAD_CONFIG } = require('../config');

class FileController {
  // 获取文件列表
  async getFiles(req, res) {
    try {
      const { dir = '' } = req.query;
      const currentPath = path.join(MAIN_DIRECTORY, dir);
      
      // 安全检查：确保路径在主目录内
      if (!currentPath.startsWith(MAIN_DIRECTORY)) {
        return res.status(400).json({ error: '无效的路径' });
      }
      
      const files = await fs.readdir(currentPath, { withFileTypes: true });
      const fileList = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(currentPath, file.name);
          const stat = await fs.stat(filePath);
          
          return {
            name: file.name,
            path: path.join(dir, file.name),
            isDirectory: file.isDirectory(),
            size: stat.size,
            modified: stat.mtime,
            created: stat.birthtime
          };
        })
      );
      
      res.json({
        currentPath: dir,
        files: fileList.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        })
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 创建文件夹
  async createFolder(req, res) {
    try {
      const { path: dirPath, name } = req.body;
      const fullPath = path.join(MAIN_DIRECTORY, dirPath, name);
      
      if (!fullPath.startsWith(MAIN_DIRECTORY)) {
        return res.status(400).json({ error: '无效的路径' });
      }
      
      await fs.mkdir(fullPath, { recursive: true });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 重命名文件、文件夹
  async rename(req, res) {
    try {
      const { oldPath, newName } = req.body;
      const fullOldPath = path.join(MAIN_DIRECTORY, oldPath);
      const fullNewPath = path.join(path.dirname(fullOldPath), newName);
      
      if (!fullOldPath.startsWith(MAIN_DIRECTORY) || !fullNewPath.startsWith(MAIN_DIRECTORY)) {
        return res.status(400).json({ error: '无效的路径' });
      }
      
      await fs.rename(fullOldPath, fullNewPath);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 删除文件文件夹
  async delete(req, res) {
    try {
      const { filePath } = req.body;
      const fullPath = path.join(MAIN_DIRECTORY, filePath);
      
      if (!fullPath.startsWith(MAIN_DIRECTORY)) {
        return res.status(400).json({ error: '无效的路径' });
      }
      
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await fs.rm(fullPath, { recursive: true });
      } else {
        await fs.unlink(fullPath);
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 普通文件上传
  async upload(req, res) {
    try {
      if (!req.files || !req.files.file) {
        return res.status(400).json({ error: '没有文件被上传' });
      }
      
      const file = req.files.file;
      const { path: dirPath = '' } = req.body;
      const uploadPath = path.join(MAIN_DIRECTORY, dirPath);
      
      if (!uploadPath.startsWith(MAIN_DIRECTORY)) {
        return res.status(400).json({ error: '无效的上传路径' });
      }
      
      // 处理文件名编码
      const decodedName = Buffer.from(file.name, 'latin1').toString('utf8');
      const filePath = path.join(uploadPath, decodedName);
      
      await file.mv(filePath);
      res.json({ success: true, path: filePath });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // 大文件上传 - 初始化
   async initChunkUpload(req, res) {
    try {
      const { fileName, fileSize, totalChunks, path: dirPath = '' } = req.body;
      
      if (!fileName || !fileSize || !totalChunks) {
        return res.status(400).json({ error: '缺少必要参数' });
      }
      
      const decodedName = Buffer.from(fileName, 'latin1').toString('utf8');
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 创建临时目录
      const tempDir = path.join(UPLOAD_CONFIG.tempDir, uploadId);
      await fs.mkdir(tempDir, { recursive: true });
      
      // 验证目标路径
      const targetDir = path.join(MAIN_DIRECTORY, dirPath);
      if (!targetDir.startsWith(MAIN_DIRECTORY)) {
        await fs.rmdir(tempDir); // 清理临时目录
        return res.status(400).json({ error: '无效的上传路径' });
      }
      
      // 保存上传信息到临时文件（可选）
      const uploadInfo = {
        uploadId,
        fileName: decodedName,
        fileSize: parseInt(fileSize),
        totalChunks: parseInt(totalChunks),
        uploadedChunks: 0,
        uploadPath: path.join(targetDir, decodedName),
        startTime: new Date().toISOString()
      };
      
      await fs.writeFile(
        path.join(tempDir, 'upload_info.json'),
        JSON.stringify(uploadInfo, null, 2)
      );
      
      res.json({ 
        uploadId, 
        success: true,
        message: '上传会话创建成功'
      });
      
    } catch (error) {
      console.error('初始化分片上传失败:', error);
      res.status(500).json({ error: `初始化分片上传失败: ${error.message}` });
    }
  }

  // 大文件上传 - 上传分片
  async uploadChunk(req, res) {
    try {
      const { uploadId, chunkIndex } = req.body;
      
      if (!uploadId || chunkIndex === undefined) {
        return res.status(400).json({ error: '缺少必要参数' });
      }
      
      if (!req.files || !req.files.chunk) {
        return res.status(400).json({ error: '没有分片文件' });
      }
      
      const chunk = req.files.chunk;
      const tempDir = path.join(UPLOAD_CONFIG.tempDir, uploadId);
      
      // 检查上传会话是否存在
      try {
        await fs.access(tempDir);
      } catch (error) {
        return res.status(400).json({ error: '上传会话不存在或已过期' });
      }
      
      const chunkPath = path.join(tempDir, `chunk-${chunkIndex}`);
      await chunk.mv(chunkPath);
      
      // 更新上传信息
      try {
        const uploadInfoPath = path.join(tempDir, 'upload_info.json');
        const uploadInfo = JSON.parse(await fs.readFile(uploadInfoPath, 'utf8'));
        uploadInfo.uploadedChunks = (uploadInfo.uploadedChunks || 0) + 1;
        await fs.writeFile(uploadInfoPath, JSON.stringify(uploadInfo, null, 2));
      } catch (error) {
        console.warn('更新上传信息失败:', error);
      }
      
      res.json({ 
        success: true, 
        chunkIndex: parseInt(chunkIndex),
        message: `分片 ${chunkIndex} 上传成功`
      });
      
    } catch (error) {
      console.error('分片上传失败:', error);
      res.status(500).json({ error: `分片上传失败: ${error.message}` });
    }
  }

  // 大文件上传 - 合并分片
  async mergeChunks(req, res) {
    try {
      const { uploadId, fileName, path: dirPath = '' } = req.body;
      const tempDir = path.join(UPLOAD_CONFIG.tempDir, uploadId);
      
      // 检查临时目录是否存在
      try {
        await fs.access(tempDir);
      } catch (error) {
        return res.status(400).json({ error: '上传会话不存在或已过期' });
      }
      
      const chunks = await fs.readdir(tempDir);
      
      // 按分片索引排序
      chunks.sort((a, b) => {
        const aIndex = parseInt(a.split('-')[1]);
        const bIndex = parseInt(b.split('-')[1]);
        return aIndex - bIndex;
      });
      
      // 处理文件名编码
      const decodedName = Buffer.from(fileName, 'latin1').toString('utf8');
      const finalDir = path.join(MAIN_DIRECTORY, dirPath);
      const finalPath = path.join(finalDir, decodedName);
      
      // 确保目标目录存在
      await fs.mkdir(finalDir, { recursive: true });
      
      // 使用流式写入合并文件
      const writeStream = fsSync.createWriteStream(finalPath);
      
      // 按顺序合并所有分片
      for (const chunk of chunks) {
        const chunkPath = path.join(tempDir, chunk);
        const chunkData = await fs.readFile(chunkPath);
        writeStream.write(chunkData);
        
        // 删除已合并的分片
        await fs.unlink(chunkPath);
      }
      
      writeStream.end();
      
      // 等待写入完成
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      // 删除临时目录
      await fs.rmdir(tempDir);
      
      res.json({ 
        success: true, 
        path: finalPath,
        message: '文件合并成功'
      });
      
    } catch (error) {
      console.error('合并分片失败:', error);
      res.status(500).json({ error: `合并分片失败: ${error.message}` });
    }
  }
}

module.exports = new FileController();
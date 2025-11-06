import axios from 'axios'

const API_BASE = 'http://localhost:3000/api/files'

// 普通文件上传
export async function uploadFile(file, path, onProgress) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('path', path)

  try {
    const response = await axios.post(`${API_BASE}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(progress)
        }
      },
      timeout: 300000 // 5分钟超时
    })
    
    return response.data
  } catch (error) {
    throw new Error(`上传失败: ${error.response?.data?.error || error.message}`)
  }
}


// 大文件分片上传
export async function uploadLargeFile(file, path, onProgress) {
  const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  
  try {
    console.log(`开始大文件上传: ${file.name}, 大小: ${file.size}, 分片数: ${totalChunks}`)
    
    // 1. 初始化上传
    const initResponse = await axios.post(`${API_BASE}/upload/chunk/init`, {
      fileName: file.name,
      fileSize: file.size,
      totalChunks: totalChunks,
      path: path
    })
    
    if (!initResponse.data.success) {
      throw new Error(initResponse.data.error || '初始化上传失败')
    }
    
    const { uploadId } = initResponse.data
    console.log(`上传会话创建成功: ${uploadId}`)
    
    // 2. 上传分片
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = file.slice(start, end)
      
      const chunkFormData = new FormData()
      chunkFormData.append('chunk', chunk)
      chunkFormData.append('uploadId', uploadId)
      chunkFormData.append('chunkIndex', chunkIndex)
      
      const chunkResponse = await axios.post(`${API_BASE}/upload/chunk`, chunkFormData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 300000 // 5分钟超时
      })
      
      if (!chunkResponse.data.success) {
        throw new Error(chunkResponse.data.error || `分片 ${chunkIndex} 上传失败`)
      }
      
      // 更新进度
      if (onProgress) {
        const progress = Math.round(((chunkIndex + 1) * 100) / totalChunks)
        onProgress(progress)
      }
      
      console.log(`分片 ${chunkIndex + 1}/${totalChunks} 上传完成`)
    }
    
    // 3. 合并分片
    console.log('开始合并分片...')
    const mergeResponse = await axios.post(`${API_BASE}/upload/chunk/merge`, {
      uploadId,
      fileName: file.name,
      path: path
    })
    
    if (!mergeResponse.data.success) {
      throw new Error(mergeResponse.data.error || '合并分片失败')
    }
    
    console.log('文件上传完成:', mergeResponse.data)
    return mergeResponse.data
    
  } catch (error) {
    console.error('大文件上传失败:', error)
    throw new Error(`大文件上传失败: ${error.message}`)
  }
}
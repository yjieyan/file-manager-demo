<template>
  <div class="file-manager">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button
          @click="goBack"
          :disabled="!canGoBack"
          class="btn btn-secondary"
        >
          ← 返回
        </button>
        <button @click="refresh" class="btn btn-secondary">刷新</button>
        <span class="current-path">{{ currentPath || "/" }}</span>
      </div>
      <div class="toolbar-right">
        <button @click="showCreateFolder = true" class="btn btn-primary">
          新建文件夹
        </button>
        <button @click="triggerFileUpload" class="btn btn-primary">
          上传文件
        </button>
        <input
          type="file"
          ref="fileInput"
          @change="handleFileSelect"
          multiple
          style="display: none"
        />
      </div>
    </div>

    <!-- 文件列表 -->
    <div class="file-list-container">
      <div class="file-list-header">
        <div class="file-name">名称</div>
        <div class="file-size">大小</div>
        <div class="file-modified">修改时间</div>
        <div class="file-actions">操作</div>
      </div>

      <div class="file-list">
        <div
          v-for="file in files"
          :key="file.path"
          class="file-item"
          @dblclick="handleItemDblClick(file)"
          @contextmenu.prevent="showContextMenu($event, file)"
        >
          <div class="file-name">
            <span class="file-icon" :class="getFileIcon(file)"></span>
            <span class="file-name-text">{{ file.name }}</span>
          </div>
          <div class="file-size">
            {{ formatFileSize(file.size) }}
          </div>
          <div class="file-modified">
            {{ formatDate(file.modified) }}
          </div>
          <div class="file-actions">
            <button @click="handleRename(file)" class="btn-action">
              重命名
            </button>
            <button @click="handleDelete(file)" class="btn-action btn-danger">
              删除
            </button>
          </div>
        </div>

        <div v-if="files.length === 0" class="empty-state">当前文件夹为空</div>
      </div>
    </div>

    <!-- 上传进度 -->
    <div v-if="uploadProgress.visible" class="upload-progress">
      <div class="progress-header">
        <h3>上传进度</h3>
        <button @click="uploadProgress.visible = false">×</button>
      </div>
      <div
        v-for="(file, index) in uploadProgress.files"
        :key="index"
        class="progress-item"
      >
        <div class="progress-info">
          <span>{{ file.name }}</span>
          <span>{{ file.progress }}%</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: file.progress + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 模态框 -->
    <FileModal v-if="showCreateFolder" @close="showCreateFolder = false">
      <template #header>新建文件夹</template>
      <template #body>
        <input
          v-model="newFolderName"
          @keyup.enter="createFolder"
          placeholder="输入文件夹名称"
          class="modal-input"
        />
      </template>
      <template #footer>
        <button @click="showCreateFolder = false" class="btn btn-secondary">
          取消
        </button>
        <button @click="createFolder" class="btn btn-primary">创建</button>
      </template>
    </FileModal>

    <FileModal v-if="showRenameModal" @close="showRenameModal = false">
      <template #header>重命名</template>
      <template #body>
        <input
          v-model="renameNewName"
          @keyup.enter="confirmRename"
          class="modal-input"
        />
      </template>
      <template #footer>
        <button @click="showRenameModal = false" class="btn btn-secondary">
          取消
        </button>
        <button @click="confirmRename" class="btn btn-primary">确认</button>
      </template>
    </FileModal>

    <!-- 右键菜单 -->
    <ContextMenu
      v-if="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @close="contextMenu.visible = false"
    />
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from "vue";
import axios from "axios";
import FileModal from "./FileModal.vue";
import ContextMenu from "./ContextMenu.vue";
import { formatFileSize, formatDate } from "../utils/formatters";
import { uploadFile, uploadLargeFile } from "../utils/upload";

const API_BASE = "http://localhost:3000/api/files";

export default {
  name: "FileManager",
  components: {
    FileModal,
    ContextMenu,
  },
  setup() {
    // 响应式数据
    const files = ref([]);
    const currentPath = ref("");
    const showCreateFolder = ref(false);
    const showRenameModal = ref(false);
    const newFolderName = ref("");
    const renameFile = ref(null);
    const renameNewName = ref("");
    const fileInput = ref(null);
    const pathHistory = ref([]);

    // 上传进度
    const uploadProgress = reactive({
      visible: false,
      files: [],
    });

    // 右键菜单
    const contextMenu = reactive({
      visible: false,
      x: 0,
      y: 0,
      targetFile: null,
    });

    // 计算属性
    const canGoBack = computed(() => pathHistory.value.length > 0);

    const contextMenuItems = computed(() => [
      {
        label: "打开",
        action: () => handleItemDblClick(contextMenu.targetFile),
      },
      { label: "重命名", action: () => handleRename(contextMenu.targetFile) },
      { label: "删除", action: () => handleDelete(contextMenu.targetFile) },
      { label: "下载", action: () => handleDownload(contextMenu.targetFile) },
    ]);

    // 方法
    const loadFiles = async (path = "") => {
      try {
        const response = await axios.get(`${API_BASE}/list`, {
          params: { dir: path },
        });
        files.value = response.data.files;
        currentPath.value = response.data.currentPath;
      } catch (error) {
        console.error("加载文件列表失败:", error);
        alert("加载文件列表失败");
      }
    };

    const goBack = () => {
      if (pathHistory.value.length > 0) {
        const previousPath = pathHistory.value.pop();
        loadFiles(previousPath);
      }
    };

    const refresh = () => {
      loadFiles(currentPath.value);
    };

    const handleItemDblClick = (file) => {
      if (file.isDirectory) {
        pathHistory.value.push(currentPath.value);
        loadFiles(file.path);
      } else {
        // 处理文件打开
        handleDownload(file);
      }
    };

    const triggerFileUpload = () => {
      fileInput.value.click();
    };

    const handleFileSelect = async (event) => {
      const selectedFiles = Array.from(event.target.files);
      if (selectedFiles.length === 0) return;

      // 修复：只存储必要信息，避免循环引用
      uploadProgress.visible = true;
      uploadProgress.files = selectedFiles.map((file) => ({
        name: file.name,
        size: file.size,
        progress: 0,
        status: "pending",
        uploadId: `ui_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      }));

      // 并行上传文件
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const progressFile = uploadProgress.files[index];

        try {
          progressFile.status = "uploading";

          if (file.size > 100 * 1024 * 1024) {
            // 100MB
            console.log(`大文件上传: ${file.name}`);
            await uploadLargeFile(file, currentPath.value, (progress) => {
              progressFile.progress = progress;
            });
          } else {
            console.log(`普通文件上传: ${file.name}`);
            await uploadFile(file, currentPath.value, (progress) => {
              progressFile.progress = progress;
            });
          }

          progressFile.progress = 100;
          progressFile.status = "success";
          console.log(`文件上传成功: ${file.name}`);
        } catch (error) {
          console.error(`上传文件 ${file.name} 失败:`, error);
          progressFile.status = "error";
          progressFile.error = error.message;
          alert(`上传文件 ${file.name} 失败: ${error.message}`);
        }
      });

      // 等待所有上传完成
      await Promise.allSettled(uploadPromises);

      // 刷新文件列表
      refresh();

      // 3秒后隐藏进度条（如果有成功上传的文件）
      const hasSuccessfulUploads = uploadProgress.files.some(
        (file) => file.status === "success"
      );
      if (hasSuccessfulUploads) {
        setTimeout(() => {
          uploadProgress.visible = false;
          uploadProgress.files = [];
        }, 3000);
      }

      // 清空文件输入
      event.target.value = "";
    };

    const createFolder = async () => {
      if (!newFolderName.value.trim()) {
        alert("请输入文件夹名称");
        return;
      }

      try {
        await axios.post(`${API_BASE}/folder`, {
          path: currentPath.value,
          name: newFolderName.value,
        });
        showCreateFolder.value = false;
        newFolderName.value = "";
        refresh();
      } catch (error) {
        console.error("创建文件夹失败:", error);
        alert("创建文件夹失败");
      }
    };

    const handleRename = (file) => {
      renameFile.value = file;
      renameNewName.value = file.name;
      showRenameModal.value = true;
      contextMenu.visible = false;
    };

    const confirmRename = async () => {
      if (!renameNewName.value.trim()) {
        alert("请输入新名称");
        return;
      }

      try {
        await axios.put(`${API_BASE}/rename`, {
          oldPath: renameFile.value.path,
          newName: renameNewName.value,
        });
        showRenameModal.value = false;
        renameFile.value = null;
        renameNewName.value = "";
        refresh();
      } catch (error) {
        console.error("重命名失败:", error);
        alert("重命名失败");
      }
    };

    const handleDelete = async (file) => {
      if (!confirm(`确定要删除 "${file.name}" 吗？`)) {
        return;
      }

      try {
        await axios.delete(`${API_BASE}/delete`, {
          data: { filePath: file.path },
        });
        contextMenu.visible = false;
        refresh();
      } catch (error) {
        console.error("删除失败:", error);
        alert("删除失败");
      }
    };

    const handleDownload = (file) => {
      if (file.isDirectory) return;

      const downloadUrl = `http://localhost:3000/static/${file.path}`;
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const showContextMenu = (event, file) => {
      contextMenu.x = event.clientX;
      contextMenu.y = event.clientY;
      contextMenu.targetFile = file;
      contextMenu.visible = true;
    };

    const getFileIcon = (file) => {
      if (file.isDirectory) return "icon-folder";

      const ext = file.name.split(".").pop().toLowerCase();
      const iconMap = {
        pdf: "icon-pdf",
        doc: "icon-word",
        docx: "icon-word",
        xls: "icon-excel",
        xlsx: "icon-excel",
        ppt: "icon-ppt",
        pptx: "icon-ppt",
        jpg: "icon-image",
        jpeg: "icon-image",
        png: "icon-image",
        gif: "icon-image",
        mp4: "icon-video",
        avi: "icon-video",
        mov: "icon-video",
        mp3: "icon-audio",
        wav: "icon-audio",
      };
      return iconMap[ext] || "icon-file";
    };

    // 生命周期
    onMounted(() => {
      loadFiles();
    });

    return {
      files,
      currentPath,
      showCreateFolder,
      showRenameModal,
      newFolderName,
      renameNewName,
      fileInput,
      uploadProgress,
      contextMenu,
      contextMenuItems,
      canGoBack,
      goBack,
      refresh,
      handleItemDblClick,
      triggerFileUpload,
      handleFileSelect,
      createFolder,
      handleRename,
      confirmRename,
      handleDelete,
      handleDownload,
      showContextMenu,
      getFileIcon,
      formatFileSize,
      formatDate,
    };
  },
};
</script>

<style scoped>
.file-manager {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.current-path {
  margin-left: 1rem;
  color: #666;
  font-size: 0.9rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-action {
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
}

.btn-danger {
  color: #dc3545;
}

.file-list-container {
  flex: 1;
  background: white;
  margin: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.file-list-header {
  display: grid;
  grid-template-columns: 3fr 1fr 1fr 1fr;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 600;
  color: #666;
}

.file-list {
  overflow-y: auto;
  max-height: calc(100vh - 200px);
}

.file-item {
  display: grid;
  grid-template-columns: 3fr 1fr 1fr 1fr;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-item:hover {
  background: #f8f9fa;
}

.file-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-icon {
  width: 20px;
  height: 20px;
  display: inline-block;
  background-size: contain;
  background-repeat: no-repeat;
}

.icon-folder {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ffb74d'%3E%3Cpath d='M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z'/%3E%3C/svg%3E");
}
.icon-file {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23757575'%3E%3Cpath d='M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z'/%3E%3C/svg%3E");
}
.icon-image {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234caf50'%3E%3Cpath d='M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'/%3E%3C/svg%3E");
}

.file-name-text {
  word-break: break-all;
}

.file-size,
.file-modified {
  color: #666;
  font-size: 0.9rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #999;
}

.upload-progress {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  width: 300px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.progress-header h3 {
  margin: 0;
  font-size: 1rem;
}

.progress-header button {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #666;
}

.progress-item {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.progress-item:last-child {
  border-bottom: none;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.progress-bar {
  height: 4px;
  background: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #007bff;
  transition: width 0.3s;
}

.modal-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
</style>

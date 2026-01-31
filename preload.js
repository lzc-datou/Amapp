// preload.js
const { contextBridge, ipcRenderer } = require('electron');

// 安全地将API暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 裂缝数据管理
    addCrack: (crackData) => ipcRenderer.invoke('add-crack', crackData),
    getAllCracks: () => ipcRenderer.invoke('get-all-cracks'),
    deleteCrack: (crackId) => ipcRenderer.invoke('delete-crack', crackId),
    
    // 文件操作
    browseFile: () => ipcRenderer.invoke('browse-file'),
    exportData: () => ipcRenderer.invoke('export-data'),
    
    // 3D模型查看
    openModelViewer: (modelPath) => ipcRenderer.invoke('open-model-viewer', modelPath)
    
});
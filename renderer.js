// renderer.js - 修复版本
class CrackMapApp {
    constructor() {
        this.map = null;
        this.markers = [];
        this.currentInfoWindow = null;
        this.confirmCallback = null;
        
        // 配置信息（实际应用中应通过 IPC 从主进程获取）
        this.config = {
            amap: {
                key: '49da9c37724f9fb6fb9572169e1abb5d',
                securityCode: '303faf2f4f1f1dd1cb2a4b173e2b2a7f'
            },
            map: {
                center: [116.397428, 39.90923],
                zoom: 13,
                viewMode: '3D',
                pitch: 0
            }
        };
        
        this.init();
    }

    async init() {
        await this.loadAMap();
        this.bindEvents();
        this.loadCrackData();
    }

    // 高德地图加载方法
    loadAMap() {
        return new Promise((resolve, reject) => {
            // 检查是否已加载
            if (window.AMap) {
                resolve();
                return;
            }

            // 设置安全配置
            window._AMapSecurityConfig = {
                securityJsCode: this.config.amap.securityCode,
            };

            // 加载高德地图API
            window.AMapLoader.load({
                key: this.config.amap.key,
                version: "2.0",
                plugins: ['AMap.ControlBar', 'AMap.ToolBar', 'AMap.Scale']
            }).then((AMap) => {
                console.log('AMap API has been loaded successfully.');
                this.initMap(AMap);
                resolve();
            }).catch((error) => {
                console.error('AMap failed to load:', error);
                this.showMapError();
                reject(error);
            });
        });
    }

    // 地图初始化
    initMap(AMap) {
        try {
            this.map = new AMap.Map('map', {
                viewMode: this.config.map.viewMode,
                zoom: this.config.map.zoom,
                center: this.config.map.center,
                pitch: this.config.map.pitch,
                rotateEnable: true,
                pitchEnable: true
            });

            // 添加地图加载完成事件
            this.map.on('complete', () => {
                console.log('The map has been loaded successfully.');
                const statusElement = document.getElementById('map-status');
                if (statusElement) {
                    statusElement.style.display = 'none';
                }
            });

            // 添加控制插件
            AMap.plugin(['AMap.ControlBar', 'AMap.ToolBar'], () => {
                // 添加控制条
                const controlBar = new AMap.ControlBar({
                    position: { right: '10px', top: '10px' }
                });
                this.map.addControl(controlBar);

                // 添加工具条
                const toolBar = new AMap.ToolBar({
                    position: { right: '10px', top: '100px' }
                });
                this.map.addControl(toolBar);
            });

        } catch (error) {
            console.error('Map initialization failed:', error);
            this.showMapError();
        }
    }

    // 显示地图错误信息
    showMapError() {
        const statusElement = document.getElementById('map-status');
        if (statusElement) {
            statusElement.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #d63031;">
                    <h3>地图加载失败</h3>
                    <p>错误信息：请检查网络连接和API密钥配置</p>
                    <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        重新加载
                    </button>
                </div>
            `;
        }
    }
    // HTML转义函数，防止XSS
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // 截断路径显示
    truncatePath(path, maxLength = 30) {
        if (path.length <= maxLength) return this.escapeHtml(path);
        const half = Math.floor(maxLength / 2) - 2;
        return this.escapeHtml(path.substring(0, half) + '...' + path.substring(path.length - half));
    }

    // 绑定事件
    bindEvents() {
        // 添加标记按钮
        document.getElementById('add-marker-btn').addEventListener('click', () => {
            this.showAddMarkerModal();
        });

        // 查看所有裂缝按钮
        document.getElementById('view-all-btn').addEventListener('click', () => {
            this.showCrackListModal();
        });

        // 导出数据按钮
        document.getElementById('export-data-btn').addEventListener('click', () => {
            this.exportData();
        });

        // 模态框关闭事件
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // 浏览文件按钮 - 使用预加载API
        document.getElementById('browse-btn').addEventListener('click', async () => {
            if (window.electronAPI && window.electronAPI.browseFile) {
                const filePath = await window.electronAPI.browseFile();
                if (filePath) {
                    document.getElementById('model-path').value = filePath;
                }
            } else {
                this.showMessage('文件浏览功能不可用', 'error');
            }
        });

        // 裂缝表单提交
        document.getElementById('crack-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCrackMarker();
        });

        // 取消按钮
        document.getElementById('cancel-btn').addEventListener('click', () => {
            this.hideModal('add-marker-modal');
        });

        // 确认对话框按钮
        document.getElementById('confirm-yes').addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback(true);
                this.confirmCallback = null;
            }
            this.hideModal('confirm-modal');
        });

        document.getElementById('confirm-no').addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback(false);
                this.confirmCallback = null;
            }
            this.hideModal('confirm-modal');
        });

        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
        const searchInput = document.getElementById('search-crack-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const keyword = e.target.value.toLowerCase();
                const rows = document.querySelectorAll('#crack-table-body tr');
                
                rows.forEach(row => {
                    const name = row.cells[0].textContent.toLowerCase();
                    // 这里假设你有把描述信息存入 data 属性或想要搜索其它列，目前基于名称搜索
                    if (name.includes(keyword)) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                });
            });
        }
    }

    // 显示添加标记模态框
    showAddMarkerModal() {
        const modal = document.getElementById('add-marker-modal');
        if (modal) {
            modal.style.display = 'block';
            document.getElementById('crack-form').reset();
        }
    }

    // 显示裂缝列表模态框
    async showCrackListModal() {
        const modal = document.getElementById('crack-list-modal');
        if (modal) {
            await this.updateCrackTable();
            modal.style.display = 'block';
        }
    }

    // 隐藏模态框
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // 自定义确认对话框
    confirm(message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal');
            const messageEl = document.getElementById('confirm-message');
            
            if (messageEl) {
                messageEl.textContent = message;
            }
            
            if (modal) {
                modal.style.display = 'block';
                this.confirmCallback = resolve;
            }
        });
    }

    // 保存裂缝标记 - 使用预加载API
    async saveCrackMarker() {
        const formData = {
            name: document.getElementById('crack-name').value,
            longitude: document.getElementById('longitude').value,
            latitude: document.getElementById('latitude').value,
            modelPath: document.getElementById('model-path').value,
            description: document.getElementById('crack-description').value
        };

        if (!this.validateFormData(formData)) {
            return;
        }

        try {
            if (window.electronAPI && window.electronAPI.addCrack) {
                const result = await window.electronAPI.addCrack(formData);
                
                if (result.success) {
                    this.addMarkerToMap(result.data);
                    this.hideModal('add-marker-modal');
                    this.showMessage('裂缝标记添加成功！', 'success');
                } else {
                    throw new Error(result.error);
                }
            } else {
                throw new Error('API不可用');
            }
        } catch (error) {
            this.showMessage(`添加失败: ${error.message}`, 'error');
        }
    }

    // 验证表单数据
    validateFormData(data) {
        if (!data.name.trim()) {
            this.showMessage('请输入裂缝名称', 'error');
            return false;
        }

        if (!data.longitude || !data.latitude) {
            this.showMessage('请输入完整的经纬度坐标', 'error');
            return false;
        }

        if (!data.modelPath) {
            this.showMessage('请选择3D模型文件', 'error');
            return false;
        }

        return true;
    }

    // 添加标记到地图
    addMarkerToMap(crackData) {
        if (!this.map || !window.AMap) return;

        const marker = new window.AMap.Marker({
            position: [crackData.longitude, crackData.latitude],
            title: crackData.name,
            content: this.createMarkerContent(crackData.name),
            offset: new window.AMap.Pixel(-15, -15)
        });

        // 点击标记事件
        marker.on('click', () => {
            this.showCrackInfo(crackData, marker);
        });

        this.map.add(marker);
        this.markers.push({ marker, data: crackData });

        // 如果只有一个标记，将地图中心移动到该位置
        if (this.markers.length === 1) {
            this.map.setCenter([crackData.longitude, crackData.latitude]);
        }
    }

    // 创建标记点内容
    createMarkerContent(name) {
        const div = document.createElement('div');
        div.className = 'custom-marker';
        div.innerHTML = `
            <div style="display: flex; align-items: center; padding: 4px 8px; background: #e74c3c; color: white; border-radius: 12px; font-size: 12px;">
                <span style="margin-right: 5px;">🔴</span>
                <span>${name}</span>
            </div>
        `;
        return div;
    }

    // 显示裂缝信息
    showCrackInfo(crackData, marker) {
        if (!this.map || !window.AMap) return;

        // 关闭之前的信息窗口
        if (this.currentInfoWindow) {
            this.map.remove(this.currentInfoWindow);
        }

        const infoContent = `
            <div class="info-window">
                <h4>${crackData.name}</h4>
                <p><strong>位置:</strong> ${crackData.longitude}, ${crackData.latitude}</p>
                <p><strong>描述:</strong> ${crackData.description || '无描述'}</p>
                <p><strong>添加时间:</strong> ${new Date(crackData.createdAt).toLocaleString()}</p>
                <div class="info-actions">
                    <button onclick="app.viewModel('${crackData.id}')" class="btn btn-primary">查看3D模型</button>
                    <button onclick="app.deleteCrack('${crackData.id}')" class="btn btn-secondary">删除</button>
                </div>
            </div>
        `;

        this.currentInfoWindow = new window.AMap.InfoWindow({
            content: infoContent,
            offset: new window.AMap.Pixel(0, -30)
        });

        this.currentInfoWindow.open(this.map, marker.getPosition());
    }

    // 查看3D模型 - 使用预加载API
    async viewModel(crackId) {
        try {
            if (window.electronAPI && window.electronAPI.getAllCracks) {
                const cracks = await window.electronAPI.getAllCracks();
                const crack = cracks.find(c => c.id === crackId);
                
                if (crack && crack.modelPath) {
                    const result = await window.electronAPI.openModelViewer(crack.modelPath);
                    
                    if (!result.success) {
                        throw new Error(result.error);
                    }
                } else {
                    throw new Error('未找到模型文件路径');
                }
            } else {
                throw new Error('API不可用');
            }
        } catch (error) {
            this.showMessage(`打开模型失败: ${error.message}`, 'error');
        }
    }

    // 删除裂缝 - 使用预加载API
    async deleteCrack(crackId) {
        const confirmed = await this.confirm('确定要删除这个裂缝标记吗？');
        if (!confirmed) {
            return;
        }
        
        try {
            if (window.electronAPI && window.electronAPI.deleteCrack) {
                const result = await window.electronAPI.deleteCrack(crackId);
                
                if (result.success) {
                    // 从地图移除标记
                    const index = this.markers.findIndex(m => m.data.id === crackId);
                    if (index !== -1) {
                        this.map.remove(this.markers[index].marker);
                        this.markers.splice(index, 1);
                    }
                    
                    // 关闭信息窗口
                    if (this.currentInfoWindow) {
                        this.map.remove(this.currentInfoWindow);
                        this.currentInfoWindow = null;
                    }
                    
                    this.showMessage('裂缝标记删除成功！', 'success');
                    this.updateCrackTable();
                    if (this.markers.length > 0) {
                        this.map.setFitView();
                    }
                } else {
                    throw new Error(result.error);
                }
            } else {
                throw new Error('API不可用');
            }
        } catch (error) {
            this.showMessage(`删除失败: ${error.message}`, 'error');
        }
    }

    // 加载裂缝数据 - 使用预加载API
// 修改 loadCrackData 方法，让地图加载完数据后自动缩放到能看见所有裂缝的视角
    async loadCrackData() {
        try {
            if (window.electronAPI && window.electronAPI.getAllCracks) {
                const cracks = await window.electronAPI.getAllCracks();
                cracks.forEach(crack => {
                    this.addMarkerToMap(crack);
                });
                
                // 【新增逻辑】如果地图上有标记，自动调整视角以包含所有标记
                if (this.markers.length > 0 && this.map) {
                    this.map.setFitView();
                }
            }
        } catch (error) {
            console.error('加载裂缝数据失败:', error);
            this.showMessage('加载已有裂缝数据失败', 'error');
        }
    }

    // 更新裂缝表格 - 使用预加载API
    async updateCrackTable() {
        try {
            if (window.electronAPI && window.electronAPI.getAllCracks) {
                const cracks = await window.electronAPI.getAllCracks();
                const tbody = document.getElementById('crack-table-body');
                
                if (tbody) {
                    tbody.innerHTML = cracks.map(crack => `
                        <tr>
                            <td>${crack.name}</td>
                            <td>${crack.longitude}</td>
                            <td>${crack.latitude}</td>
                            <td title="${crack.modelPath}">${this.truncatePath(crack.modelPath)}</td>
                            <td>
                                <button onclick="app.viewModel('${crack.id}')" class="btn btn-primary">查看</button>
                                <button onclick="app.deleteCrack('${crack.id}')" class="btn btn-secondary">删除</button>
                            </td>
                        </tr>
                    `).join('');
                }
            }
        } catch (error) {
            console.error('更新表格失败:', error);
        }
    }

    // 导出数据 - 使用预加载API
    // 在 renderer.js 的 CrackMapApp 类中修改导出方法
    async exportData() {
        try {
            if (!window.electronAPI || !window.electronAPI.exportData) {
                this.showMessage('导出功能不可用', 'error');
                return;
            }
            
            // this.showMessage('正在准备导出数据...', 'info');
            
            const result = await window.electronAPI.exportData();
            
            if (result.success) {
                this.showMessage(`数据已成功导出到: ${result.path}`, 'success');
            } else {
                // 检查是否是用户取消的情况
                if (result.error && result.error.includes('用户取消')) {
                    this.showMessage('导出已取消', 'info');
                } else {
                    throw new Error(result.error || '导出失败');
                }
            }
        } catch (error) {
            this.showMessage(`导出失败: ${error.message}`, 'error');
        }
    }

    // 修改showMessage方法，提供更好的错误显示
    showMessage(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // 添加图标前缀
        const icons = { success: '✅ ', error: '❌ ', info: 'ℹ️ ', warning: '⚠️ ' };
        toast.innerText = (icons[type] || '') + message;

        container.appendChild(toast);

        // 触发动画
        setTimeout(() => toast.classList.add('show'), 10);

        // 3秒后自动移除
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300); // 等待淡出动画结束
        }, 3000);
    }
}

// 全局应用实例
let app;

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    app = new CrackMapApp();
});
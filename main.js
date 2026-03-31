const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fsp = require('fs').promises;
const fs = require('fs');
const config = require('./config');

// 裂缝数据存储文件路径
const DATA_FILE_PATH = path.join(__dirname, config.dataPath.crackData);

class CrackManager {
    constructor() {
        this.cracks = new Map();
        this.loadData();
    }

    // 加载裂缝数据
    async loadData() {
        try {
            const data = await fsp.readFile(DATA_FILE_PATH, 'utf8');  // 使用 fsp
            const cracksArray = JSON.parse(data);
            this.cracks = new Map(cracksArray.map(crack => [crack.id, crack]));
            console.log('The crack data has been successfully loaded:', this.cracks.size);
        } catch (error) {
            console.log('无现有数据文件，创建新数据存储');
            await this.saveData();
        }
    }

    // 保存裂缝数据
    async saveData() {
        const cracksArray = Array.from(this.cracks.values());
        await fsp.writeFile(DATA_FILE_PATH, JSON.stringify(cracksArray, null, 2));  // 使用 fsp
    }

    // 验证坐标有效性
    validateCoordinates(longitude, latitude) {
        const validLon = longitude >= -180 && longitude <= 180;
        const validLat = latitude >= -90 && latitude <= 90;
        return {
            isValid: validLon && validLat,
            error: !validLon ? '经度范围应在 -180 到 180 之间' : 
                  !validLat ? '纬度范围应在 -90 到 90 之间' : ''
        };
    }

    // 添加裂缝
    async addCrack(crackData) {
        // 验证坐标
        const longitude = parseFloat(crackData.longitude);
        const latitude = parseFloat(crackData.latitude);
        
        const validation = this.validateCoordinates(longitude, latitude);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        const id = Date.now().toString();
        const crack = {
            id,
            name: crackData.name.trim(),
            longitude,
            latitude,
            modelPath: crackData.modelPath,
            description: crackData.description || '',
            createdAt: new Date().toISOString()
        };
        
        this.cracks.set(id, crack);
        await this.saveData();
        return crack;
    }

    // 获取所有裂缝
    getAllCracks() {
        return Array.from(this.cracks.values());
    }

    // 删除裂缝
    async deleteCrack(id) {
        this.cracks.delete(id);
        await this.saveData();
    }

    // 获取裂缝详情
    getCrack(id) {
        return this.cracks.get(id);
    }
}

function createWindow() {
    const iconPath = path.join(__dirname, config.dataPath.icon);
    const iconExists = fs.existsSync(iconPath);
    
    mainWindow = new BrowserWindow({
        width: config.app.width,
        height: config.app.height,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: iconExists ? iconPath : undefined,
        title: config.app.title
    });

    if (!iconExists) {
        console.warn('应用图标未找到，使用默认图标');
    }

    mainWindow.loadFile('index.html');

    // 开发模式下打开开发者工具
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// 应用准备就绪
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC 通信处理
ipcMain.handle('add-crack', async (event, crackData) => {
    try {
        const crack = await crackManager.addCrack(crackData);
        return { success: true, data: crack };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-all-cracks', async () => {
    return crackManager.getAllCracks();
});

ipcMain.handle('delete-crack', async (event, id) => {
    try {
        await crackManager.deleteCrack(id);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('browse-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: '3D模型文件', extensions: ['glb', 'obj'] },
            { name: '所有文件', extensions: ['*'] }
        ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});
const crackManager = new CrackManager();
let mainWindow;
// 修改 open-model-viewer 处理程序
ipcMain.handle('open-model-viewer', async (event, modelPath) => {
    try {
        // 验证文件存在性 - 使用正确的 fs 模块
        if (!fs.existsSync(modelPath)) {  // 现在可以正常使用了
            return { 
                success: false, 
                error: `模型文件不存在: ${modelPath}` 
            };
        }

        // 验证文件格式
        const supportedFormats = config.model.supportedFormats;
        const fileExt = path.extname(modelPath).toLowerCase();
        if (!supportedFormats.includes(fileExt)) {
            return { 
                success: false, 
                error: `不支持的文件格式: ${fileExt}` 
            };
        }

        const { spawn } = require('child_process');
        const pythonScript = path.join(__dirname, config.dataPath.pythonScript);
        
        return new Promise((resolve) => {
            // 尝试多种 Python 命令
            const pythonCommands = ['python', 'python3', 'py'];
            let attemptedCommands = 0;
            
            const trySpawn = (command) => {
                const pythonProcess = spawn(command, [pythonScript, modelPath], {
                    cwd: __dirname,
                    windowsHide: false,
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                let output = '';
                let errorOutput = '';

                pythonProcess.stdout.on('data', (data) => {
                    const text = data.toString();
                    output += text;
                    console.log('Python output:\n', text.trim());
                });

                pythonProcess.stderr.on('data', (data) => {
                    const text = data.toString();
                    errorOutput += text;
                    console.error('Python error:', text.trim());
                });

                pythonProcess.on('close', (code) => {
                    console.log('Python Process exit code:', code);
                    
                    if (code === 0) {
                        resolve({ success: true });
                    } else {
                        resolve({ 
                            success: false, 
                            error: `模型查看器异常退出 (代码: ${code})`,
                            details: errorOutput || output
                        });
                    }
                });

                // 添加进程错误处理
                pythonProcess.on('error', (error) => {
                    attemptedCommands++;
                    console.error(`Python Process startup failed with ${command}:`, error.message);
                    
                    // 尝试下一个命令
                    if (attemptedCommands < pythonCommands.length) {
                        trySpawn(pythonCommands[attemptedCommands]);
                    } else {
                        resolve({ 
                            success: false, 
                            error: `未找到 Python 环境。请确保已安装 Python 并配置环境变量。` 
                        });
                    }
                });

                // 添加超时处理
                const timeout = setTimeout(() => {
                    if (pythonProcess.exitCode === null) {
                        console.log('Python进程超时，仍在运行');
                    }
                }, config.model.pythonTimeout);

                pythonProcess.on('close', () => {
                    clearTimeout(timeout);
                });
            };

            // 开始尝试第一个命令
            trySpawn(pythonCommands[0]);
        });
        
    } catch (error) {
        console.error('打开模型查看器失败:', error.message);
        return { success: false, error: error.message };
    }
});

// 在 main.js 中修改 export-data 处理程序
ipcMain.handle('export-data', async (event) => {
    try {
        const { dialog } = require('electron');
        const path = require('path');
        const fs = require('fs');
        
        // 获取所有裂缝数据
        const cracks = crackManager.getAllCracks();
        
        // 检查是否有数据
        if (cracks.length === 0) {
            return { 
                success: false, 
                error: '没有裂缝数据可以导出' 
            };
        }
        
        // 显示保存对话框
        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath: path.join(
                app.getPath('downloads'),  // 默认保存到下载文件夹
                `crack_data_${new Date().toISOString().slice(0, 10)}.json`
            ),
            filters: [
                { name: 'JSON文件', extensions: ['json'] },
                { name: '所有文件', extensions: ['*'] }
            ],
            properties: ['createDirectory']  // 允许创建目录
        });
        
        // 如果用户取消保存
        if (result.canceled || !result.filePath) {
            return { 
                success: false, 
                error: '用户取消保存' 
            };
        }
        
        // 保存文件 - 使用Promise包装的回调方式
        try {
            const filePath = result.filePath;
            
            // 方法1: 使用fs.promises.writeFile (推荐)
            await fs.promises.writeFile(
                filePath, 
                JSON.stringify(cracks, null, 2), 
                'utf8'
            );
            
            console.log('Data exported successfully to:', filePath);
            
            return { 
                success: true, 
                path: filePath,
                count: cracks.length
            };
            
        } catch (writeError) {
            console.error('写入文件失败:', writeError);
            return { 
                success: false, 
                error: `保存文件失败: ${writeError.message}` 
            };
        }
        
    } catch (error) {
        console.error('导出数据失败:', error);
        return { 
            success: false, 
            error: `导出失败: ${error.message}` 
        };
    }
});
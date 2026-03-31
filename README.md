# 道路裂缝信息管理系统

基于 Electron + 高德地图的桌面应用程序，用于管理道路裂缝数据的 3D 模型展示和地理位置标记。

## 功能特性

- 🗺️ 地图可视化 - 使用高德地图显示裂缝位置标记
- 📍 裂缝管理 - 添加、查看、删除裂缝信息
- 🎨 3D 模型查看 - 通过 Python + Open3D 查看 3D 模型
- 📤 数据导出 - 导出裂缝数据为 JSON 文件
- 🔍 搜索功能 - 按名称搜索裂缝
- ✅ 数据验证 - 自动验证坐标和表单数据

## 技术栈

- **前端框架**: Electron
- **地图服务**: 高德地图 API
- **3D 模型查看**: Python + Open3D
- **数据存储**: JSON 本地文件
- **样式**: 原生 CSS

## 项目结构

```
Amapp/
├── config.js              # 配置文件
├── main.js                # Electron 主进程
├── preload.js            # 预加载脚本（IPC 通信桥接）
├── index.html             # 主页面
├── renderer.js            # 渲染进程逻辑
├── styles.css             # 样式文件
├── crack_data.json        # 裂缝数据存储
├── crack_model/           # 3D 模型文件夹
├── script/
│   ├── model_viewer.py    # 3D 模型查看器
│   └── test.py            # 测试脚本
└── package.json           # 项目配置
```

## 安装和运行

### 前置要求

- Node.js (推荐 v14 或更高版本)
- Python 3.x
- pip (Python 包管理器)

### 安装步骤

1. 克隆项目
```bash
git clone <repository-url>
cd Amapp
```

2. 安装 Node.js 依赖
```bash
npm install
```

3. 安装 Python 依赖
```bash
pip install open3d numpy
```

4. 配置环境变量（可选）
```bash
cp .env.example .env
# 编辑 .env 文件，填入你的高德地图 API 密钥
```

### 运行项目

```bash
npm start
```

## 配置说明

### 高德地图配置

1. 申请高德地图 API 密钥: https://console.amap.com/dev/key/app
2. 在 `.env` 文件中配置密钥：
```
AMAP_KEY=your_key_here
AMAP_SECURITY_CODE=your_security_code_here
```

### 应用配置

编辑 `config.js` 文件可以修改应用配置：

- 窗口大小和标题
- 地图默认视图
- 支持的文件格式
- 数据文件路径等

## 使用说明

### 添加裂缝标记

1. 点击「添加裂缝标记」按钮
2. 填写裂缝名称、经纬度
3. 选择 3D 模型文件
4. 添加描述信息（可选）
5. 点击「保存」

### 查看裂缝列表

1. 点击「查看所有裂缝」按钮
2. 在搜索框中输入关键词进行搜索
3. 点击「查看」按钮查看 3D 模型
4. 点击「删除」按钮删除裂缝

### 查看 3D 模型

确保已安装以下 Python 依赖：
```bash
pip install open3d numpy
```

### 导出数据

1. 点击「导出数据」按钮
2. 选择保存位置
3. 数据将以 JSON 格式导出

## 开发

### 代码规范

- 使用 ES6+ 语法
- 遵循统一的代码风格
- 添加必要的注释

### 调试

设置环境变量：
```bash
export NODE_ENV=development
```

应用会自动打开开发者工具。

## 常见问题

### Python 环境问题

如果遇到 Python 相关错误：
1. 确认 Python 已安装并添加到 PATH
2. 安装所需依赖：`pip install open3d numpy`
3. 检查 Python 版本：`python --version`（需要 3.x）

### 地图加载失败

1. 检查网络连接
2. 确认 API 密钥配置正确
3. 检查浏览器控制台错误信息

### 3D 模型无法打开

1. 确认模型文件存在
2. 检查文件格式是否支持（.glb, .obj, .stl, .ply）
3. 检查 Python 依赖是否完整安装

## 优化改进

已实现的优化：

- ✅ 修复 HTML 重复定义
- ✅ 添加坐标验证
- ✅ 改进错误处理
- ✅ 自定义确认对话框
- ✅ 配置文件管理
- ✅ 环境变量支持

待优化项：

- 🔄 添加单元测试
- 🔄 改进模块化设计
- 🔄 添加数据导入功能
- 🔄 支持 TypeScript
- 🔄 添加日志系统

## 许可证

ISC

## 作者

lizhichong

## 更新日志

### v1.0.0 (2026-03-31)

- 初始版本发布
- 基本的裂缝管理功能
- 3D 模型查看
- 地图集成
- 数据导出功能

// 配置文件 - 管理应用配置信息
// 建议将敏感信息（如API密钥）存储在环境变量或单独的配置文件中

module.exports = {
    // 高德地图配置
    amap: {
        key: process.env.AMAP_KEY || '49da9c37724f9fb6fb9572169e1abb5d',
        securityCode: process.env.AMAP_SECURITY_CODE || '303faf2f4f1f1dd1cb2a4b173e2b2a7f'
    },
    
    // 地图默认设置
    map: {
        center: [116.397428, 39.90923],
        zoom: 13,
        viewMode: '3D',
        pitch: 0
    },
    
    // 应用配置
    app: {
        title: '道路裂缝信息管理系统',
        width: 1200,
        height: 800
    },
    
    // 3D模型配置
    model: {
        supportedFormats: ['.glb', '.obj', '.stl', '.ply'],
        pythonTimeout: 10000, // Python进程超时时间（毫秒）
        maxTriangles: 2000000  // 最大三角形数量
    },
    
    // 数据文件路径
    dataPath: {
        crackData: 'crack_data.json',
        icon: 'assets/icon.png',
        pythonScript: 'script/model_viewer.py'
    }
};

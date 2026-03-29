import sys
import os
import time

def view_model(model_path):
    """查看3D模型 - 极速加载与智能着色版"""
    if not os.path.exists(model_path):
        print("Error: File not found -", model_path)
        return False
    
    try:
        import open3d as o3d
        import numpy as np
        import time
        
        file_ext = os.path.splitext(model_path)[1].lower()
        print(f"Loading file: {model_path} (Format: {file_ext})")
        
        start_time = time.time()
        
        # 1. 极速读取模型
        mesh = o3d.io.read_triangle_mesh(model_path, enable_post_processing=True)
        
        if not mesh or not mesh.has_vertices():
            print("Error: No valid mesh data")
            return False
            
        print(f"[OK] Model loaded in {time.time() - start_time:.2f} s")
        
        # 2. 自动降采样 (防止模型过大卡顿)
        MAX_TRIANGLES = 2000000
        if len(mesh.triangles) > MAX_TRIANGLES:
            print(f"[INFO] Simplifying to {MAX_TRIANGLES} triangles...")
            mesh = mesh.simplify_quadric_decimation(target_number_of_triangles=MAX_TRIANGLES)

        # 3. 计算法线 (智能着色的基础)
        mesh.compute_vertex_normals()
        
        # =======================================================
        # 4. 核心优化：基于法线的智能着色 (沥青路面 vs 裂缝)
        # =======================================================
        print("[INFO] Applying smart coloring (Asphalt + Crack Highlight)...")
        
        # 获取所有顶点的法线向量
        normals = np.asarray(mesh.vertex_normals)
        
        # 初始化顶点颜色数组 (默认为沥青深灰色)
        colors = np.zeros_like(normals)
        
        # 设定颜色
        ASPHALT_COLOR = [0.25, 0.25, 0.27]  # 沥青马路色 (深灰略带一点蓝)
        CRACK_COLOR = [0.9, 0.15, 0.15]     # 裂缝高亮色 (醒目的红色)
        
        # 算法思路：假设 Z 轴向上 (如果是 Y 轴向上，把 normals[:, 2] 改为 normals[:, 1])
        # 平坦路面的法线大体上是指向正上方的，所以 Z 分量接近 1 或 -1
        # 我们取法线 Z 分量的绝对值，大于 0.85 认为是平坦路面，否则认为是裂缝边缘
        upward_normals = np.abs(normals[:, 2]) 
        
        # 创建遮罩 (Mask)
        flat_mask = upward_normals > 0.85
        
        # 填充颜色
        colors[flat_mask] = ASPHALT_COLOR
        colors[~flat_mask] = CRACK_COLOR
        
        # 将颜色应用回模型
        mesh.vertex_colors = o3d.utility.Vector3dVector(colors)
        # =======================================================

        print("Opening 3D viewer...")
        
        # 5. 可视化窗口设置
        vis = o3d.visualization.Visualizer()
        vis.create_window(
            window_name="道路裂缝3D模型 - 智能缺陷识别视角",
            width=1200,
            height=800
        )
        vis.add_geometry(mesh)
        
        # 6. 增强光照与渲染设置
        render_option = vis.get_render_option()
        render_option.background_color = np.array([0.95, 0.95, 0.95])  # 浅灰背景，突出模型
        render_option.light_on = True
        render_option.mesh_show_back_face = False
        
        # 运行可视化
        vis.run()
        vis.destroy_window()
        
        print("[OK] 3D viewer closed")
        return True
        
    except Exception as e:
        print("Error loading model:", str(e))
        return False

if __name__ == "__main__":
    # 强制控制台输出 UTF-8 以防乱码
    if sys.platform == 'win32':
        import ctypes
        ctypes.windll.kernel32.SetConsoleOutputCP(65001)

    if len(sys.argv) != 2:
        print("Usage: python model_viewer.py <model_path>")
        sys.exit(1)
    
    model_path = sys.argv[1]
    
    success = view_model(model_path)
    sys.exit(0 if success else 1)
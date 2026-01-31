import sys
import os

def setup_encoding():
    """设置控制台编码"""
    try:
        # 尝试设置UTF-8编码
        if sys.platform == 'win32':
            import ctypes
            ctypes.windll.kernel32.SetConsoleOutputCP(65001)
    except:
        pass

def check_dependencies():
    """检查依赖 - 使用纯ASCII字符"""
    try:
        import open3d as o3d
        print("[OK] Open3D", o3d.__version__, "installed")
    except ImportError:
        print("[ERROR] Open3D not installed")
        return False
    
    try:
        import trimesh
        print("[OK] trimesh installed")
    except ImportError:
        print("[INFO] trimesh not installed")
    
    try:
        import numpy as np
        print("[OK] numpy installed")
    except ImportError:
        print("[ERROR] numpy not installed")
        return False
    
    return True

def view_model(model_path):
    """查看3D模型 - 增强光照版本"""
    if not os.path.exists(model_path):
        print("Error: File not found -", model_path)
        return False
    
    try:
        import open3d as o3d
        import numpy as np
        
        file_ext = os.path.splitext(model_path)[1].lower()
        print("Loading file:", model_path, "Format:", file_ext)
        
        mesh = None
        
        if file_ext == '.glb':
            # 优先使用trimesh处理GLB
            try:
                import trimesh
                tri_mesh = trimesh.load(model_path)
                
                if isinstance(tri_mesh, trimesh.Scene) and tri_mesh.geometry:
                    tri_mesh = list(tri_mesh.geometry.values())[0]
                
                vertices = tri_mesh.vertices
                faces = tri_mesh.faces
                
                mesh = o3d.geometry.TriangleMesh()
                mesh.vertices = o3d.utility.Vector3dVector(vertices)
                mesh.triangles = o3d.utility.Vector3iVector(faces)
                
                # 颜色处理保持不变
                if hasattr(tri_mesh.visual, 'vertex_colors') and tri_mesh.visual.vertex_colors is not None:
                    vertex_colors = tri_mesh.visual.vertex_colors
                    
                    if vertex_colors.max() > 1.0:
                        vertex_colors = vertex_colors.astype(np.float32) / 255.0
                    
                    if vertex_colors.shape[1] >= 3:
                        mesh.vertex_colors = o3d.utility.Vector3dVector(vertex_colors[:, :3])
                
                print("[OK] GLB loaded")
                
            except Exception as e:
                print("trimesh failed, using direct open3d:", str(e))
                mesh = o3d.io.read_triangle_mesh(model_path)
        else:
            mesh = o3d.io.read_triangle_mesh(model_path)
        
        if not mesh or not mesh.has_vertices():
            print("Error: No valid mesh data")
            return False
        
        # 准备显示
        mesh.compute_vertex_normals()
        if not mesh.has_vertex_colors():
            mesh.paint_uniform_color([0.8, 0.8, 0.8])  # 使用更亮的灰色
        
        print("Vertices:", len(mesh.vertices), "Triangles:", len(mesh.triangles))
        print("Opening 3D viewer with enhanced lighting...")
        
        # 方法1：使用自定义可视化选项增强光照
        vis = o3d.visualization.Visualizer()
        vis.create_window(
            window_name="道路裂缝3D模型 - 增强光照",
            width=1024,
            height=768
        )
        
        # 添加网格
        vis.add_geometry(mesh)
        
        # 获取渲染选项
        render_option = vis.get_render_option()
        
        # 增强光照设置
        render_option.background_color = np.array([0.9, 0.9, 0.9])  # 更亮的背景
        render_option.light_on = True
        
        # 启用光照计算
        render_option.mesh_show_back_face = False
        
        # 设置点光源
        render_option.point_size = 3.0
        
        # 设置光照强度
        # Open3D 0.19.0+ 版本可能需要使用以下方式
        try:
            # 设置环境光强度
            render_option.ambient_light = np.array([0.7, 0.7, 0.7])  # 增强环境光
            
            # 设置漫反射强度
            render_option.diffuse_reflection = 0.9
            
            # 设置镜面反射
            render_option.specular_reflection = 0.3
            
            # 设置光照颜色
            render_option.light_color = np.array([1.0, 1.0, 1.0])  # 白色光
            
        except AttributeError:
            print("Note: Some lighting options not available in this Open3D version")
        
        # 设置相机视角
        ctr = vis.get_view_control()
        
        # 方法2：使用draw_geometries_with_custom_animation
        print("Starting visualization...")
        
        # 运行可视化
        vis.run()
        vis.destroy_window()
        
        print("[OK] 3D viewer closed")
        return True
        
    except Exception as e:
        print("Error loading model:", str(e))
        return False

if __name__ == "__main__":
    # setup_encoding()
    
    if not check_dependencies():
        sys.exit(1)
    
    if len(sys.argv) != 2:
        print("Usage: python model_viewer.py <model_path>")
        sys.exit(1)
    
    model_path = sys.argv[1]
    
    # 验证文件存在
    if not os.path.exists(model_path):
        print("Error: File does not exist -", model_path)
        sys.exit(1)
    
    success = view_model(model_path)
    sys.exit(0 if success else 1)
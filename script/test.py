import open3d as o3d


path_obj = './crack_model.glb'
#读入网格模型
mesh = o3d.io.read_triangle_mesh(path_obj)
#计算网格顶点
mesh.compute_vertex_normals()
#可视化网格模型
o3d.visualization.draw_geometries([mesh])

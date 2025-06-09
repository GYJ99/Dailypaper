# 日报服务页面 (Vue版本)

这是一个用于生成日报的服务页面，方便用户填写和管理工作日报。本版本使用Vue.js实现，可以部署在静态网站托管服务上（如Cloudflare Pages）。

## 项目结构

- `index.html`: 主页面文件
- `js/`: JavaScript文件目录
  - `app.js`: 主要应用逻辑
  - `file-server.js`: 文件持久化服务
- `css/`: 样式文件目录
- `data/`: 数据文件目录
  - `initial_data.json`: 初始示例数据
  - `work_data.json`: 工作数据持久化文件
  - `settings.json`: 默认时间设置持久化文件
- `_headers`: Cloudflare Pages的HTTP头配置
- `_redirects`: Cloudflare Pages的重定向配置

## 功能特点

- 日历视图显示工作日
- Markdown编辑器编写日报
- 工作时间记录和统计
- 智能数据持久化存储
  - 主要使用浏览器localStorage缓存
  - 本地环境支持文件系统持久化存储
  - 静态托管环境提供数据下载备份选项
- 数据导入/导出功能

## 部署说明

### 静态托管环境（如Cloudflare Pages）

本应用使用智能持久化策略确保数据安全。为确保在Cloudflare Pages等静态托管服务上正常工作，已进行以下优化：

1. **数据持久化**：实现了智能持久化存储策略
   - 主要使用浏览器localStorage进行数据存储
   - 自动检测运行环境，在静态托管环境中禁用文件系统直接写入
   - 提供数据下载备份选项，确保用户可以手动备份数据
2. **环境自适应**：自动检测是否在Cloudflare Pages等静态托管环境中运行
   - 在本地环境中可以使用File System Access API直接操作文件
   - 在静态托管环境中回退到localStorage存储 + 手动下载备份模式
3. **缓存控制**：通过`_headers`文件设置了适当的缓存控制头
   - HTML和JSON文件设置为不缓存，确保内容始终最新
   - JS、CSS和字体文件设置为长期缓存，提高加载性能

### 部署步骤

1. 将整个`Vue`目录上传到Cloudflare Pages或其他静态网站托管服务
2. 确保包含`_headers`和`_redirects`文件，这些是Cloudflare Pages的特殊配置文件
3. 设置构建命令为空（本项目不需要构建）
4. 设置输出目录为`/`（根目录）

## 使用说明

1. 打开应用后，可以在日历上点击日期来选择工作日
2. 设置上下班时间并点击"保存默认时间"按钮保存设置
3. 在编辑器中编写日报内容
4. 数据会自动保存在浏览器的localStorage中
   - 在本地环境中，如果浏览器支持，还会保存到文件系统中
   - 在静态托管环境中，会提示是否需要下载数据备份
5. 可以使用导出功能随时备份数据，或使用导入功能恢复数据

## 数据存储

应用采用智能数据存储策略：

1. **浏览器localStorage**：主要存储方式，键名为`file_data_./data/work_data.json`和`file_data_./data/settings.json`
2. **环境感知存储**：
   - **本地环境**：如果浏览器支持File System Access API，会使用文件系统存储
   - **静态托管环境**（如Cloudflare Pages）：使用localStorage + 可选的文件下载备份
3. **数据导入/导出**：随时可以使用导入/导出功能进行数据备份和恢复

## 注意事项

- 在静态托管环境（如Cloudflare Pages）中，无法直接写入服务器文件系统
- 数据主要存储在浏览器的localStorage中，建议定期使用导出功能备份数据
- 清除浏览器缓存会导致localStorage中的数据丢失，请提前备份
- 在本地环境中使用File System Access API时，首次会请求用户授权
- 不同浏览器或设备之间的数据不会自动同步，需要手动导出/导入

# 日报服务页面 (Vue版本)

这是一个用于生成日报的服务页面，方便用户填写和管理工作日报。本版本使用Vue.js实现，可以部署在静态网站托管服务上（如Cloudflare Pages）。

## 项目结构

- `index.html`: 主页面文件
- `js/app.js`: 主要应用逻辑
- `css/`: 样式文件目录
- `data/`: 数据文件目录
  - `initial_data.json`: 初始示例数据
- `_headers`: Cloudflare Pages的HTTP头配置
- `_redirects`: Cloudflare Pages的重定向配置

## 功能特点

- 日历视图显示工作日
- Markdown编辑器编写日报
- 工作时间记录和统计
- 数据本地存储（localStorage）
- 数据导入/导出功能

## 部署说明

### Cloudflare Pages部署注意事项

本应用使用浏览器的localStorage进行数据存储。为确保在Cloudflare Pages等静态托管服务上正常工作，已进行以下优化：

1. **数据持久化**：修改了数据加载逻辑，确保页面刷新后不会重置为初始数据
2. **缓存控制**：通过`_headers`文件设置了适当的缓存控制头
   - HTML和JSON文件设置为不缓存，确保内容始终最新
   - JS、CSS和字体文件设置为长期缓存，提高加载性能

### 部署步骤

1. 将整个`Vue`目录上传到Cloudflare Pages或其他静态网站托管服务
2. 确保包含`_headers`和`_redirects`文件，这些是Cloudflare Pages的特殊配置文件
3. 设置构建命令为空（本项目不需要构建）
4. 设置输出目录为`/`（根目录）

## 使用说明

1. 打开应用后，可以在日历上点击日期来选择工作日
2. 设置上下班时间
3. 在编辑器中编写日报内容
4. 数据会自动保存在浏览器的localStorage中
5. 可以使用导出功能备份数据，或使用导入功能恢复数据

## 数据存储

应用数据存储在浏览器的localStorage中，键名为`workReportData`。如需清除数据，可以清除浏览器的localStorage。

## 注意事项

- 由于使用localStorage存储，数据仅保存在当前浏览器中，不同浏览器或设备之间不会同步
- 建议定期使用导出功能备份数据
- 清除浏览器缓存可能会导致数据丢失，请提前备份

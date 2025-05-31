# 日报服务页面

这是一个用于生成日报的服务页面，方便用户填写和管理工作日报。

## 项目结构

- `main.py`: 项目主文件，包含后端逻辑和路由。
- `requirements.txt`: 项目依赖库列表。
- `templates/`: 存放HTML模板文件。
  - `index.html`: 日报填写页面。
- `static/`: 存放静态资源文件（CSS, JS, 图片等）。
  - `css/`: 样式文件。
  - `js/`: JavaScript文件。
  - `webfonts/`: 字体文件。
- `data/`: 存放数据文件。
  - `work_data.json`: 存储日报数据。

## 安装与运行

1. **克隆仓库**

   ```bash
   git clone <仓库地址>
   cd 写日报服务页面
   ```

2. **创建虚拟环境并激活**

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **安装依赖**

   ```bash
   pip install -r requirements.txt
   ```

4. **运行应用**

   ```bash
   python3 main.py
   ```

   应用将在本地启动，通常在 `http://127.0.0.1:5000/`。

## 使用说明

打开浏览器访问 `http://127.0.0.1:5000/`，即可看到日报填写页面。根据页面提示填写日报内容并提交。

## 数据存储

日报数据将存储在 `data/work_data.json` 文件中。

## 贡献

欢迎提交Issue和Pull Request。
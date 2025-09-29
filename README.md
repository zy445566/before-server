# Before-server@2 - HTTP代理调试工具

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![Next.js](https://img.shields.io/badge/Next.js-14.x-blue)
![Docker](https://img.shields.io/badge/Docker-支持-success)
![License](https://img.shields.io/badge/License-MIT-blue)

一个基于Next.js的现代化HTTP代理调试工具，提供请求拦截、日志记录和实时监控功能，助力开发调试效率提升。

2.0版本全面拥抱Ai编码。

1.0版本看这里：https://github.com/zy445566/before-server/blob/v1.0/README.md


## ✨ 核心功能

- **多代理管理** - 同时运行多个代理服务
- **实时日志** - 即时查看请求/响应数据
- **高级过滤** - 按时间/状态码/方法筛选
- **Docker支持** - 一键容器化部署

## 🚀 快速开始

### 开发模式
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 生产环境
```bash
npm run build && npm start
```

## 🐳 Docker部署

```bash
# 构建镜像
docker build -t before-server .

# 运行容器 (映射管理界面+代理端口范围)
docker run -d \
  -p 3000:3000 \
  -p 30000-30100:30000-30100 \
  --name before-server \
  before-server
```

## 🏗️ 项目结构

```text
.
├── lib/              # 核心代理逻辑
│   └── proxyManager.ts  # 代理管理器
├── pages/            # Next.js页面
│   ├── api/          # API路由
│   └── logs/         # 日志查看
├── components/       # UI组件
│   ├── ProxyForm.tsx # 代理配置表单
│   └── LogViewer.tsx # 日志查看器
└── public/           # 静态资源
```

## 💻 开发指南

### 技术栈
- **前端**: Next.js 14 + TypeScript
- **后端**: Node.js原生HTTP模块
- **工具链**: 
  - Docker容器化
  - ESLint + Prettier代码规范
  - Jest单元测试

### 贡献流程
1. Fork项目
2. 创建特性分支 (`git checkout -b feature/xxx`)
3. 提交变更 (`git commit -am 'Add some feature'`)
4. 推送分支 (`git push origin feature/xxx`)
5. 创建Pull Request

## 📜 许可证
MIT License © 2025 zy445566
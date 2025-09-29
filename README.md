# Before-server@2

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![Next.js](https://img.shields.io/badge/Next.js-14.x-blue)
![Docker](https://img.shields.io/badge/Docker-支持-success)

一个基于Next.js的前置HTTP代理抓包服务和日志记录，方便用于开发调试。2.0版本全面拥抱Ai编码。

1.0版本看这里：https://github.com/zy445566/before-server/blob/v1.0/README.md

## 功能特性

✅ 多代理服务管理
✅ 实时日志查看  
✅ Docker容器化支持  
✅ 按时间过滤日志  

## 快速开始

### 本地开发

1. 安装依赖：
```bash
npm install
```

2. 启动开发服务器：
```bash
npm run dev
```

3. 访问应用：
```
http://localhost:3000
```

### 生产环境

1. 构建应用：
```bash
npm run build
```

2. 启动服务：
```bash
npm start
```

## Docker支持

### 构建镜像
```bash
docker build -t proxy-capture .
```

### 运行容器
```bash
docker run -d \
  -p 3000:3000 \
  -p 30000-30100:30000-30100 \
  --name proxy-capture \
  proxy-capture
```

## 开发指南

### 项目结构
```
.
├── lib/              # 核心代理逻辑
│   └── proxyManager.ts
├── pages/            # Next.js页面
│   └── api/          # API路由
├── components/       # React组件
├── styles/           # 全局样式
└── public/           # 静态资源
```

### 技术栈
- 前端: Next.js 14, React 18, TypeScript
- 后端: Node.js HTTP/TLS模块
- 工具: Docker, ESLint, Prettier

## 许可证
MIT License
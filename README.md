# Before-server@2 - TCP代理调试工具

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![Next.js](https://img.shields.io/badge/Next.js-14.x-blue)
![Docker](https://img.shields.io/badge/Docker-支持-success)
![License](https://img.shields.io/badge/License-MIT-blue)

一个基于Next.js的现代化TCP代理(支持HTTP/FTP/DNS/SMTP/WebSocket/SSE)调试工具，提供请求拦截、日志记录和实时监控功能，助力开发调试效率提升。

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
  -v $(pwd)/proxies.config.json:/app/proxies.config.json:ro \
  -e PROXY_CONFIG_PATH=proxies.config.json \
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

## ⚙️ 启动时根据配置文件创建代理

应用启动时会尝试读取配置文件并自动创建代理，默认路径为项目根目录 `proxies.config.json`。也可通过环境变量 `PROXY_CONFIG_PATH` 指定其他路径。

1) 参考配置：
```json
{
  "proxies": [
    { "targetUrl": "http://example.com:80", "port": 10000 },
    { "targetUrl": "https://api.example.com", "port": 10001 }
  ]
}
```

说明：
- `targetUrl` 必填，示例：`http://host:80` 或 `https://host`（未指定端口时，https 默认 443，http 默认 80）。
- `port` 可选；不填则随机分配空闲端口。
- 若某条配置解析失败，会记录错误但不会影响其他条目及整体启动。

在 Docker 中使用配置文件示例：
```bash
docker run -d \
  -p 3000:3000 \
  -p 30000-30100:30000-30100 \
  -v $(pwd)/proxies.config.json:/app/proxies.config.json:ro \
  -e PROXY_CONFIG_PATH=proxies.config.json \
  --name before-server \
  before-server
```

提示：
- 首次访问页面时，前端会调用 `/api/proxies/list`，从而触发服务端模块加载并初始化配置中的代理。
- 可通过 API 继续创建/关闭代理；配置仅在启动阶段读取一次。

## 📜 许可证
MIT License © 2025 zy445566
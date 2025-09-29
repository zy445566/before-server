# 第一阶段：构建应用
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制依赖文件
COPY package*.json ./
COPY tsconfig.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 第二阶段：运行应用
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 从构建阶段复制构建结果和运行时依赖
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/lib ./lib

# 暴露端口 (Next.js默认3000 + 代理服务端口范围)
EXPOSE 3000
EXPOSE 3000-20000

# 启动命令
CMD ["npm", "start"]
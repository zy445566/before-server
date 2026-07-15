import * as net from 'node:net';
import * as tls from 'node:tls';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

const logStream: {
  broadcastLog(log: {
    proxyId: string;
    connectionId: string;
    createdAt: Date;
    timestamp: Date;
    direction: 'clientToServer' | 'serverToClient';
    data: string;
    truncated: boolean;
  }): void;
  closeProxy(proxyId: string): void;
  hasSubscribers(proxyId: string, connectionId: string): boolean;
  registerProxy(proxyId: string): void;
} = require('./logStream');

// 定义代理信息接口
interface ProxyInfo {
  id: string;
  targetUrl: string;
  port: number;
  createdAt: Date;
  server: net.Server;
}

// 定义代理信息返回接口（不包含server对象）
interface ProxyInfoResponse {
  id: string;
  targetUrl: string;
  port: number;
  createdAt: Date;
}

interface CreateProxyOptions {
  targetUrl: string;
  port?: number;
}

type ProxySocket = net.Socket | tls.TLSSocket;

// 定义操作结果接口
interface OperationResult {
  success: boolean;
  message: string;
}

class ProxyManager {
  private static readonly MAX_LOG_BYTES = 256 * 1024;
  private proxies: Map<string, ProxyInfo>;

  constructor() {
    this.proxies = new Map<string, ProxyInfo>(); // 存储所有代理服务

    // 在启动时尝试根据配置文件创建代理
    // 支持环境变量 PROXY_CONFIG_PATH 指定路径，否则默认使用项目根目录下的 proxies.config.json
    try {
      const configPathEnv = process.env.PROXY_CONFIG_PATH;
      const defaultPath = path.resolve(process.cwd(), 'proxies.config.json');
      const configPath = configPathEnv ? path.resolve(process.cwd(), configPathEnv) : defaultPath;

      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);

        // 支持格式：
        // { "proxies": [ { "targetUrl": "...", "port": 1234 }, ... ] }
        const list = Array.isArray(parsed?.proxies) ? parsed.proxies : [];

        if (Array.isArray(list)) {
          for (const item of list) {
            if (!item || typeof item.targetUrl !== 'string') continue;
            const url = item.targetUrl;
            const port = typeof item.port === 'number' ? item.port : undefined;
            try {
              void this.createProxy(url, port).catch((error) => {
                console.error('根据配置创建代理失败:', error);
              });
            } catch (e) {
              console.error('根据配置创建代理失败:', e);
            }
          }
        }
      }
    } catch (e) {
      // 读取配置失败不影响服务启动
      console.warn('启动时读取代理配置失败（已忽略）：', (e as Error)?.message || e);
    }
  }

  // 创建新的代理服务
  createProxy(targetUrl: string, port?: number): Promise<ProxyInfoResponse>;
  createProxy(options: CreateProxyOptions): Promise<ProxyInfoResponse>;
  async createProxy(targetUrlOrOptions: string | CreateProxyOptions, port?: number): Promise<ProxyInfoResponse> {
    let targetUrl: string;
    let portNumber: number | undefined;
    
    if (typeof targetUrlOrOptions === 'string') {
      targetUrl = targetUrlOrOptions;
      portNumber = port;
    } else {
      targetUrl = targetUrlOrOptions.targetUrl;
      portNumber = targetUrlOrOptions.port;
    }
    try {
      const proxyId = uuidv4();
      const targetObj = new URL(targetUrl);
      portNumber = portNumber || undefined; // Ensure it's either number or undefined
      if (!['http:', 'https:'].includes(targetObj.protocol)) {
        throw new Error('目标URL仅支持 http 或 https 协议');
      }
      const clientOpts = {
        host: targetObj.hostname, 
        port: parseInt(targetObj.port) || (targetObj.protocol === 'https:' ? 443 : 80) 
      };

      const proxy = net.createServer((socket: net.Socket) => {
        const connectionId = uuidv4();
        const createdAt = new Date();
        
        const client: ProxySocket = targetObj.protocol === 'https:'
          ? tls.connect({ ...clientOpts, servername: targetObj.hostname })
          : net.createConnection(clientOpts);
        
        socket.on('data', (data: Buffer) => {
          if (logStream.hasSubscribers(proxyId, connectionId)) {
            logStream.broadcastLog({
              proxyId,
              connectionId,
              createdAt,
              timestamp: new Date(),
              direction: 'clientToServer',
              data: data.subarray(0, ProxyManager.MAX_LOG_BYTES).toString(),
              truncated: data.length > ProxyManager.MAX_LOG_BYTES,
            });
          }
          client.write(data);
        });
        
        client.on('data', (data: Buffer) => {
          if (logStream.hasSubscribers(proxyId, connectionId)) {
            logStream.broadcastLog({
              proxyId,
              connectionId,
              createdAt,
              timestamp: new Date(),
              direction: 'serverToClient',
              data: data.subarray(0, ProxyManager.MAX_LOG_BYTES).toString(),
              truncated: data.length > ProxyManager.MAX_LOG_BYTES,
            });
          }
          socket.write(data);
        });

        socket.on('error', (err: Error) => {
          console.error(`Socket error: ${err.message}`);
        });

        client.on('error', (err: Error) => {
          console.error(`Client error: ${err.message}`);
        });

        socket.on('close', () => {
          client.end();
        });

        client.on('close', () => {
          socket.end();
        });
      });

      await new Promise<void>((resolve, reject) => {
        const onError = (error: Error) => {
          proxy.off('listening', onListening);
          reject(error);
        };
        const onListening = () => {
          proxy.off('error', onError);
          resolve();
        };
        proxy.once('error', onError);
        proxy.once('listening', onListening);
        proxy.listen(portNumber || 0);
      });
      proxy.on('error', (error) => console.error(`代理服务器错误: ${error.message}`));

      const address = proxy.address();
      if (!address || typeof address === 'string') throw new Error('无法获取代理服务器地址');
      const proxyInfo: ProxyInfo = { id: proxyId, targetUrl, port: address.port, createdAt: new Date(), server: proxy };
      this.proxies.set(proxyId, proxyInfo);
      logStream.registerProxy(proxyId);
      return { id: proxyInfo.id, targetUrl: proxyInfo.targetUrl, port: proxyInfo.port, createdAt: proxyInfo.createdAt };
    } catch (error) {
      console.error('创建代理服务失败:', error);
      throw error;
    }
  }

  // 获取所有代理服务
  getAllProxies(): ProxyInfoResponse[] {
    const result: ProxyInfoResponse[] = [];
    for (const [id, proxy] of this.proxies.entries()) {
      result.push({
        id: proxy.id,
        targetUrl: proxy.targetUrl,
        port: proxy.port,
        createdAt: proxy.createdAt
      });
    }
    return result;
  }

  // 关闭特定代理服务
  closeProxy(proxyId: string): OperationResult {
    if (!this.proxies.has(proxyId)) {
      throw new Error('代理服务不存在');
    }

    const proxy = this.proxies.get(proxyId);
    if (proxy) {
      proxy.server.close();
      this.proxies.delete(proxyId);
      logStream.closeProxy(proxyId);
    }
    
    return { success: true, message: '代理服务已关闭' };
  }

  // 关闭所有代理服务
  closeAllProxies(): OperationResult {
    for (const [id, proxy] of this.proxies.entries()) {
      proxy.server.close();
      logStream.closeProxy(id);
    }
    
    this.proxies.clear();
    
    return { success: true, message: '所有代理服务已关闭' };
  }
}

// 创建单例实例
declare global {
  // eslint-disable-next-line no-var
  var __proxyManager__: ProxyManager | undefined;
}

// 使用全局变量在开发模式下持久化单例，避免 Next.js HMR 造成重复实例
const proxyManager = globalThis.__proxyManager__ ?? (globalThis.__proxyManager__ = new ProxyManager());

export default proxyManager;

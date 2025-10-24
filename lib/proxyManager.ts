import * as net from 'node:net';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

// 定义日志数据接口
interface LogData {
  timestamp: Date;
  data: string;
}

// 定义连接日志接口
interface ConnectionLog {
  id: string;
  clientToServer: LogData[];
  serverToClient: LogData[];
  createdAt: Date;
}

// 定义代理信息接口
interface ProxyInfo {
  id: string;
  targetUrl: string;
  port: number;
  createdAt: Date;
  server: net.Server;
  watchTime: number;
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

// 定义连接日志返回接口
interface ConnectionLogResponse {
  connectionId: string;
  createdAt: Date;
  clientToServer: LogData[];
  serverToClient: LogData[];
}

// 定义操作结果接口
interface OperationResult {
  success: boolean;
  message: string;
}

class ProxyManager {
  private proxies: Map<string, ProxyInfo>;
  private logs: Map<string, Map<string, ConnectionLog>>;

  constructor() {
    this.proxies = new Map<string, ProxyInfo>(); // 存储所有代理服务
    this.logs = new Map<string, Map<string, ConnectionLog>>(); // 存储所有代理日志

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
              this.createProxy(url, port);
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
  createProxy(targetUrl: string, port?: number): ProxyInfoResponse;
  createProxy(options: CreateProxyOptions): ProxyInfoResponse;
  createProxy(targetUrlOrOptions: string | CreateProxyOptions, port?: number): ProxyInfoResponse {
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
      const clientOpts = { 
        host: targetObj.hostname, 
        port: parseInt(targetObj.port) || (targetObj.protocol === 'https:' ? 443 : 80) 
      };

      const connectionLogs = new Map<string, ConnectionLog>(); // 存储每个连接的日志
      
      const proxy = net.createServer((socket: net.Socket) => {
        const watchTime = this.proxies.get(proxyId)?.watchTime || 0;
        let isWatching = false;
        // 如果watchTime大于当前时间-30s，则认为是正在观看的连接，否则认为不需要记录日志，同时清空日志
        if(watchTime>Date.now()-30*1000) {
          isWatching = true;
        } else {
          // 注意只有新的请求进来后才会清空，否则将继续保留
          connectionLogs.clear();
        }
        const connectionId = uuidv4();
        if(isWatching) {
          connectionLogs.set(connectionId, {
            id: connectionId,
            clientToServer: [],
            serverToClient: [],
            createdAt: new Date()
          });
        }
        
        const client = net.createConnection(clientOpts);
        
        socket.on('data', (data: Buffer) => {
          if(isWatching) {
            const dataStr = data.toString();
            const logs = connectionLogs.get(connectionId);
            if (logs) {
              logs.clientToServer.push({
                timestamp: new Date(),
                data: dataStr
              });
            }
          }
          client.write(data);
        });
        
        client.on('data', (data: Buffer) => {
          if(isWatching) {
            const dataStr = data.toString();
            const logs = connectionLogs.get(connectionId);
            if (logs) {
              logs.serverToClient.push({
                timestamp: new Date(),
                data: dataStr
              });
            }
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

      proxy.listen(portNumber || 0); // 使用指定端口或随机分配
      
      const address = proxy.address();
      if (!address || typeof address === 'string') {
        throw new Error('无法获取代理服务器地址');
      }
      
      const proxyInfo: ProxyInfo = {
        id: proxyId,
        targetUrl,
        port: address.port,
        createdAt: new Date(),
        watchTime: 0,
        server: proxy
      };
      
      this.proxies.set(proxyId, proxyInfo);
      this.logs.set(proxyId, connectionLogs);
      
      // 返回不包含server对象的信息
      return {
        id: proxyInfo.id,
        targetUrl: proxyInfo.targetUrl,
        port: proxyInfo.port,
        createdAt: proxyInfo.createdAt
      };
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

  // 设置代理服务的watchTime
  setWatchTime(proxyId: string) {
    const proxy = this.proxies.get(proxyId);
    if(proxy) {
      proxy.watchTime = Date.now();
    }
  }

  // 获取特定代理的日志
  getProxyLogs(proxyId: string): ConnectionLogResponse[] {
    if (!this.proxies.has(proxyId)) {
      throw new Error('代理服务不存在');
    }
    this.setWatchTime(proxyId)

    const connectionLogs = this.logs.get(proxyId);
    if (!connectionLogs) {
      return [];
    }
    
    const result: ConnectionLogResponse[] = [];
    
    for (const [connectionId, log] of connectionLogs.entries()) {
      // 如果没有since参数，或者连接创建时间大于since
      result.push({
          connectionId: log.id,
          createdAt: log.createdAt,
          clientToServer: log.clientToServer,
          serverToClient: log.serverToClient
      });
    }
    
    return result;
  }

  // 获取特定代理的日志
  getProxyConnLogs(proxyId: string, connectionId: string): ConnectionLogResponse | null {
    if (!this.proxies.has(proxyId)) {
      throw new Error('代理服务不存在');
    }
    this.setWatchTime(proxyId)

    const connectionLogs = this.logs.get(proxyId);
    if (!connectionLogs) {
      return null;
    }

    const log = connectionLogs.get(connectionId);

    if (!log) {
      return null;
    }
    
    return {
          connectionId: log.id,
          createdAt: log.createdAt,
          clientToServer: log.clientToServer,
          serverToClient: log.serverToClient
      };
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
    }
    
    return { success: true, message: '代理服务已关闭' };
  }

  // 关闭所有代理服务
  closeAllProxies(): OperationResult {
    for (const [id, proxy] of this.proxies.entries()) {
      proxy.server.close();
    }
    
    this.proxies.clear();
    this.logs.clear();
    
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
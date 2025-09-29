import * as net from 'node:net';
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
        const connectionId = uuidv4();
        connectionLogs.set(connectionId, {
          id: connectionId,
          clientToServer: [],
          serverToClient: [],
          createdAt: new Date()
        });

        const client = net.createConnection(clientOpts);
        
        socket.on('data', (data: Buffer) => {
          const dataStr = data.toString();
          const logs = connectionLogs.get(connectionId);
          if (logs) {
            logs.clientToServer.push({
              timestamp: new Date(),
              data: dataStr
            });
          }
          client.write(data);
        });
        
        client.on('data', (data: Buffer) => {
          const dataStr = data.toString();
          const logs = connectionLogs.get(connectionId);
          if (logs) {
            logs.serverToClient.push({
              timestamp: new Date(),
              data: dataStr
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

  // 获取特定代理的日志
  getProxyLogs(proxyId: string, since?: Date | null): ConnectionLogResponse[] {
    if (!this.proxies.has(proxyId)) {
      throw new Error('代理服务不存在');
    }

    const connectionLogs = this.logs.get(proxyId);
    if (!connectionLogs) {
      return [];
    }
    
    const result: ConnectionLogResponse[] = [];
    
    for (const [connectionId, log] of connectionLogs.entries()) {
      // 如果没有since参数，或者连接创建时间大于since
      if (!since || new Date(log.createdAt) > since) {
        result.push({
          connectionId: log.id,
          createdAt: log.createdAt,
          clientToServer: log.clientToServer,
          serverToClient: log.serverToClient
        });
      } else {
        // 检查连接内是否有消息时间大于since
        const filteredClientToServer = log.clientToServer.filter(msg => new Date(msg.timestamp) > since);
        const filteredServerToClient = log.serverToClient.filter(msg => new Date(msg.timestamp) > since);
        
        if (filteredClientToServer.length > 0 || filteredServerToClient.length > 0) {
          result.push({
            connectionId: log.id,
            createdAt: log.createdAt,
            clientToServer: filteredClientToServer,
            serverToClient: filteredServerToClient
          });
        }
      }
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
const proxyManager = new ProxyManager();

export default proxyManager;
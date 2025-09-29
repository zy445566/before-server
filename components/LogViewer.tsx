import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LogData {
  timestamp: Date;
  data: string;
}

interface ConnectionLog {
  connectionId: string;
  createdAt: Date;
  clientToServer: LogData[];
  serverToClient: LogData[];
}

interface LogViewerProps {
  proxyId: string;
}

export default function LogViewer({ proxyId }: LogViewerProps) {
  const [logs, setLogs] = useState<ConnectionLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [proxyUrl, setProxyUrl] = useState<string>('');

  const fetchLogs = async (event?: React.MouseEvent | boolean) => {
    const incremental = typeof event === 'boolean' ? event : false;
    try {
      let url = `/api/proxies/logs/${proxyId}`;
      if (incremental && logs.length > 0) {
        const lastLogTime = new Date(logs[0].createdAt).toISOString();
        url += `?since=${encodeURIComponent(lastLogTime)}`;
      }

      const [logsResponse, proxyResponse] = await Promise.all([
        fetch(url),
        fetch(`/api/proxies/list`)
      ]);

      if (!logsResponse.ok || !proxyResponse.ok) {
        const errorMessage = logsResponse.status === 404 ? 
          '代理服务不存在或已被关闭' : '获取日志失败';
        setError(errorMessage);
        
        // 如果代理不存在，返回特殊标志
        if (logsResponse.status === 404) {
          return { shouldStopRefresh: true, isProxyGone: true };
        }
        return { shouldStopRefresh: true };
      }

      const logsData = await logsResponse.json();
      const proxiesData = await proxyResponse.json();

      const proxyInfo = proxiesData.proxies.find((p: any) => p.id === proxyId);
      if (proxyInfo) {
        setTargetUrl(proxyInfo.targetUrl);
        setProxyUrl(`${window.location.protocol}//${window.location.hostname}:${proxyInfo.port}`);
      }

      let newLogs = [...logsData.logs];
      if (incremental) {
        // 增量模式：只添加新日志，并过滤掉已存在的连接
        const existingIds = new Set(logs.map(l => l.connectionId));
        newLogs = [
          ...newLogs.filter(log => !existingIds.has(log.connectionId)),
          ...logs
        ];
      }
      
      // 限制总日志数量，防止内存泄漏
      if (newLogs.length > 200) {
        newLogs = newLogs.slice(0, 200);
      }
      
      const sortedLogs = newLogs
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(conn => ({
          ...conn,
          clientToServer: [...conn.clientToServer].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ),
          serverToClient: [...conn.serverToClient].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        }))
        .slice(0, 100); // 限制最多显示100条最新连接
      
      setLogs(sortedLogs);
      setError('');
    } catch (error) {
      console.error('获取日志失败:', error);
      setError(`获取日志失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isActive = true;
    let refreshTimer: NodeJS.Timeout | null = null;
    let isRefreshing = false;

    const stopAllRefreshes = () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
      setRefreshInterval(null);
    };

    const safeFetchLogs = async (event?: React.MouseEvent | boolean) => {
    const incremental = typeof event === 'boolean' ? event : false;
      if (!isActive || isRefreshing) return;
      
      try {
        isRefreshing = true;
        const result = await fetchLogs(incremental);
        
        if (!isActive) return;

        if (result?.isProxyGone) {
          stopAllRefreshes();
          return;
        }

        if (result?.shouldStopRefresh) {
          stopAllRefreshes();
          return;
        }

        // 只有当前没有定时器且需要刷新时才启动
        if (!refreshTimer && isActive) {
          refreshTimer = setInterval(() => safeFetchLogs(true), 5000);
          setRefreshInterval(refreshTimer);
        }
      } catch (error) {
        console.error('刷新日志失败:', error);
        stopAllRefreshes();
      } finally {
        isRefreshing = false;
      }
    };

    // 初始加载
    safeFetchLogs();

    return () => {
      isActive = false;
      stopAllRefreshes();
    };
  }, [proxyId]);

  if (isLoading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (error) {
    return (
      <div className="card">
        <div className="alert alert-error">
          <p>{error}</p>
        </div>
        <div style={{ marginTop: '16px' }}>
          {targetUrl && <p>目标URL: <a href={targetUrl} target="_blank" rel="noopener noreferrer">{targetUrl}</a></p>}
          {proxyUrl && <p>代理URL: <a href={proxyUrl} target="_blank" rel="noopener noreferrer">{proxyUrl}</a></p>}
        </div>
        <Link href="/" className="btn btn-primary" style={{ marginTop: '16px' }}>
          返回代理列表
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2>代理日志</h2>
          <p style={{ marginTop: '8px', color: 'var(--light-text)' }}>
            目标URL: <a href={targetUrl} target="_blank" rel="noopener noreferrer">{targetUrl}</a>
          </p>
          <p style={{ marginTop: '8px', color: 'var(--light-text)' }}>
            代理URL: <a href={proxyUrl} target="_blank" rel="noopener noreferrer">{proxyUrl}</a>
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => fetchLogs(true)}>刷新日志</button>
      </div>

      {logs.length === 0 ? (
        <p>暂无日志数据。可能是代理服务尚未接收到任何请求。</p>
      ) : (
        logs.map((connection) => (
          <div key={connection.connectionId} className="log-item" style={{ marginBottom: '20px' }}>
            <div className="log-header">
              <div><strong>连接ID:</strong> {connection.connectionId.substring(0, 8)}...</div>
              <div><strong>创建时间:</strong> {new Date(connection.createdAt).toLocaleString()}</div>
            </div>
            
            <div className="log-body">
              <h3>客户端 → 服务器</h3>
              {connection.clientToServer.length === 0 ? (
                <p>暂无数据</p>
              ) : (
                connection.clientToServer.map((log, index) => (
                  <div key={`client-${index}`} className="log-content">
                    <div className="log-timestamp">{new Date(log.timestamp).toLocaleString()}</div>
                    <pre className="code-block">{log.data}</pre>
                  </div>
                ))
              )}

              <h3>服务器 → 客户端</h3>
              {connection.serverToClient.length === 0 ? (
                <p>暂无数据</p>
              ) : (
                connection.serverToClient.map((log, index) => (
                  <div key={`server-${index}`} className="log-content">
                    <div className="log-timestamp">{new Date(log.timestamp).toLocaleString()}</div>
                    <pre className="code-block">{log.data}</pre>
                  </div>
                ))
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
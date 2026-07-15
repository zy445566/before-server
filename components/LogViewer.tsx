import { useEffect, useMemo, useRef, useState } from 'react';

interface LogListData {
  key: number;
  connectionId: string;
  createdAt: string;
  data: string;
  timestamp: string;
  direction: 'clientToServer' | 'serverToClient';
  truncated: boolean;
}

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface LogViewerProps {
  proxyId: string;
}

const MAX_CLIENT_LOGS = 500;

const statusLabels: Record<ConnectionStatus, string> = {
  connecting: '连接中',
  connected: '已连接',
  reconnecting: '重连中',
  disconnected: '已断开',
};

export default function LogViewer({ proxyId }: LogViewerProps) {
  const [logs, setLogs] = useState<LogListData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [hasConnectionGap, setHasConnectionGap] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const logKey = useRef(0);

  useEffect(() => {
    let active = true;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    let proxyClosed = false;

    const connect = () => {
      if (!active || proxyClosed) return;

      setStatus(reconnectAttempts === 0 ? 'connecting' : 'reconnecting');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}/ws/logs?proxyId=${encodeURIComponent(proxyId)}`);

      socket.onmessage = (event) => {
        if (!active) return;

        try {
          const message = JSON.parse(event.data);

          if (message.type === 'ready') {
            reconnectAttempts = 0;
            setStatus('connected');
            setError('');
            return;
          }

          if (message.type === 'proxy_closed') {
            proxyClosed = true;
            setStatus('disconnected');
            setError('代理服务已被关闭');
            return;
          }

          if (message.type === 'error') {
            setError(message.message || '日志连接发生错误');
            return;
          }

          if (message.type === 'gap') {
            setHasConnectionGap(true);
            return;
          }

          if (message.type === 'log') {
            const log: LogListData = {
              key: logKey.current++,
              connectionId: message.connectionId,
              createdAt: message.createdAt,
              data: message.data,
              timestamp: message.timestamp,
              direction: message.direction,
              truncated: Boolean(message.truncated),
            };

            setLogs((current) => [...current, log].slice(-MAX_CLIENT_LOGS));
          }
        } catch (parseError) {
          console.error('解析实时日志失败:', parseError);
        }
      };

      socket.onerror = () => {
        if (active && !proxyClosed) setError('实时日志连接异常，正在尝试恢复');
      };

      socket.onclose = () => {
        if (!active || proxyClosed) return;

        setHasConnectionGap(true);
        setStatus('reconnecting');
        reconnectAttempts += 1;
        const delay = Math.min(1000 * 2 ** (reconnectAttempts - 1), 30000);
        reconnectTimer = setTimeout(connect, delay);
      };
    };

    const initialize = async () => {
      try {
        const response = await fetch('/api/proxies/list');
        if (!response.ok) throw new Error('获取代理信息失败');

        const data = await response.json();
        const proxyInfo = data.proxies?.find((proxy: { id: string }) => proxy.id === proxyId);
        if (!proxyInfo) {
          setError('代理服务不存在或已被关闭');
          setStatus('disconnected');
          return;
        }

        setTargetUrl(proxyInfo.targetUrl);
        setProxyUrl(`${window.location.protocol}//${window.location.hostname}:${proxyInfo.port}`);
        connect();
      } catch (initializationError) {
        setError(initializationError instanceof Error ? initializationError.message : '初始化日志连接失败');
        setStatus('disconnected');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void initialize();

    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close(1000, 'Page closed');
    };
  }, [proxyId]);

  const connectionIds = useMemo(
    () => Array.from(new Set(logs.map((log) => log.connectionId))),
    [logs],
  );
  const visibleLogs = selectedConnectionId
    ? logs.filter((log) => log.connectionId === selectedConnectionId)
    : logs;

  if (isLoading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
        <div>
          <h2>代理实时日志</h2>
          {targetUrl && <p style={{ marginTop: 8, color: 'var(--light-text)' }}>目标URL: <a href={targetUrl} target="_blank" rel="noopener noreferrer">{targetUrl}</a></p>}
          {proxyUrl && <p style={{ marginTop: 8, color: 'var(--light-text)' }}>代理URL: <a href={proxyUrl} target="_blank" rel="noopener noreferrer">{proxyUrl}</a></p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`connection-status connection-status-${status}`}></span>
          <strong>{statusLabels[status]}</strong>
        </div>
      </div>

      {hasConnectionGap && (
        <div className="alert" style={{ marginBottom: 12 }}>
          WebSocket 曾中断，断线期间的日志没有存储，因此无法补回。
        </div>
      )}
      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="log-header" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          {selectedConnectionId ? (
            <>
              正在查看连接 <strong>{selectedConnectionId}</strong>
              <button className="btn" style={{ marginLeft: 8 }} onClick={() => setSelectedConnectionId(null)}>清除筛选</button>
            </>
          ) : (
            <span>显示全部连接，共接收 {logs.length} 条（最多保留 {MAX_CLIENT_LOGS} 条）</span>
          )}
        </div>
        <button className="btn" onClick={() => setLogs([])}>清空页面日志</button>
      </div>

      {connectionIds.length > 0 && !selectedConnectionId && (
        <div style={{ marginBottom: 16, color: 'var(--light-text)' }}>
          已发现 {connectionIds.length} 个连接，点击日志中的连接 ID 可筛选。
        </div>
      )}

      {visibleLogs.length === 0 ? (
        <p>暂无实时日志。页面只显示打开后收到的数据。</p>
      ) : (
        visibleLogs.map((log) => (
          <div key={log.key} className="log-item" style={{ marginBottom: 20 }}>
            <div className="log-header">
              <div>
                <strong>连接ID:</strong>{' '}
                <button className="connection-link" onClick={() => setSelectedConnectionId(log.connectionId)}>
                  {log.connectionId.substring(0, 8)}...
                </button>
              </div>
              <div><strong>创建时间:</strong> {new Date(log.createdAt).toLocaleString()}</div>
            </div>
            <div className="log-body">
              <h3>{log.direction === 'clientToServer' ? '客户端 → 服务器' : '服务器 → 客户端'}</h3>
              <div className="log-content">
                <div className="log-timestamp">{new Date(log.timestamp).toLocaleString()}</div>
                {log.truncated && <div className="alert" style={{ marginBottom: 8 }}>该数据块超过 256 KiB，日志内容已截断。</div>}
                <pre className="code-block">{log.data}</pre>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

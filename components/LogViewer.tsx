import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

interface LogListData  {
  connectionId:string,
  createdAt:string,
  data:string,
  timestamp:string,
  direction:'clientToServer'|'serverToClient'
}


interface LogViewerProps {
  proxyId: string;
  connectionId?: string;
}

export default function LogViewer({ proxyId, connectionId }: LogViewerProps) {
  const [logs, setLogs] = useState<LogListData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [proxyUrl, setProxyUrl] = useState<string>('');
  // 分页状态
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  // 自动刷新定时停止状态
  const [showAutoRefreshWarning, setShowAutoRefreshWarning] = useState<boolean>(false);

  const fetchLogs = async () => {
    try {
      let url = connectionId? `/api/proxies/logs/${proxyId}/connection/${connectionId}`:`/api/proxies/logs/${proxyId}`;
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      url += `?${params.toString()}`;

      const [logsResponse, proxyResponse] = await Promise.all([
        fetch(url),
        fetch(`/api/proxies/list`)
      ]);

      if (!logsResponse.ok || !proxyResponse.ok) {
        const errorMessage = logsResponse.status === 404 ? 
          '代理服务不存在或已被关闭' : '获取日志失败';
        setError(errorMessage);
        
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

      if (typeof logsData.total === 'number') setTotal(logsData.total);

      let newLogs: LogListData[] = [...logsData.logs];

      setLogs(newLogs);
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
    let autoStopTimer: NodeJS.Timeout | null = null;
    let isRefreshing = false;

    const stopAllRefreshes = () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
      if (autoStopTimer) {
        clearTimeout(autoStopTimer);
        autoStopTimer = null;
      }
    };

    const safeFetchLogs = async () => {
      if (!isActive || isRefreshing) return;
      if (!autoRefreshEnabled) { // 当关闭自动刷新时，立即停止定时器并退出
        stopAllRefreshes();
        return;
      }
      
      try {
        isRefreshing = true;
        const result = await fetchLogs();
        
        if (!isActive) return;

        if (result?.isProxyGone) {
          stopAllRefreshes();
          return;
        }

        if (result?.shouldStopRefresh) {
          stopAllRefreshes();
          return;
        }

        if (!refreshTimer && isActive && autoRefreshEnabled) {
          refreshTimer = setInterval(() => safeFetchLogs(), 5000);
          
          // 启动15分钟自动停止定时器
          if (!autoStopTimer) {
            autoStopTimer = setTimeout(() => {
              if (isActive && autoRefreshEnabled) {
                setShowAutoRefreshWarning(true);
                setAutoRefreshEnabled(false);
                stopAllRefreshes();
              }
            }, 15* 60 * 1000); // 15分钟
          }
        }
      } catch (error) {
        console.error('刷新日志失败:', error);
        stopAllRefreshes();
      } finally {
        isRefreshing = false;
      }
    };

    safeFetchLogs();

    return () => {
      isActive = false;
      stopAllRefreshes();
    };
  }, [proxyId, page, pageSize, autoRefreshEnabled]);

  const handleContinueAutoRefresh = () => {
    setShowAutoRefreshWarning(false);
    // 重新启动自动刷新
    setAutoRefreshEnabled(true);
    // 重新启动15分钟定时器
    setAutoRefreshEnabled(true);
  };

  const handleStopAutoRefresh = () => {
    setShowAutoRefreshWarning(false);
  };

  const [showStopConfirm, setShowStopConfirm] = useState<boolean>(false);

  const handleStopAutoRefreshClick = () => {
    setShowStopConfirm(true);
  };

  const handleConfirmStop = () => {
    setShowStopConfirm(false);
    setAutoRefreshEnabled(false);
  };

  const handleCancelStop = () => {
    setShowStopConfirm(false);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
        {connectionId ? <Link href={`/logs/${Array.isArray(proxyId) ? proxyId[0] : proxyId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          &larr; 返回代理日志
        </Link>:<Link href="/" className="btn btn-primary" style={{ marginTop: '16px' }}>
          返回代理列表
        </Link>}
        
      </div>
    );
  }

  return (
    <>
      {/* 自动刷新警告弹窗 */}
      {showAutoRefreshWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--warning-color)' }}>服务性能提示</h3>
            <p style={{ marginBottom: '24px', lineHeight: '1.5' }}>
              为了服务的性能，我们将停止自动刷新并在30秒内清空记录日志，如需保留请点击继续自动刷新
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleContinueAutoRefresh}
              >
                继续自动刷新
              </button>
              <button 
                className="btn" 
                onClick={handleStopAutoRefresh}
              >
                停止自动刷新
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 停止自动刷新确认弹窗 */}
      {showStopConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--warning-color)' }}>确认停止自动刷新</h3>
            <p style={{ marginBottom: '24px', lineHeight: '1.5' }}>
              如果停止自动刷新，则服务端将在30秒内停止监控并清空日志
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn" 
                onClick={handleCancelStop}
              >
                取消
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleConfirmStop}
              >
                确认停止
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          {connectionId?<h2>连接ID详情</h2>:<h2>代理日志</h2>}
          {connectionId && <p style={{ marginTop: 8, color: 'var(--light-text)' }}>连接ID: <strong>{connectionId}</strong></p>}
          <p style={{ marginTop: '8px', color: 'var(--light-text)' }}>
            目标URL: <a href={targetUrl} target="_blank" rel="noopener noreferrer">{targetUrl}</a>
          </p>
          <p style={{ marginTop: '8px', color: 'var(--light-text)' }}>
            代理URL: <a href={proxyUrl} target="_blank" rel="noopener noreferrer">{proxyUrl}</a>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => fetchLogs()}>刷新日志</button>
          <button className="btn" onClick={autoRefreshEnabled ? handleStopAutoRefreshClick : () => setAutoRefreshEnabled(true)}>
            {autoRefreshEnabled ? '停止自动刷新' : '开启自动刷新'}
          </button>
        </div>
      </div>

      {/* 分页控制条 */}
      <div className="log-header" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <button className="btn" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>上一页</button>
          <button className="btn" disabled={page >= totalPages} style={{ marginLeft: 8 }} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>下一页</button>
          <span style={{ marginLeft: 12 }}>第 {page} / {totalPages} 页，共 {total} 条日志</span>
        </div>
        <div>
          <label htmlFor="pageSize" style={{ marginRight: 8 }}>每页数量:</label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => { setPage(1); setPageSize(parseInt(e.target.value, 10)); }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {logs.length === 0 ? (
        <p>暂无日志数据。可能是代理服务尚未接收到任何请求。</p>
      ) : (
        logs.map((log) => (
          <div key={uuidv4()} className="log-item" style={{ marginBottom: '20px' }}>
            <div className="log-header">
              <div><strong>连接ID:</strong> <Link href={`/logs/connection/${proxyId}/${log.connectionId}`}>{log.connectionId.substring(0, 8)}...</Link></div>
              <div><strong>创建时间:</strong> {new Date(log.createdAt).toLocaleString()}</div>
            </div>
            
            <div className="log-body">
              {log.direction === 'clientToServer' ? <h3>客户端 → 服务器</h3> : <h3>服务器 → 客户端</h3>}
              <div className="log-content">
                <div className="log-timestamp">{new Date(log.timestamp).toLocaleString()}</div>
                <pre className="code-block">{log.data}</pre>
              </div>
            </div>
          </div>
        ))
      )}
      </div>
    </>
  );
}
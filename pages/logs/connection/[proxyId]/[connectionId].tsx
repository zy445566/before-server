import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../../components/Layout';
import { useEffect, useMemo, useState } from 'react';

type Direction = 'clientToServer' | 'serverToClient';

interface LogListData  {
  connectionId:string,
  createdAt:string,
  data:string,
  timestamp:string,
  direction:Direction
}

export default function ConnectionLogsPage() {
  const router = useRouter();
  const { proxyId, connectionId } = router.query;

  const [allLogs, setAllLogs] = useState<LogListData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // 仅该连接的日志
  const sortedLogs = useMemo(() => {
    return [...allLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [allLogs]);

  const fetchConnectionLogs = async (pid: string, cid: string) => {
    const pageSize = 200;
    const page = 1;
    const url = `/api/proxies/logs/${pid}/connection/${cid}?page=${page}&pageSize=${pageSize}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      const errorMessage = resp.status === 404 ? '代理服务不存在或已被关闭' : '获取日志失败';
      throw new Error(errorMessage);
    }
    const data = await resp.json();
    return (data.logs || []) as LogListData[];
  };

  const fetchMeta = async () => {
    const resp = await fetch('/api/proxies/list');
    if (!resp.ok) return;
    const proxiesData = await resp.json();
    const pid = Array.isArray(proxyId) ? proxyId[0] : proxyId;
    const proxyInfo = proxiesData.proxies.find((p: any) => p.id === pid);
    if (proxyInfo) {
      setTargetUrl(proxyInfo.targetUrl);
      setProxyUrl(`${window.location.protocol}//${window.location.hostname}:${proxyInfo.port}`);
    }
  };

  const refresh = async () => {
    try {
      const pid = Array.isArray(proxyId) ? proxyId[0] : proxyId;
      const cid = Array.isArray(connectionId) ? connectionId[0] : connectionId;
      if (!pid || !cid) return;
      const logs = await fetchConnectionLogs(pid, cid);
      setAllLogs(logs);
      setError('');
    } catch (err: any) {
      setError(err?.message || '未知错误');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    let timer: NodeJS.Timeout | null = null;
    let refreshing = false;

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const safeRefresh = async () => {
      if (!active || refreshing) return;
      if (!autoRefreshEnabled) { stop(); return; }
      try {
        refreshing = true;
        await refresh();
        await fetchMeta();
        if (!timer && active && autoRefreshEnabled) {
          timer = setInterval(() => safeRefresh(), 5000);
        }
      } catch {
        stop();
      } finally {
        refreshing = false;
      }
    };

    safeRefresh();

    return () => {
      active = false;
      stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proxyId, connectionId, autoRefreshEnabled]);

  if (!proxyId || !connectionId) {
    return (
      <Layout title="加载中 - 连接详情">
        <div className="loading"><div className="spinner"></div></div>
      </Layout>
    );
  }

  const cidStr = Array.isArray(connectionId) ? connectionId[0] : connectionId;

  if (isLoading) {
    return (
      <Layout title="加载中 - 连接详情">
        <div className="loading"><div className="spinner"></div></div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="连接详情 - 出错">
        <div className="card">
          <div className="alert alert-error"><p>{error}</p></div>
          <div style={{ marginTop: 16 }}>
            {targetUrl && <p>目标URL: <a href={targetUrl} target="_blank" rel="noopener noreferrer">{targetUrl}</a></p>}
            {proxyUrl && <p>代理URL: <a href={proxyUrl} target="_blank" rel="noopener noreferrer">{proxyUrl}</a></p>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Link href={`/logs/${Array.isArray(proxyId) ? proxyId[0] : proxyId}`}>返回代理日志</Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="连接详情">
      <div style={{ marginBottom: 20 }}>
        <Link href={`/logs/${Array.isArray(proxyId) ? proxyId[0] : proxyId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          &larr; 返回代理日志
        </Link>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2>连接ID详情</h2>
            <p style={{ marginTop: 8, color: 'var(--light-text)' }}>连接ID: <strong>{cidStr}</strong></p>
            {targetUrl && (
              <p style={{ marginTop: 8, color: 'var(--light-text)' }}>
                目标URL: <a href={targetUrl} target="_blank" rel="noopener noreferrer">{targetUrl}</a>
              </p>
            )}
            {proxyUrl && (
              <p style={{ marginTop: 8, color: 'var(--light-text)' }}>
                代理URL: <a href={proxyUrl} target="_blank" rel="noopener noreferrer">{proxyUrl}</a>
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={() => refresh()}>刷新</button>
            <button className="btn" onClick={() => setAutoRefreshEnabled(v => !v)}>{autoRefreshEnabled ? '停止自动刷新' : '开启自动刷新'}</button>
          </div>
        </div>

        {sortedLogs.length === 0 ? (
          <p>该连接暂无传输数据。</p>
        ) : (
          sortedLogs.map((log, idx) => (
            <div key={`${log.timestamp}-${idx}`} className="log-item" style={{ marginBottom: 20 }}>
              <div className="log-header">
                <div><strong>方向:</strong> {log.direction === 'clientToServer' ? '客户端 → 服务器' : '服务器 → 客户端'}</div>
                <div><strong>连接创建时间:</strong> {new Date(log.createdAt).toLocaleString()}</div>
              </div>
              <div className="log-body">
                <div className="log-content">
                  <div className="log-timestamp">{new Date(log.timestamp).toLocaleString()}</div>
                  <pre className="code-block">{log.data}</pre>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
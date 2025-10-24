import { useState } from 'react';
import Link from 'next/link';

interface ProxyInfo {
  id: string;
  targetUrl: string;
  port: number;
  createdAt: Date | string;
}

interface ProxyListProps {
  proxies: ProxyInfo[];
  onDelete?: (id: string) => void;
  onRefresh?: () => void;
}

export default function ProxyList({ proxies, onDelete, onRefresh }: ProxyListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/proxies/close/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          // 代理不存在，刷新列表
          if (onRefresh) onRefresh();
          throw new Error('代理服务不存在或已被关闭');
        }
        throw new Error(data.error || '关闭代理服务失败');
      }

      if (onDelete) {
        onDelete(id);
      }
      
      // 显示成功消息
      alert('代理服务已成功关闭');
    } catch (error) {
      console.error('关闭代理服务失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`关闭代理服务失败: ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  };

  const getProxyAddress = (proxy: ProxyInfo) => {
    if (typeof window === 'undefined') {
      return `localhost:${proxy.port}`;
    }
    const protocol = new URL(proxy.targetUrl).protocol;
    return `${protocol}//${window.location.hostname}:${proxy.port}`;
  };

  if (!proxies || proxies.length === 0) {
    return (
      <div className="card">
        <h2>代理服务列表</h2>
        <p>暂无代理服务。请创建一个新的代理服务。</p>
        {onRefresh && (
          <button className="btn btn-primary" onClick={onRefresh}>
            刷新列表
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2>代理服务列表</h2>
        {onRefresh && (
          <button className="btn btn-primary" onClick={onRefresh}>
            刷新列表
          </button>
        )}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>目标URL</th>
              <th>代理地址</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {proxies.map((proxy) => (
              <tr key={proxy.id}>
                <td>{proxy.id.substring(0, 8)}...</td>
                <td>
                  <a href={proxy.targetUrl} target="_blank" rel="noopener noreferrer">
                    {proxy.targetUrl}
                  </a>
                </td>
                <td>
                  <a href={getProxyAddress(proxy)} target="_blank" rel="noopener noreferrer">
                    {getProxyAddress(proxy)}
                  </a>
                </td>
                <td>{new Date(proxy.createdAt).toLocaleString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href={`/logs/${proxy.id}`} className="btn btn-primary" style={{ fontSize: '14px', padding: '4px 8px' }}>
                      查看日志
                    </Link>
                    <button
                      className="btn btn-danger"
                      style={{ fontSize: '14px', padding: '4px 8px' }}
                      onClick={() => handleDelete(proxy.id)}
                      disabled={deletingId === proxy.id}
                    >
                      {deletingId === proxy.id ? '关闭中...' : '关闭'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
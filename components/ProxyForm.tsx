import { useState } from 'react';

interface ProxyInfo {
  id: string;
  targetUrl: string;
  port: number;
  createdAt: Date;
}

interface ProxyFormProps {
  onProxyCreated?: (proxy: ProxyInfo) => void;
}

export default function ProxyForm({ onProxyCreated }: ProxyFormProps) {
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [port, setPort] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!targetUrl) {
      setError('请输入目标URL');
      return;
    }

    // 简单验证URL格式
    try {
      new URL(targetUrl);
    } catch (error) {
      setError('URL格式无效，请输入有效的URL（例如：http://example.com）');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/proxies/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          targetUrl,
          ...(port && { port: Number(port) })
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '创建代理服务失败');
      }

      setTargetUrl('');
      if (onProxyCreated) {
        onProxyCreated(data.proxy);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>创建新的代理服务</h2>
      {error && (
        <div className="alert alert-error">
          <p>{error}</p>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="targetUrl">目标URL</label>
          <input
            type="text"
            id="targetUrl"
            className="form-control"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="例如：http://example.com 或 http://192.168.1.100:8080"
            disabled={isLoading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="port">端口号（可选）</label>
          <input
            type="number"
            id="port"
            className="form-control"
            value={port || ''}
            onChange={(e) => setPort(e.target.value ? parseInt(e.target.value) : null)}
            placeholder="留空则自动分配"
            min="1024"
            max="65535"
            disabled={isLoading}
          />
          <small className="form-text text-muted">
            端口范围：1024-65535
          </small>
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? '创建中...' : '创建代理'}
        </button>
      </form>
    </div>
  );
}
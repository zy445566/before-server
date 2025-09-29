import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import ProxyForm from '../components/ProxyForm';
import ProxyList from '../components/ProxyList';

interface ProxyInfo {
  id: string;
  targetUrl: string;
  port: number;
  createdAt: Date | string;
}

export default function Home() {
  const [proxies, setProxies] = useState<ProxyInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchProxies = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/proxies/list');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '获取代理列表失败');
      }

      setProxies(data.proxies);
      setError('');
    } catch (error) {
      console.error('获取代理列表失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      setError(`获取代理列表失败: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProxies();
  }, []);

  const handleProxyCreated = (newProxy: ProxyInfo) => {
    setProxies((prevProxies) => [...prevProxies, newProxy]);
  };

  const handleProxyDeleted = (deletedId: string) => {
    setProxies((prevProxies) => prevProxies.filter((proxy) => proxy.id !== deletedId));
  };

  return (
    <Layout>
      <ProxyForm onProxyCreated={handleProxyCreated} />
      
      {error && (
        <div className="alert alert-error">
          <p>{error}</p>
        </div>
      )}
      
      {isLoading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <ProxyList 
          proxies={proxies} 
          onDelete={handleProxyDeleted} 
          onRefresh={fetchProxies} 
        />
      )}
    </Layout>
  );
}
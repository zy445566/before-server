import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import LogViewer from '../../components/LogViewer';

export default function LogsPage() {
  const router = useRouter();
  const { id } = router.query;

  if (!id) {
    return (
      <Layout title="加载中 - 代理日志">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </Layout>
    );
  }

  // 确保id是字符串类型
  const proxyId = Array.isArray(id) ? id[0] : id;

  return (
    <Layout title="代理日志">
      <div style={{ marginBottom: '20px' }}>
        <Link href="/" legacyBehavior>
          <a style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            &larr; 返回代理列表
          </a>
        </Link>
      </div>
      
      <LogViewer proxyId={proxyId} />
    </Layout>
  );
}
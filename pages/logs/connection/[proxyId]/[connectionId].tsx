import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../../components/Layout';
import LogViewer from '../../../../components/LogViewer';

export default function ConnectionLogsPage() {
  const router = useRouter();
  const { proxyId, connectionId } = router.query;


  if (!proxyId || !connectionId) {
    return (
      <Layout title="加载中 - 连接详情">
        <div className="loading"><div className="spinner"></div></div>
      </Layout>
    );
  }

  // 确保proxyIdStr是字符串类型
  const proxyIdStr = Array.isArray(proxyId) ? proxyId[0] : proxyId;
  const connectionIdStr = Array.isArray(connectionId) ? connectionId[0] : connectionId;

  return (
    <Layout title="连接详情">
      <div style={{ marginBottom: 20 }}>
        <Link href={`/logs/${Array.isArray(proxyId) ? proxyId[0] : proxyId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          &larr; 返回代理日志
        </Link>
      </div>
      <LogViewer proxyId={proxyIdStr} connectionId={connectionIdStr} />
    </Layout>
  );
}
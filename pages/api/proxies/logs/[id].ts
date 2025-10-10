import type { NextApiRequest, NextApiResponse } from 'next';
import proxyManager from '../../../../lib/proxyManager';

type LogListData = {
  connectionId:string,
  createdAt:Date,
  data:string,
  timestamp:Date,
  direction:'clientToServer'|'serverToClient'
}

type ResponseData = {
  success: boolean;
  logs?: LogListData[];
  error?: string;
  message?: string;
  // 新增分页信息
  total?: number;
  page?: number;
  pageSize?: number;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: '只支持GET请求' });
  }

  try {
    const { id } = req.query;
    
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ success: false, error: '缺少有效的代理ID参数' });
    }

    try {

      // 分页参数（仅在非增量模式下生效）
      const pageParam = req.query.page;
      const pageSizeParam = req.query.pageSize;
      let page = 1;
      let pageSize = 10;

      if (pageParam && !Array.isArray(pageParam)) {
        const n = parseInt(pageParam, 10);
        if (!isNaN(n) && n > 0) page = n;
      }
      if (pageSizeParam && !Array.isArray(pageSizeParam)) {
        const n = parseInt(pageSizeParam, 10);
        if (!isNaN(n) && n > 0 && n <= 200) pageSize = n; // 上限保护防止一次返回过大
      }

      // 获取所有日志
      const allConnLogs = proxyManager.getProxyLogs(id);

      const allLogs:{connectionId:string,createdAt:Date,data:string,timestamp:Date,direction:'clientToServer'|'serverToClient'}[] = [];
      for(const connLog of allConnLogs) {
        for(const log of connLog?.clientToServer||[] ) {
          allLogs.push({
            connectionId: connLog.connectionId,
            createdAt: connLog.createdAt,
            data: log.data,
            timestamp: log.timestamp,
            direction: 'clientToServer'
          });
        }
        for(const log of connLog?.serverToClient||[] ) {
          allLogs.push({
            connectionId: connLog.connectionId,
            createdAt: connLog.createdAt,
            data: log.data,
            timestamp: log.timestamp,
            direction: 'serverToClient'
          });
        }
      }

      // 统一按创建时间倒序，便于查看最新连接
      const sorted = [...allLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const total = sorted.length;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paged = start < total ? sorted.slice(start, end) : [];
      
      return res.status(200).json({
        success: true,
        logs: paged,
        total,
        page,
        pageSize
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      return res.status(404).json({ 
        success: false, 
        error: '代理服务不存在', 
        message: errorMessage 
      });
    }
  } catch (error) {
    console.error('获取代理服务日志失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return res.status(500).json({ 
      success: false, 
      error: '获取代理服务日志失败', 
      message: errorMessage 
    });
  }
}
import type { NextApiRequest, NextApiResponse } from 'next';
import proxyManager from '../../../../../../lib/proxyManager';

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
    const { id, connectionId } = req.query;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ success: false, error: '缺少有效的代理ID参数' });
    }
    if (!connectionId || Array.isArray(connectionId)) {
      return res.status(400).json({ success: false, error: '缺少有效的连接ID参数' });
    }

    // 分页参数
    const pageParam = req.query.page;
    const pageSizeParam = req.query.pageSize;
    let page = 1;
    let pageSize = 50; // 默认50
    if (pageParam && !Array.isArray(pageParam)) {
      const n = parseInt(pageParam, 10);
      if (!isNaN(n) && n > 0) page = n;
    }
    if (pageSizeParam && !Array.isArray(pageSizeParam)) {
      const n = parseInt(pageSizeParam, 10);
      if (!isNaN(n) && n > 0 && n <= 500) pageSize = n; // 上限保护
    }

    try {
      // 获取该代理的所有连接日志
      const target = proxyManager.getProxyConnLogs(id, connectionId);

      if (!target) {
        return res.status(200).json({
          success: true,
          logs: [],
          total: 0,
          page,
          pageSize
        });
      }

      const merged: LogListData[] = [];
      for (const log of target.clientToServer || []) {
        merged.push({
          connectionId: target.connectionId,
          createdAt: target.createdAt,
          data: log.data,
          timestamp: log.timestamp,
          direction: 'clientToServer'
        });
      }
      for (const log of target.serverToClient || []) {
        merged.push({
          connectionId: target.connectionId,
          createdAt: target.createdAt,
          data: log.data,
          timestamp: log.timestamp,
          direction: 'serverToClient'
        });
      }

      // 统一按时间升序，便于查看交流顺序
      const sorted = merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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
    console.error('获取连接日志失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return res.status(500).json({
      success: false,
      error: '获取连接日志失败',
      message: errorMessage
    });
  }
}
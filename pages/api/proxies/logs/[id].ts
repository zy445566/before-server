import type { NextApiRequest, NextApiResponse } from 'next';
import proxyManager from '../../../../lib/proxyManager';

type LogData = {
  timestamp: Date;
  data: string;
}

type ConnectionLog = {
  connectionId: string;
  createdAt: Date;
  clientToServer: LogData[];
  serverToClient: LogData[];
}

type ResponseData = {
  success: boolean;
  logs?: ConnectionLog[];
  error?: string;
  message?: string;
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
      const sinceParam = req.query.since;
      let sinceDate: Date | null = null;
      
      if (sinceParam && !Array.isArray(sinceParam)) {
        sinceDate = new Date(decodeURIComponent(sinceParam));
        if (isNaN(sinceDate.getTime())) {
          sinceDate = null;
        }
      }

      const logs = proxyManager.getProxyLogs(id, sinceDate);
      
      return res.status(200).json({
        success: true,
        logs
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
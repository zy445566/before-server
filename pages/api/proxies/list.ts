import type { NextApiRequest, NextApiResponse } from 'next';
import proxyManager from '../../../lib/proxyManager';

type ProxyInfo = {
  id: string;
  targetUrl: string;
  port: number;
  createdAt: Date;
}

type ResponseData = {
  success: boolean;
  proxies?: ProxyInfo[];
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
    const proxies = proxyManager.getAllProxies();
    
    return res.status(200).json({
      success: true,
      proxies
    });
  } catch (error) {
    console.error('获取代理服务列表失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return res.status(500).json({ 
      success: false, 
      error: '获取代理服务列表失败', 
      message: errorMessage 
    });
  }
}
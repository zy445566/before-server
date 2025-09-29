import type { NextApiRequest, NextApiResponse } from 'next';
import proxyManager from '../../../lib/proxyManager';

type ResponseData = {
  success: boolean;
  message?: string;
  error?: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: '只支持DELETE请求' });
  }

  try {
    const result = proxyManager.closeAllProxies();
    
    return res.status(200).json({
      success: true,
      message: '所有代理服务已关闭'
    });
  } catch (error) {
    console.error('关闭所有代理服务失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return res.status(500).json({ 
      success: false, 
      error: '关闭所有代理服务失败', 
      message: errorMessage 
    });
  }
}
import type { NextApiRequest, NextApiResponse } from 'next';
import proxyManager from '../../../../lib/proxyManager';

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
    const { id } = req.query;
    
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ success: false, error: '缺少有效的代理ID参数' });
    }

    try {
      const result = proxyManager.closeProxy(id);
      
      return res.status(200).json({
        success: true,
        message: '代理服务已关闭'
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
    console.error('关闭代理服务失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return res.status(500).json({ 
      success: false, 
      error: '关闭代理服务失败', 
      message: errorMessage 
    });
  }
}
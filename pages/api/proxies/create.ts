import type { NextApiRequest, NextApiResponse } from 'next';
import proxyManager from '../../../lib/proxyManager';

type ResponseData = {
  success: boolean;
  proxy?: {
    id: string;
    targetUrl: string;
    port: number;
    createdAt: Date;
  };
  error?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: '只支持POST请求' });
  }

  try {
    const { targetUrl, port } = req.body;
    
    if (typeof targetUrl !== 'string' || !targetUrl.trim()) {
      return res.status(400).json({ success: false, error: '缺少目标URL参数' });
    }

    if (port !== undefined && port !== null && (typeof port !== 'number' || !Number.isInteger(port) || port < 1024 || port > 65535)) {
      return res.status(400).json({ success: false, error: '端口号必须在1024-65535之间' });
    }

    // 验证URL格式
    try {
      const parsed = new URL(targetUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('仅支持 http 或 https 协议');
    } catch (error) {
      return res.status(400).json({ success: false, error: 'URL格式无效' });
    }

    const proxyInfo = await proxyManager.createProxy(targetUrl.trim(), port);
    
    return res.status(200).json({
      success: true,
      proxy: {
        id: proxyInfo.id,
        targetUrl: proxyInfo.targetUrl,
        port: proxyInfo.port,
        createdAt: proxyInfo.createdAt
      }
    });
  } catch (error) {
    console.error('创建代理服务失败:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return res.status(500).json({ 
      success: false, 
      error: '创建代理服务失败', 
      message: errorMessage 
    });
  }
}

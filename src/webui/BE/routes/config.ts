import { Router, Request, Response } from 'express'
import { Context } from 'cordis'
import { getConfigUtil, webuiTokenUtil } from '@/common/config'
import { selfInfo } from '@/common/globalVars'
import { ReqConfig, ResConfig } from '../types'

export function createConfigRoutes(ctx: Context): Router {
  const router = Router()

  // 设置token接口
  router.post('/set-token', (req: Request, res: Response) => {
    const { token } = req.body
    if (!token) {
      res.status(400).json({ success: false, message: 'Token不能为空' })
      return
    }
    webuiTokenUtil.setToken(token)
    res.json({ success: true, message: 'Token设置成功' })
  })

  // 获取配置
  router.get('/config/', (req, res) => {
    try {
      const config = getConfigUtil().getConfig()
      const resJson: ResConfig = {
        config,
        selfInfo,
      }
      res.json({
        success: true,
        data: resJson,
      })
    } catch (e) {
      res.status(500).json({ success: false, message: '获取配置失败', error: e })
    }
  })

  // 保存配置
  router.post('/config', (req, res) => {
    try {
      const { config } = req.body as ReqConfig
      const oldConfig = getConfigUtil().getConfig()
      const newConfig = { ...oldConfig, ...config }
      ctx.parallel('llob/config-updated', newConfig).then()
      getConfigUtil().setConfig(newConfig)
      res.json({ success: true, message: '配置保存成功' })
    } catch (e) {
      res.status(500).json({ success: false, message: '保存配置失败', error: e })
    }
  })

  return router
}

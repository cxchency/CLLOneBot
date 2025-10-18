import fs from 'node:fs'
import path from 'node:path'
import JSON5 from 'json5'
import { Config, OB11Config, SatoriConfig, WebUIConfig } from './types'
import { DATA_DIR, selfInfo } from './globalVars'
import { mergeNewProperties } from './utils/misc'
import { fileURLToPath } from 'node:url'
import { defaultConfig } from '@/common/defaultConfig'

export class ConfigUtil {
  private configPath: string | undefined
  private config: Config | null = null
  private watch = false
  private defaultConfigPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'default_config.json')

  constructor(configPath?: string) {
    this.configPath = configPath
  }

  setConfigPath(configPath: string) {
    this.configPath = configPath
  }

  listenChange(cb: (config: Config) => void) {
    console.log('配置文件位于', this.configPath)

    this.setConfig(this.getConfig())
    if (this.configPath) {
      fs.watchFile(this.configPath, { persistent: true, interval: 1000 }, () => {
        if (!this.watch) {
          return
        }
        console.log('配置重載')
        const c = this.reloadConfig()
        cb(c)
      })
    }
  }

  getConfig(cache = true) {
    if (this.config && cache) {
      return this.config
    }

    return this.reloadConfig()
  }

  getDefaultConfig(): Config {
    const _defaultConfig = { ...defaultConfig }
    const defaultConfigFromFile = fs.readFileSync(this.defaultConfigPath, 'utf-8')
    try {
      const parsedDefaultConfig = JSON5.parse(defaultConfigFromFile)
      Object.assign(_defaultConfig, parsedDefaultConfig)
    } catch (e) {
      console.error('解析 default_config.json 错误', e)
    }
    return _defaultConfig
  }

  reloadConfig(): Config {
    if (!this.configPath) {
      return this.getDefaultConfig()
    }
    if (!fs.existsSync(this.configPath)) {
      this.config = this.getDefaultConfig()
      this.setConfig(this.config)
      return this.config
    }
    else {
      const data = fs.readFileSync(this.configPath, 'utf-8')
      let jsonData: Config = defaultConfig
      try {
        jsonData = JSON5.parse(data)
        console.info('配置加载成功')
        jsonData = this.migrateConfig(jsonData)
        mergeNewProperties(defaultConfig, jsonData)
        jsonData.webui = this.migrateWebUIToken(jsonData.webui)
        jsonData = this.cleanupConfig(defaultConfig, jsonData);
        this.setConfig(jsonData)
        this.config = jsonData
        return this.config
      } catch (e) {
        console.error(`${this.configPath} json 内容不合格`, e)
        this.config = this.getDefaultConfig()
        return this.config
      }
    }
  }

  setConfig(config: Config) {
    this.config = config
    this.writeConfig(config)
  }

  writeConfig(config: Config, watch = false) {
    if (!this.configPath) {
      return
    }
    this.watch = watch
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8')
    setTimeout(() => {
      this.watch = true
    }, 3000)
  }


  /**
   * 递归清理配置对象，以 defaultConfig 为基准，删除 oldConfig 中不存在于 defaultConfig 的 key
   */
  private cleanupConfig(defaultConfig: any, oldConfig: any): any {
    // 如果不是对象，直接返回
    if (typeof defaultConfig !== 'object' || defaultConfig === null || Array.isArray(defaultConfig)) {
      return oldConfig;
    }
    if (typeof oldConfig !== 'object' || oldConfig === null) {
      return oldConfig;
    }

    const cleaned: any = {};

    // 遍历 defaultConfig 的 key
    for (const key in defaultConfig) {
      if (defaultConfig.hasOwnProperty(key)) {
        // 如果 oldConfig 中存在该 key
        if (oldConfig.hasOwnProperty(key)) {
          const defaultValue = defaultConfig[key];
          const oldValue = oldConfig[key];

          // 如果 defaultValue 是普通对象（非数组），递归清理
          if (
            typeof defaultValue === 'object' &&
            defaultValue !== null &&
            !Array.isArray(defaultValue) &&
            typeof oldValue === 'object' &&
            oldValue !== null &&
            !Array.isArray(oldValue)
          ) {
            cleaned[key] = this.cleanupConfig(defaultValue, oldValue);
          } else {
            // 否则直接使用 oldConfig 的值
            cleaned[key] = oldValue;
          }
        } else {
          // oldConfig 中不存在该 key，使用 defaultConfig 的值
          cleaned[key] = defaultConfig[key];
        }
      }
    }

    return cleaned;
  }

  private migrateConfig(oldConfig: any): Config {
    let migratedConfig = oldConfig;

    if (!oldConfig.ob11?.connect || !Array.isArray(oldConfig.ob11.connect)) {
      const ob11 = oldConfig.ob11 || {};
      migratedConfig = {
        ...oldConfig,
        ob11: {
          enable: ob11.enable || false,
          connect: [
            {
              type: 'ws',
              enable: ob11.enableWs || false,
              port: ob11.wsPort || 3001,
              heartInterval: oldConfig.heartInterval || 30000,
              token: ob11.token || '',
              messageFormat: ob11.messagePostFormat || 'array',
              reportSelfMessage: ob11.reportSelfMessage || false,
              reportOfflineMessage: oldConfig.receiveOfflineMsg || false,
              debug: oldConfig.debug || false,
            },
            {
              type: 'ws-reverse',
              enable: ob11.enableWsReverse || false,
              url: (ob11.wsReverseUrls && ob11.wsReverseUrls[0]) || '',
              heartInterval: oldConfig.heartInterval || 30000,
              token: ob11.token || '',
              messageFormat: ob11.messagePostFormat || 'array',
              reportSelfMessage: ob11.reportSelfMessage || false,
              reportOfflineMessage: oldConfig.receiveOfflineMsg || false,
              debug: oldConfig.debug || false,
            },
            {
              type: 'http',
              enable: ob11.enableHttp || false,
              port: ob11.httpPort || 3000,
              token: ob11.token || '',
              messageFormat: ob11.messagePostFormat || 'array',
              reportSelfMessage: ob11.reportSelfMessage || false,
              reportOfflineMessage: oldConfig.receiveOfflineMsg || false,
              debug: oldConfig.debug || false,
            },
            {
              type: 'http-post',
              enable: ob11.enableHttpPost || false,
              url: (ob11.httpPostUrls && ob11.httpPostUrls[0]) || '',
              enableHeart: ob11.enableHttpHeart || false,
              heartInterval: oldConfig.heartInterval || 30000,
              token: ob11.httpSecret || '',
              messageFormat: ob11.messagePostFormat || 'array',
              reportSelfMessage: ob11.reportSelfMessage || false,
              reportOfflineMessage: oldConfig.receiveOfflineMsg || false,
              debug: oldConfig.debug || false,
            },
          ],
        },
      };
    }

    return migratedConfig as Config
  }

  private migrateWebUIToken(oldWebuiConfig: WebUIConfig & {token?: string}) {
    if (oldWebuiConfig.token && !webuiTokenUtil.getToken()) {
      webuiTokenUtil.setToken(oldWebuiConfig.token)
      delete oldWebuiConfig['token']
    }
    return oldWebuiConfig
  }

}

let globalConfigUtil: ConfigUtil | null = null

export function getConfigUtil(force = false) {
  const configFilePath = selfInfo.uin ? path.join(DATA_DIR, `config_${selfInfo.uin}.json`) : undefined
  if (!globalConfigUtil || force) {
    globalConfigUtil = new ConfigUtil(configFilePath)
  }
  return globalConfigUtil
}

class WebUITokenUtil {
  private token: string = ''

  constructor(private readonly tokenPath: string) {
    this.tokenPath = tokenPath
  }

  getToken() {
    if (!this.token) {
      if (fs.existsSync(this.tokenPath)) {
        this.token = fs.readFileSync(this.tokenPath, 'utf-8').trim()
      }
    }
    return this.token
  }

  setToken(token: string) {
    this.token = token.trim()
    fs.writeFileSync(this.tokenPath, token, 'utf-8')
  }
}

export const webuiTokenUtil = new WebUITokenUtil(path.join(DATA_DIR, 'webui_token.txt'))

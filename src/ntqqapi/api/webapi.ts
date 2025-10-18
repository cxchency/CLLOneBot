import { selfInfo } from '@/common/globalVars'
import { RequestUtil } from '@/common/utils/request'
import { Context, Service } from 'cordis'
import { Dict } from 'cosmokit'

declare module 'cordis' {
  interface Context {
    ntWebApi: NTQQWebApi
  }
}

interface ExpertInfo {
  ret: number
  data: {
    m: number[]
    g: number[]
  }
  delay: number
  domainid: number
}

export enum WebHonorType {
  ALL = 'all',
  TALKACTIVE = 'talkative',
  PERFROMER = 'performer',
  LEGEND = 'legend',
  STORONGE_NEWBI = 'strong_newbie',
  EMOTION = 'emotion'
}

export class NTQQWebApi extends Service {
  static inject = ['ntUserApi']

  constructor(protected ctx: Context) {
    super(ctx, 'ntWebApi', true)
  }

  genBkn(key: string) {
    key = key || ''
    let hash = 5381
    for (let i = 0; i < key.length; i++) {
      const code = key.charCodeAt(i)
      hash = hash + (hash << 5) + code
    }
    return (hash & 0x7FFFFFFF).toString()
  }

  async getGroupHonorInfo(groupCode: string, getType: string) {
    const getDataInternal = async (groupCode: string, type: number) => {
      const url = 'https://qun.qq.com/interactive/honorlist?gc=' + groupCode + '&type=' + type
      let resJson
      try {
        const res = await RequestUtil.HttpGetText(url, 'GET', '', { 'Cookie': cookieStr })
        const match = res.match(/window\.__INITIAL_STATE__=(.*?);/)
        if (match) {
          resJson = JSON.parse(match[1].trim())
        }
        if (type === 1) {
          return resJson?.talkativeList
        }
        else {
          return resJson?.actorList
        }
      } catch (e) {
        this.ctx.logger.error('获取当前群荣耀失败', url, e)
      }
      return undefined
    }

    const honorInfo: Dict = { group_id: groupCode }
    const cookieObject = await this.ctx.ntUserApi.getCookies('qun.qq.com')
    const cookieStr = this.cookieToString(cookieObject)

    if (getType === WebHonorType.TALKACTIVE || getType === WebHonorType.ALL) {
      try {
        const RetInternal = await getDataInternal(groupCode, 1)
        if (!RetInternal) {
          throw new Error('获取龙王信息失败')
        }
        honorInfo.current_talkative = {
          user_id: RetInternal[0]?.uin,
          avatar: RetInternal[0]?.avatar,
          nickname: RetInternal[0]?.name,
          day_count: 0,
          description: RetInternal[0]?.desc,
        }
        honorInfo.talkative_list = []
        for (const talkative_ele of RetInternal) {
          honorInfo.talkative_list.push({
            user_id: talkative_ele?.uin,
            avatar: talkative_ele?.avatar,
            description: talkative_ele?.desc,
            day_count: 0,
            nickname: talkative_ele?.name,
          })
        }
      } catch (e) {
        this.ctx.logger.error(e)
      }
    }
    if (getType === WebHonorType.PERFROMER || getType === WebHonorType.ALL) {
      try {
        const RetInternal = await getDataInternal(groupCode, 2)
        if (!RetInternal) {
          throw new Error('获取群聊之火失败')
        }
        honorInfo.performer_list = []
        for (const performer_ele of RetInternal) {
          honorInfo.performer_list.push({
            user_id: performer_ele?.uin,
            nickname: performer_ele?.name,
            avatar: performer_ele?.avatar,
            description: performer_ele?.desc,
          })
        }
      } catch (e) {
        this.ctx.logger.error(e)
      }
    }
    if (getType === WebHonorType.PERFROMER || getType === WebHonorType.ALL) {
      try {
        const RetInternal = await getDataInternal(groupCode, 3)
        if (!RetInternal) {
          throw new Error('获取群聊炽焰失败')
        }
        honorInfo.legend_list = []
        for (const legend_ele of RetInternal) {
          honorInfo.legend_list.push({
            user_id: legend_ele?.uin,
            nickname: legend_ele?.name,
            avatar: legend_ele?.avatar,
            desc: legend_ele?.description,
          })
        }
      } catch (e) {
        this.ctx.logger.error('获取群聊炽焰失败', e)
      }
    }
    if (getType === WebHonorType.EMOTION || getType === WebHonorType.ALL) {
      try {
        const RetInternal = await getDataInternal(groupCode, 6)
        if (!RetInternal) {
          throw new Error('获取快乐源泉失败')
        }
        honorInfo.emotion_list = []
        for (const emotion_ele of RetInternal) {
          honorInfo.emotion_list.push({
            user_id: emotion_ele?.uin,
            nickname: emotion_ele?.name,
            avatar: emotion_ele?.avatar,
            desc: emotion_ele?.description,
          })
        }
      } catch (e) {
        this.ctx.logger.error('获取快乐源泉失败', e)
      }
    }
    //冒尖小春笋好像已经被tx扬了
    if (getType === WebHonorType.EMOTION || getType === WebHonorType.ALL) {
      honorInfo.strong_newbie_list = []
    }
    return honorInfo
  }

  private cookieToString(cookieObject: Dict) {
    return Object.entries(cookieObject).map(([key, value]) => `${key}=${value}`).join('; ')
  }

  async batchDeleteGroupMember(groupCode: string, memberUinList: string[]) {
    const cookieObject = await this.ctx.ntUserApi.getCookies('qun.qq.com')
    const bkn = this.genBkn(cookieObject.skey)
    const url = `https://qun.qq.com/cgi-bin/qun_mgr/delete_group_member?bkn=${bkn}&ts=${Date.now()}`
    const cookieStr = this.cookieToString(cookieObject)

    // 创建 FormData 对象
    const formData = new FormData()
    formData.append('gc', groupCode)
    formData.append('ul', memberUinList.join('|'))
    formData.append('flag', '0')
    formData.append('bkn', bkn)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Cookie': cookieStr,
      },
      body: formData,
    })

    const responseText = await response.text()
    return JSON.parse(responseText)
    // if (result.retcode === 0) {
    //   this.ctx.logger.info(`成功删除群成员: ${memberUinList.join(', ')}`)
    //   return { success: true, message: '删除成功' }
    // } else {
    //   this.ctx.logger.error('删除群成员失败', result)
    //   return { success: false, message: result.msg || '删除失败' }
    // }
  }

  async getExpertInfo(uin: string): Promise<ExpertInfo> {
    const pSkey = (await this.ctx.ntUserApi.getPSkey(['vip.qq.com'])).domainPskeyMap.get('vip.qq.com')!
    const bkn = this.genBkn(pSkey)
    const url = `https://cgi.vip.qq.com/card/getExpertInfo?ps_tk=${bkn}&fuin=${uin}&g_tk=${bkn}`
    const cookie = `p_uin=o${selfInfo.uin}; p_skey=${pSkey}; uin=o${selfInfo.uin}`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Reqable/2.30.1',
        'Referer': 'https://cgi.vip.qq.com/',
        'Cookie': cookie
      }
    })
    return await response.json()
  }
}

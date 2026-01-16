import { BaseAction } from '../BaseAction'
import { OB11User } from '../../types'
import { ActionName } from '../types'
import { selfInfo } from '@/common/globalVars'
import { sleep } from '@/common/utils'

class GetLoginInfo extends BaseAction<{}, OB11User> {
  actionName = ActionName.GetLoginInfo

  protected async _handle() {
    for (let i = 0; i < 5; i++) {
      try {
        const nick = await this.ctx.ntUserApi.getSelfNick(true)
        if (!nick) throw new Error('Empty nick')
        break
      } catch {
        await sleep(500)
      }
    }
    return {
      user_id: parseInt(selfInfo.uin),
      nickname: selfInfo.nick
    }
  }
}

export default GetLoginInfo

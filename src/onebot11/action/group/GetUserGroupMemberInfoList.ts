import { OB11GroupMember } from '../../types'
import { OB11Entities } from '../../entities'
import { BaseAction, Schema } from '../BaseAction'
import { ActionName } from '../types'

interface Payload {
  user_id: number | string
}

class GetUserGroupMemberInfoList extends BaseAction<Payload, OB11GroupMember[]> {
  actionName = ActionName.GetUserGroupMemberInfoList
  payloadSchema = Schema.object({
    user_id: Schema.union([Number, String]).required()
  })

  protected async _handle(payload: Payload) {
    const userUin = String(payload.user_id)
    const groupList = await this.ctx.ntGroupApi.getGroups()
    const result: OB11GroupMember[] = []
    
    for (const group of groupList) {
      try {
        const members = await this.ctx.ntGroupApi.getGroupMembers(group.groupCode, false)
        for (const member of members.result.infos.values()) {
          if (member.uin === userUin) {
            result.push(OB11Entities.groupMember(+group.groupCode, member))
            break
          }
        }
      } catch {}
    }
    
    return result
  }
}

export default GetUserGroupMemberInfoList

import { OB11BaseNoticeEvent } from '../notice/OB11BaseNoticeEvent'
import { EventType } from '../OB11BaseEvent'

export class OB11GroupRequestEvent extends OB11BaseNoticeEvent {
  post_type = EventType.REQUEST
  request_type = 'group'
  sub_type: 'add' | 'invite'  // invite 为邀请 bot 进群
  comment: string
  flag: string
  group_id: number
  group_name?: string
  user_id: number  // 当 sub_type 为 invite 的时候， user_id 为邀请人的 QQ 号
  invitor_id: number // https://github.com/Mrs4s/go-cqhttp/blob/master/coolq/event.go#L566

  constructor(groupId: number, userId: number, flag: string, comment: string, subType: 'add' | 'invite', invitorId: number = 0, groupName?: string) {
    super()
    this.group_id = groupId
    this.user_id = userId
    this.comment = comment
    this.flag = flag
    this.sub_type = subType
    this.invitor_id = invitorId
    this.group_name = groupName
  }
}

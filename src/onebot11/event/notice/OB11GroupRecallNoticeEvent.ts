import { OB11GroupNoticeEvent } from './OB11GroupNoticeEvent'

export class OB11GroupRecallNoticeEvent extends OB11GroupNoticeEvent {
  notice_type = 'group_recall'
  operator_id: number
  message_id: number
  group_id: number
  user_id: number

  constructor(groupId: number, userId: number, operatorId: number, messageId: number, groupName?: string) {
    super()
    this.group_id = groupId
    this.user_id = userId
    this.operator_id = operatorId
    this.message_id = messageId
    this.group_name = groupName
  }
}

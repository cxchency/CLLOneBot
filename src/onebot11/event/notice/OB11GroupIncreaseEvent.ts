import { OB11GroupNoticeEvent } from './OB11GroupNoticeEvent'

type GroupIncreaseSubType = 'approve' | 'invite'

export class OB11GroupIncreaseEvent extends OB11GroupNoticeEvent {
  notice_type = 'group_increase'
  operator_id: number
  sub_type: GroupIncreaseSubType
  group_id: number
  user_id: number

  constructor(groupId: number, userId: number, operatorId: number, subType: GroupIncreaseSubType = 'approve', groupName?: string) {
    super()
    this.group_id = groupId
    this.operator_id = operatorId
    this.user_id = userId
    this.sub_type = subType
    this.group_name = groupName
  }
}

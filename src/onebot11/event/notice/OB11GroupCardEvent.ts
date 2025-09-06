import { OB11GroupNoticeEvent } from './OB11GroupNoticeEvent'

export class OB11GroupCardEvent extends OB11GroupNoticeEvent {
  notice_type = 'group_card'
  card_new: string
  card_old: string
  group_id: number
  user_id: number

  constructor(groupId: number, userId: number, cardNew: string, cardOld: string, groupName?: string) {
    super()
    this.group_id = groupId
    this.user_id = userId
    this.card_new = cardNew
    this.card_old = cardOld
    this.group_name = groupName
  }
}

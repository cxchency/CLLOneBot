import { OB11GroupNoticeEvent } from './OB11GroupNoticeEvent'

export interface GroupUploadFile {
  id: string
  name: string
  size: number
  busid: number
}

export class OB11GroupUploadNoticeEvent extends OB11GroupNoticeEvent {
  notice_type = 'group_upload'
  file: GroupUploadFile
  group_id: number
  user_id: number

  constructor(groupId: number, userId: number, file: GroupUploadFile, groupName?: string) {
    super()
    this.group_id = groupId
    this.user_id = userId
    this.file = file
    this.group_name = groupName
  }
}

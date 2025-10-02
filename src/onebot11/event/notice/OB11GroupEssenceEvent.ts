import { OB11GroupNoticeEvent } from './OB11GroupNoticeEvent'
import { ChatType } from '@/ntqqapi/types'
import { Context } from 'cordis'

export class GroupEssenceEvent extends OB11GroupNoticeEvent {
  notice_type = 'essence'
  message_id: number
  sender_id: number
  sub_type: 'add' | 'delete' = 'add'
  group_id: number
  user_id: number
  operator_id: number

  constructor(groupId: number, messageId: number, senderId: number, operatorId: number, groupName?: string) {
    super()
    this.group_id = groupId
    this.user_id = senderId
    this.message_id = messageId
    this.sender_id = senderId
    this.operator_id = operatorId
    this.group_name = groupName
  }

  static async parse(ctx: Context, url: URL, groupName?: string) {
    const searchParams = url.searchParams
    const msgSeq = searchParams.get('seq')
    const groupCode = searchParams.get('gc')
    const msgRandom = searchParams.get('random')
    if (!groupCode || !msgSeq || !msgRandom) return
    const peer = {
      guildId: '',
      chatType: ChatType.Group,
      peerUid: groupCode
    }
    let essence
    try {
      essence = await ctx.ntGroupApi.queryCachedEssenceMsg(groupCode, msgSeq, msgRandom)
    }catch (e: any) {
      ctx.logger.error('获取群精华消息失败', e.message)
      return
    }
    const { msgList } = await ctx.ntMsgApi.queryFirstMsgBySeq(peer, msgSeq)
    const sourceMsg = msgList.find(e => e.msgRandom === msgRandom)
    if (!sourceMsg) return
    return new GroupEssenceEvent(
      parseInt(groupCode),
      ctx.store.getShortIdByMsgInfo(peer, sourceMsg.msgId)!,
      parseInt(essence.items[0]?.msgSenderUin ?? sourceMsg.senderUin),
      parseInt(essence.items[0]?.opUin ?? '0'),
      groupName
    )
  }
}

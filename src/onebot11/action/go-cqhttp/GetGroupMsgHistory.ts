import { BaseAction, Schema } from '../BaseAction'
import { OB11Message } from '../../types'
import { ActionName } from '../types'
import { ChatType, Peer } from '@/ntqqapi/types'
import { OB11Entities } from '../../entities'
import { RawMessage } from '@/ntqqapi/types'
import { filterNullable, parseBool } from '@/common/utils/misc'

interface Payload {
  group_id: number | string
  message_seq?: number | string
  count: number | string
  reverseOrder: boolean
}

interface Response {
  messages: OB11Message[]
}

export class GetGroupMsgHistory extends BaseAction<Payload, Response> {
  actionName = ActionName.GoCQHTTP_GetGroupMsgHistory
  payloadSchema = Schema.object({
    group_id: Schema.union([Number, String]).required(),
    message_seq: Schema.union([Number, String]),
    count: Schema.union([Number, String]).default(20),
    reverseOrder: Schema.union([Boolean, Schema.transform(String, parseBool)]).default(false)
  })

  private async getMessage(peer: Peer, count: number, reverseOrder: boolean, seq?: number | string) {
    let msgList: RawMessage[]
    if (!seq || +seq === 0) {
      msgList = (await this.ctx.ntMsgApi.getAioFirstViewLatestMsgs(peer, count)).msgList
    } else {
      // queryOrder: false = 从新到旧, true = 从旧到新
      // reverseOrder: false = 获取更早的消息, true = 获取更新的消息
      msgList = (await this.ctx.ntMsgApi.getMsgsBySeqAndCount(peer, String(seq), count, !reverseOrder, true)).msgList
    }
    if (!msgList?.length) return
    const ob11MsgList = await Promise.all(msgList.map(msg => {
      let rawMsg = msg
      if (rawMsg.recallTime !== '0') {
        let msg = this.ctx.store.getMsgCache(rawMsg.msgId)
        if (msg) {
          rawMsg = msg
        }
      }
      return OB11Entities.message(this.ctx, rawMsg)
    }))
    return { list: filterNullable(ob11MsgList), seq: +msgList[0].msgSeq }
  }

  protected async _handle(payload: Payload): Promise<Response> {
    const peer = {
      chatType: ChatType.Group,
      peerUid: payload.group_id.toString()
    }

    const messages: OB11Message[] = []
    let seq = payload.message_seq
    let count = +payload.count

    // 如果指定了 seq，需要调整起始位置以排除 seq 本身
    if (seq && +seq !== 0) {
      if (payload.reverseOrder) {
        // 倒序：获取更新的消息，从 seq + 1 开始
        seq = +seq + 1
      } else {
        // 正序：获取更早的消息，从 seq - 1 开始
        seq = +seq - 1
      }
    }

    while (count > 0) {
      const res = await this.getMessage(peer, count, payload.reverseOrder, seq)
      if (!res || res.length == 0) break
      
      // 根据 reverseOrder 决定下一次迭代的 seq 和消息添加方式
      if (payload.reverseOrder) {
        // 倒序：获取更新的消息，seq 向后迭代
        seq = res[res.length - 1].message_seq + 1
        messages.push(...res)
      } else {
        // 正序：获取更早的消息，seq 向前迭代
        seq = res[0].message_seq - 1
        messages.unshift(...res)
      }
      
      count -= res.list.length
    }

    return { messages }
  }
}

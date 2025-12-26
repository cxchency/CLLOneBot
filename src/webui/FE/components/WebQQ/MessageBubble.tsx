import React, { useState, useEffect, memo } from 'react'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import type { RawMessage } from '../../types/webqq'
import { formatMessageTime, getSelfUid, getSelfUin, getUserDisplayName } from '../../utils/webqqApi'
import { MessageElementRenderer, hasValidContent, isSystemTipMessage } from './MessageElements'

// 消息右键菜单上下文
export const MessageContextMenuContext = React.createContext<{
  showMenu: (e: React.MouseEvent, message: RawMessage) => void
} | null>(null)

// 头像右键菜单信息
export interface AvatarContextMenuInfo {
  x: number
  y: number
  senderUid: string
  senderUin: string
  senderName: string
  chatType: number
  groupCode?: string
}

// 头像右键菜单上下文
export const AvatarContextMenuContext = React.createContext<{
  showMenu: (e: React.MouseEvent, info: Omit<AvatarContextMenuInfo, 'x' | 'y'>) => void
} | null>(null)

// 跳转到消息上下文
export const ScrollToMessageContext = React.createContext<{
  scrollToMessage: (msgId: string, msgSeq?: string) => void
} | null>(null)

export interface TempMessage {
  msgId: string
  text?: string
  imageUrl?: string
  timestamp: number
  status: 'sending' | 'sent' | 'failed'
}

// 解析戳一戳 JSON 中的 items
const parseGrayTipItems = (message: RawMessage): { items: any[]; hasUid: boolean } | null => {
  for (const el of message.elements) {
    if (el.grayTipElement?.jsonGrayTipElement?.jsonStr) {
      try {
        const json = JSON.parse(el.grayTipElement.jsonGrayTipElement.jsonStr)
        if (json.items) {
          const hasUid = json.items.some((item: any) => item.type === 'qq' && item.uid)
          return { items: json.items, hasUid }
        }
      } catch {
        // ignore
      }
    }
  }
  return null
}

// 系统提示消息内容缓存
const systemTipContentCache = new Map<string, React.ReactNode>()

// 系统提示消息组件
const SystemTipMessage = memo<{ message: RawMessage; groupCode?: string }>(({ message, groupCode }) => {
  const cachedContent = systemTipContentCache.get(message.msgId)
  const [content, setContent] = useState<React.ReactNode>(cachedContent ?? '[系统提示]')
  const selfUid = getSelfUid()
  
  useEffect(() => {
    if (systemTipContentCache.has(message.msgId)) {
      setContent(systemTipContentCache.get(message.msgId)!)
      return
    }
    
    const parsed = parseGrayTipItems(message)
    if (!parsed) {
      for (const el of message.elements) {
        if (el.grayTipElement?.xmlElement?.content) {
          const xmlContent = el.grayTipElement.xmlElement.content.replace(/<[^>]+>/g, '')
          systemTipContentCache.set(message.msgId, xmlContent)
          setContent(xmlContent)
          return
        }
      }
      systemTipContentCache.set(message.msgId, '[系统提示]')
      setContent('[系统提示]')
      return
    }
    
    const { items, hasUid } = parsed
    
    if (!hasUid) {
      const result = items.map((item: any) => item.txt || '').join('')
      const finalContent = result || '[系统提示]'
      systemTipContentCache.set(message.msgId, finalContent)
      setContent(finalContent)
      return
    }
    
    const resolveContent = async () => {
      const parts: React.ReactNode[] = []
      let keyIndex = 0
      for (const item of items) {
        if (item.type === 'qq' && item.uid) {
          if (item.uid === selfUid) {
            parts.push(<span key={keyIndex++} className="text-blue-500">你</span>)
          } else {
            const name = await getUserDisplayName(item.uid, groupCode)
            parts.push(<span key={keyIndex++} className="text-blue-500">{name}</span>)
          }
        } else if (item.type === 'nor' && item.txt) {
          parts.push(<span key={keyIndex++}>{item.txt}</span>)
        }
      }
      const finalContent = parts.length > 0 ? parts : '[系统提示]'
      systemTipContentCache.set(message.msgId, finalContent)
      setContent(finalContent)
    }
    
    resolveContent()
  }, [message.msgId, selfUid, groupCode])
  
  return (
    <div className="flex justify-center py-2">
      <span className="text-xs text-theme-hint bg-theme-item/50 px-3 py-1 rounded-full">
        {content}
      </span>
    </div>
  )
})

export const RawMessageBubble = memo<{ message: RawMessage; allMessages: RawMessage[]; isHighlighted?: boolean }>(({ message, allMessages, isHighlighted }) => {
  if (isSystemTipMessage(message)) {
    const groupCode = message.chatType === 2 ? message.peerUin : undefined
    return <SystemTipMessage message={message} groupCode={groupCode} />
  }
  
  const selfUid = getSelfUid()
  const isSelf = selfUid ? message.senderUid === selfUid : false
  const senderName = message.sendMemberName || message.sendNickName || message.senderUin
  const senderAvatar = `https://q1.qlogo.cn/g?b=qq&nk=${message.senderUin}&s=640`
  const timestamp = parseInt(message.msgTime) * 1000
  const contextMenuContext = React.useContext(MessageContextMenuContext)
  const avatarContextMenuContext = React.useContext(AvatarContextMenuContext)
  const scrollToMessageContext = React.useContext(ScrollToMessageContext)
  
  if (!message.elements || !Array.isArray(message.elements)) return null

  const replyElement = message.elements.find(el => el.replyElement)?.replyElement
  const otherElements = message.elements.filter(el => !el.replyElement)
  
  const hasContent = otherElements.some(hasValidContent) || replyElement
  if (!hasContent) return null

  const replySourceMsg = replyElement ? allMessages.find(m => m.msgId === replyElement.replayMsgId || m.msgSeq === replyElement.replayMsgSeq) : null

  const handleBubbleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    contextMenuContext?.showMenu(e, message)
  }

  const handleAvatarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    avatarContextMenuContext?.showMenu(e, {
      senderUid: message.senderUid,
      senderUin: message.senderUin,
      senderName,
      chatType: message.chatType,
      groupCode: message.chatType === 2 ? message.peerUin : undefined
    })
  }

  const handleReplyClick = () => {
    if (replyElement) {
      scrollToMessageContext?.scrollToMessage(replyElement.replayMsgId, replyElement.replayMsgSeq)
    }
  }

  return (
    <div className={`flex gap-2 ${isSelf ? 'flex-row-reverse' : ''} ${isHighlighted ? 'animate-pulse bg-pink-100 dark:bg-pink-900/30 rounded-lg -mx-2 px-2' : ''}`}>
      <img 
        src={senderAvatar} 
        alt={senderName} 
        loading="lazy" 
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
        onContextMenu={handleAvatarContextMenu}
      />
      <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} max-w-[70%]`}>
        <span className="text-xs text-theme-hint mb-1">{senderName}</span>
        <div 
          className={`rounded-2xl px-4 py-2 min-w-[80px] break-all ${isSelf ? 'bg-pink-500 text-white rounded-br-sm' : 'bg-theme-item text-theme rounded-tl-sm shadow-sm'}`}
          onContextMenu={handleBubbleContextMenu}
        >
          {replyElement && (
            <div 
              className={`text-xs mb-2 pb-2 border-b cursor-pointer hover:opacity-80 transition-opacity ${isSelf ? 'border-pink-400/50' : 'border-theme-divider'}`}
              onClick={handleReplyClick}
            >
              <div className={`${isSelf ? 'bg-pink-400/30' : 'bg-theme-input'} rounded px-2 py-1`}>
                {replySourceMsg ? (
                  <div className="space-y-1">
                    <div className={`font-medium ${isSelf ? 'text-pink-100' : 'text-theme-secondary'}`}>
                      {replySourceMsg.sendMemberName || replySourceMsg.sendNickName || replySourceMsg.senderUin}:
                    </div>
                    <div className={`${isSelf ? 'text-pink-100' : 'text-theme-muted'}`}>
                      {replySourceMsg.elements?.filter(el => !el.replyElement).map((el, i) => (
                        <MessageElementRenderer key={i} element={el} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className={`${isSelf ? 'text-pink-100' : 'text-theme-muted'}`}>
                    {replyElement.sourceMsgText || '[消息]'}
                  </span>
                )}
              </div>
            </div>
          )}
          {otherElements.map((element, index) => <MessageElementRenderer key={index} element={element} message={message} />)}
        </div>
        <span className="text-xs text-theme-hint mt-1">{formatMessageTime(timestamp)}</span>
      </div>
    </div>
  )
})

export const TempMessageBubble = memo<{ message: TempMessage; onRetry: () => void }>(({ message, onRetry }) => {
  const selfUin = getSelfUin()
  const selfAvatar = selfUin ? `https://q1.qlogo.cn/g?b=qq&nk=${selfUin}&s=640` : ''
  
  return (
    <div className="flex gap-2 flex-row-reverse">
      {selfAvatar && <img src={selfAvatar} alt="我" loading="lazy" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />}
      <div className="flex flex-col items-end max-w-[70%]">
        <span className="text-xs text-theme-hint mb-1">我</span>
        <div className="flex items-end gap-1">
          {message.status === 'failed' && <button onClick={onRetry} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="重新发送"><RefreshCw size={14} /></button>}
          <div className="rounded-2xl px-4 py-2 bg-pink-500 text-white rounded-br-sm min-w-[80px] break-all">
            {message.text && <span className="whitespace-pre-wrap break-words">{message.text}</span>}
            {message.imageUrl && <img src={message.imageUrl} alt="图片" loading="lazy" className="max-w-full rounded-lg" style={{ maxHeight: '200px' }} />}
          </div>
          {message.status === 'sending' && <Loader2 size={14} className="animate-spin text-theme-hint" />}
          {message.status === 'failed' && <AlertCircle size={14} className="text-red-500" />}
        </div>
        <span className="text-xs text-theme-hint mt-1">{formatMessageTime(message.timestamp)}</span>
      </div>
    </div>
  )
})

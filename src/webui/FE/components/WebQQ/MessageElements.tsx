import React, { useState, memo } from 'react'
import { Loader2 } from 'lucide-react'
import type { MessageElement, RawMessage } from '../../types/webqq'
import { getToken } from '../../utils/api'

// 图片预览上下文
export const ImagePreviewContext = React.createContext<{
  showPreview: (url: string) => void
} | null>(null)

// 视频预览上下文
export const VideoPreviewContext = React.createContext<{
  showPreview: (chatType: number, peerUid: string, msgId: string, elementId: string) => void
} | null>(null)

export const getProxyImageUrl = (url: string | undefined): string => {
  if (!url) return ''
  if (url.startsWith('blob:')) return url
  if (url.includes('qpic.cn') || url.includes('multimedia.nt.qq.com.cn')) {
    return `/api/webqq/image-proxy?url=${encodeURIComponent(url)}&token=${encodeURIComponent(getToken() || '')}`
  }
  return url
}

export const MessageElementRenderer = memo<{ element: MessageElement; message?: RawMessage }>(({ element, message }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [videoThumbLoaded, setVideoThumbLoaded] = useState(false)
  const [videoThumbError, setVideoThumbError] = useState(false)
  const previewContext = React.useContext(ImagePreviewContext)
  const videoPreviewContext = React.useContext(VideoPreviewContext)
  
  if (element.textElement) return <span className="whitespace-pre-wrap break-words">{element.textElement.content}</span>
  if (element.picElement) {
    const pic = element.picElement
    let url = pic.originImageUrl ? (pic.originImageUrl.startsWith('http') ? pic.originImageUrl : `https://gchat.qpic.cn${pic.originImageUrl}`) : ''
    const proxyUrl = getProxyImageUrl(url)
    
    const maxHeight = 200
    const maxWidth = 300
    let displayWidth = pic.picWidth || 200
    let displayHeight = pic.picHeight || 200
    
    if (displayHeight > maxHeight) {
      displayWidth = (displayWidth * maxHeight) / displayHeight
      displayHeight = maxHeight
    }
    if (displayWidth > maxWidth) {
      displayHeight = (displayHeight * maxWidth) / displayWidth
      displayWidth = maxWidth
    }
    
    return (
      <div 
        className="relative rounded-lg overflow-hidden bg-theme-item cursor-pointer"
        style={{ width: displayWidth, height: displayHeight }}
        onClick={() => previewContext?.showPreview(proxyUrl)}
      >
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center text-theme-hint">
            <Loader2 size={24} className="animate-spin" />
          </div>
        )}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center text-theme-hint text-xs">
            图片加载失败
          </div>
        )}
        <img 
          src={proxyUrl} 
          alt="图片" 
          loading="lazy" 
          className={`w-full h-full object-cover transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      </div>
    )
  }
  if (element.faceElement) return <span>[表情]</span>
  if (element.fileElement) return <span>[文件: {element.fileElement.fileName}]</span>
  if (element.pttElement) return <span>[语音消息]</span>
  if (element.videoElement) {
    const video = element.videoElement
    const maxHeight = 200
    const maxWidth = 300
    let displayWidth = video.thumbWidth || 200
    let displayHeight = video.thumbHeight || 150
    
    if (displayHeight > maxHeight) {
      displayWidth = (displayWidth * maxHeight) / displayHeight
      displayHeight = maxHeight
    }
    if (displayWidth > maxWidth) {
      displayHeight = (displayHeight * maxWidth) / displayWidth
      displayWidth = maxWidth
    }
    
    let thumbUrl = ''
    if (video.thumbPath) {
      let firstThumb: string | undefined
      if (video.thumbPath instanceof Map) {
        firstThumb = video.thumbPath.values().next().value
      } else if (typeof video.thumbPath === 'object') {
        const values = Object.values(video.thumbPath as Record<string, string>)
        firstThumb = values[0]
      }
      if (firstThumb) {
        thumbUrl = `/api/webqq/file-proxy?path=${encodeURIComponent(firstThumb)}&token=${encodeURIComponent(getToken() || '')}`
      }
    }
    
    const duration = video.fileTime || 0
    const minutes = Math.floor(duration / 60)
    const seconds = duration % 60
    const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`
    
    const handleClick = () => {
      if (message && element.elementId) {
        videoPreviewContext?.showPreview(message.chatType, message.peerUid, message.msgId, element.elementId)
      }
    }
    
    return (
      <div 
        className="relative rounded-lg overflow-hidden bg-theme-item cursor-pointer group"
        style={{ width: displayWidth, height: displayHeight }}
        onClick={handleClick}
      >
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700" />
        
        {thumbUrl ? (
          <>
            {!videoThumbLoaded && !videoThumbError && (
              <div className="absolute inset-0 flex items-center justify-center text-theme-hint">
                <Loader2 size={24} className="animate-spin" />
              </div>
            )}
            <img 
              src={thumbUrl} 
              alt="视频缩略图" 
              loading="lazy" 
              className={`absolute inset-0 w-full h-full object-cover transition-opacity ${videoThumbLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setVideoThumbLoaded(true)}
              onError={() => setVideoThumbError(true)}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-theme-hint text-xs">
            视频
          </div>
        )}
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center group-hover:bg-black/70 transition-colors">
            <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1" 
                 style={{ borderLeftWidth: '14px' }} />
          </div>
        </div>
        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 rounded text-white text-xs">
          {durationStr}
        </div>
      </div>
    )
  }
  if (element.grayTipElement) {
    const grayTip = element.grayTipElement
    if (grayTip.jsonGrayTipElement?.jsonStr) {
      try {
        const json = JSON.parse(grayTip.jsonGrayTipElement.jsonStr)
        if (json.items) {
          const text = json.items.map((item: any) => item.txt || '').join('')
          return <span className="text-theme-hint text-xs">{text || '[戳一戳]'}</span>
        }
      } catch {
        // ignore
      }
    }
    return <span className="text-theme-hint text-xs">[系统提示]</span>
  }
  if (element.arkElement) return <span>[卡片消息]</span>
  if (element.marketFaceElement) return <span>[{element.marketFaceElement.faceName || '表情包'}]</span>
  return null
})

// 检查元素是否有有效内容
export const hasValidContent = (element: MessageElement): boolean => {
  return !!(
    element.textElement ||
    element.picElement ||
    element.fileElement ||
    element.pttElement ||
    element.videoElement ||
    element.faceElement ||
    element.grayTipElement ||
    element.arkElement ||
    element.marketFaceElement
  )
}

// 检查消息是否是系统提示（如戳一戳）
export const isSystemTipMessage = (message: RawMessage): boolean => {
  if (!message.elements || message.elements.length === 0) return false
  return message.elements.every(el => el.grayTipElement || el.replyElement)
}

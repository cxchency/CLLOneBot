import React, { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { ntCall } from '../../../utils/webqqApi'

export interface FavEmoji {
  emoId: number
  url: string
  desc: string
}

// 模块级缓存
let cachedEmojis: FavEmoji[] | null = null

const RECENT_FAV_EMOJI_KEY = 'webqq_recent_fav_emojis'
const MAX_RECENT = 10

function getRecentFavEmojis(): FavEmoji[] {
  try {
    const stored = localStorage.getItem(RECENT_FAV_EMOJI_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function addRecentFavEmoji(emoji: FavEmoji) {
  const recent = getRecentFavEmojis().filter(e => e.emoId !== emoji.emoId)
  recent.unshift(emoji)
  localStorage.setItem(RECENT_FAV_EMOJI_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

interface FavEmojiPickerProps {
  onSelect: (emoji: FavEmoji) => void
  onClose: () => void
}

export const FavEmojiPicker: React.FC<FavEmojiPickerProps> = ({ onSelect, onClose }) => {
  const [emojis, setEmojis] = useState<FavEmoji[]>(cachedEmojis || [])
  const [loading, setLoading] = useState(!cachedEmojis)
  const [error, setError] = useState<string | null>(null)
  const [recentEmojis, setRecentEmojis] = useState<FavEmoji[]>(getRecentFavEmojis())
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 如果有缓存，直接使用
    if (cachedEmojis) {
      setEmojis(cachedEmojis)
      setLoading(false)
      return
    }
    
    const loadEmojis = async () => {
      try {
        const result = await ntCall<{ emojiInfoList: any[] }>('ntMsgApi', 'fetchFavEmojiList', [1000])
        const list = result.emojiInfoList || []
        const emojiList = list.map(item => ({
          emoId: item.emoId,
          url: item.url,
          desc: item.desc || ''
        }))
        cachedEmojis = emojiList
        setEmojis(emojiList)
      } catch (e: any) {
        setError('加载失败')
      } finally {
        setLoading(false)
      }
    }
    loadEmojis()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleSelect = (emoji: FavEmoji) => {
    addRecentFavEmoji(emoji)
    setRecentEmojis(getRecentFavEmojis())
    onSelect(emoji)
  }

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-0 mb-2 bg-theme-card border border-theme-divider rounded-xl shadow-xl z-50 w-[320px]"
    >
      <div className="p-2 border-b border-theme-divider text-sm text-theme-secondary">收藏表情</div>
      <div className="p-2 max-h-[300px] overflow-y-auto">
        {recentEmojis.length > 0 && (
          <>
            <div className="text-xs text-theme-hint mb-1">最近使用</div>
            <div className="grid grid-cols-4 gap-1 mb-2 pb-2 border-b border-theme-divider">
              {recentEmojis.map((emoji) => (
                <button
                  key={`recent-${emoji.emoId}`}
                  onClick={() => handleSelect(emoji)}
                  className="p-1 rounded-lg hover:bg-theme-item transition-colors"
                  title={emoji.desc}
                >
                  <img src={emoji.url} alt={emoji.desc} className="w-16 h-16 object-contain" />
                </button>
              ))}
            </div>
          </>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-pink-500" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-theme-hint text-sm">{error}</div>
        ) : emojis.length === 0 ? (
          <div className="text-center py-8 text-theme-hint text-sm">暂无收藏表情</div>
        ) : (
          <>
            <div className="text-xs text-theme-hint mb-1">全部</div>
            <div className="grid grid-cols-4 gap-1">
              {emojis.map((emoji) => (
                <button
                  key={emoji.emoId}
                  onClick={() => handleSelect(emoji)}
                  className="p-1 rounded-lg hover:bg-theme-item transition-colors"
                  title={emoji.desc}
                >
                  <img
                    src={emoji.url}
                    alt={emoji.desc}
                    className="w-16 h-16 object-contain"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default FavEmojiPicker

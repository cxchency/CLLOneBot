import { Context, Service } from 'cordis'
import { GroupSimpleInfo } from '../types'

declare module 'cordis' {
  interface Context {
    groupCache: GroupCacheService
  }
}

interface GroupCacheEntry {
  groupName: string
  lastUpdated: number
}

export class GroupCacheService extends Service {
  private cache = new Map<string, GroupCacheEntry>()
  private readonly CACHE_EXPIRE_TIME = 10 * 60 * 1000 // 10分钟过期时间

  constructor(protected ctx: Context, name?: string) {
    super(ctx, 'groupCache', true)
  }

  /**
   * 获取群名称
   * @param groupCode 群号
   * @returns 群名称或undefined
   */
  getGroupName(groupCode: string): string | undefined {
    const cached = this.cache.get(groupCode)
    if (!cached) {
      return undefined
    }

    // 检查缓存是否过期
    const now = Date.now()
    if (now - cached.lastUpdated > this.CACHE_EXPIRE_TIME) {
      this.cache.delete(groupCode)
      return undefined
    }

    return cached.groupName
  }

  /**
   * 设置群名称缓存
   * @param groupCode 群号
   * @param groupName 群名称
   */
  setGroupName(groupCode: string, groupName: string): void {
    this.cache.set(groupCode, {
      groupName,
      lastUpdated: Date.now()
    })
  }

  /**
   * 批量更新群组缓存
   * @param groups 群组列表
   */
  updateGroups(groups: GroupSimpleInfo[]): void {
    const now = Date.now()
    for (const group of groups) {
      if (group.groupCode && group.groupName) {
        this.cache.set(group.groupCode, {
          groupName: group.groupName,
          lastUpdated: now
        })
      }
    }
  }

  /**
   * 清除缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存状态（用于调试）
   */
  getStats(): { size: number; entries: Array<{ groupCode: string; groupName: string; ageMinutes: number }> } {
    const now = Date.now()
    const entries = Array.from(this.cache.entries()).map(([groupCode, cache]) => ({
      groupCode,
      groupName: cache.groupName,
      ageMinutes: Math.floor((now - cache.lastUpdated) / 1000 / 60)
    }))

    return {
      size: this.cache.size,
      entries
    }
  }
}

import { BaseAction } from '../BaseAction'
import { ActionName } from '../types'

interface ReturnType {
  yes: boolean
}

export default class CanSendRecord extends BaseAction<{}, ReturnType> {
  actionName = ActionName.CanSendRecord

  protected async _handle() {
    return {
      yes: true,
    }
  }
}

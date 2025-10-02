export interface OnQRCodeLoginSucceedParameter {
  pngBase64QrcodeData: string, //data:image/png;base64,xxxxx
  qrcodeUrl: string,
  expireTime: number,  // 秒，120
  pollTimeInterval: number  // 2
}

export interface NodeIKernelLoginListener {
  onLoginConnected(): void

  onLoginDisConnected(...args: unknown[]): void

  onLoginConnecting(...args: unknown[]): void

  onQRCodeGetPicture(data: OnQRCodeLoginSucceedParameter): void

  onQRCodeLoginPollingStarted(...args: unknown[]): void

  onQRCodeSessionUserScaned(...args: unknown[]): void

  onLoginState(...args: unknown[]): void

  onQRCodeLoginSucceed(args: {
    account: string,
    mainAccount: string,
    uid: string,
    uin: string,
    nickName: string,
    gender: number,
    age: number,
    faceUrl: string
  }): void

  onQRCodeSessionFailed(...args: unknown[]): void

  onLoginFailed(...args: unknown[]): void

  onLogoutSucceed(...args: unknown[]): void

  onLogoutFailed(...args: unknown[]): void

  onQRCodeSessionQuickLoginFailed(...args: unknown[]): void

  onPasswordLoginFailed(...args: unknown[]): void

  OnConfirmUnusualDeviceFailed(...args: unknown[]): void

  onQQLoginNumLimited(...args: unknown[]): void

  onImportTicketsFromPCQQBegin(...args: unknown[]): void

  onImportTicketsFromPCQQEnd(...args: unknown[]): void

  onUnitedConfigUpdate(...args: unknown[]): void

  onUserLoggedIn(uin: string): void
}

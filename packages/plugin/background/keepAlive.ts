import Browser from 'webextension-polyfill'

let endTimeStamp: number
let keepAliveInterval: NodeJS.Timeout
export function keepAlive(ms: number) {
  endTimeStamp = Date.now() + ms
  clearInterval(keepAliveInterval)
  keepAliveInterval = setInterval(() => {
    if (Date.now() > endTimeStamp) {
      clearInterval(keepAliveInterval)
    }
    else {
      Browser.runtime.getPlatformInfo()
    }
  }, 20 * 1000)
}

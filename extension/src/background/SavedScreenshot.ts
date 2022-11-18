export default interface SavedScreenshot {
  html: string,
  parentUrl: string,
  winningBids: any,
  prebidWinningBids: any,
  bidResponses: any[],
  timestamp: Date,
  height: number,
  width: number,
  adRect: DOMRect,
  screenshot?: string,
  pixelRatio: number
}

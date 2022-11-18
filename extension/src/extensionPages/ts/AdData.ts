// Describes objects containing ad data stored in chrome.storage.local
export default interface AdData {
  screenshot: string,
  rect: DOMRect,
  height: number,
  width: number,
  html: string,
  pixelRatio: number,
  winningBidCpm?: number
}
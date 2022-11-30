// Interfaces for messages passed between the background script and content
// script.

export enum MessageType {
  SCREENSHOT = 'screenshot',
  MEASUREMENT_DONE = 'measurementDone',
  OPEN_INSTRUCTIONS = 'openInstructions',
  OPEN_STATUS = 'openStatus',
  REGISTER = 'register',
  MEASUREMENT_START = 'measurementStart',
  RELOAD_PAGE = 'reloadPage',
  SECOND_VISIT_CHECK = 'secondVisitCheck',
  PBJS_CALL = 'pbjsCall'
}

export interface ScreenshotRequest {
  type: MessageType.SCREENSHOT,
  adRect: DOMRect,
  html: string,
  height: number,
  width: number,
  parentUrl: string,
  winningBids: any,
  prebidWinningBids: any,
  bidResponses: any[],
  pixelRatio: number
}

export interface MeasurementDoneRequest {
  type: MessageType.MEASUREMENT_DONE,
  pageURL: string
}

export interface ReloadPageRequest {
  type: MessageType.RELOAD_PAGE
}

export interface SecondVisitCheckRequest {
  type: MessageType.SECOND_VISIT_CHECK,
  pageURL: string
}

export interface MeasurementStartRequest {
  type: MessageType.MEASUREMENT_START,
  pageURL: string,
  timestamp: number
}

export interface OpenInstructionsRequest {
  type: MessageType.OPEN_INSTRUCTIONS,
}

export interface OpenStatusRequest {
  type: MessageType.OPEN_STATUS,
}

export interface PBJSRequest {
  type: MessageType.PBJS_CALL,
  function: 'exists' | 'getBidResponses' | 'getAllPrebidWinningBids' | 'getAllWinningBids'
}

export interface BasicMessage {
  type: MessageType
}

export interface BasicResponse {
  success: boolean;
  error?: any;
  message?: any;
}

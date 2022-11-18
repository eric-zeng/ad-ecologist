// This is the interface for the event populated by both
// webRequest.onBeforeSendHeaders and webRequest.onCompleted
export default interface RequestEvent {
  top_url: string,  // url of the page the event was measured on
  request_url: string,
  request_id: string,
  referer_url?: string | null,
  window_type: string,
  response_time?: number,
  response_headers?: chrome.webRequest.HttpHeader[],
  response_code?: number,
  resource_type: string,
  method: string,
  request_time?: number,
  request_headers?: chrome.webRequest.HttpHeader[]
}
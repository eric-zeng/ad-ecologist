import { v4 as uuid } from 'uuid';
import * as messages from '../common/messages';
// import RequestEvent from './RequestEvent';
// import ProgrammaticCookieEvent from './ProgrammaticCookieEvent'
import * as chromePromise from '../common/chromePromise';
import {allowParticipantsToReviewAds, restrictToAllowList, reviewOnAllowListComplete, serverUrl, siteScrapeLimit} from '../config';

////////////////////////////////////////////////////////////////////////////////
// Event Listener Registration
////////////////////////////////////////////////////////////////////////////////

// On install, open the registration page.
chrome.runtime.onInstalled.addListener(async function () {
  chrome.tabs.create({ url: chrome.runtime.getURL('register.html') });

  const res = await fetch(chrome.runtime.getURL('siteAllowList.json'));
  const siteAllowList = await res.json();

  // Initialize siteStatus object in storage
  let siteStatus: {[url: string]: number} = {};

  if (restrictToAllowList) {
    for (let site of siteAllowList) {
      siteStatus[site] = 0;
    }
  }
  chrome.storage.local.set({
    siteStatus: siteStatus,
    randomSeed: Math.floor(Math.random() * 1000000)
  });
});

// Collect web request metadata for tracking detection
// chrome.webRequest.onBeforeSendHeaders.addListener(
//   handleOnBeforeSendHeaders,
//   { urls: ["<all_urls>"] },
//   ['extraHeaders', 'requestHeaders']);

// chrome.webRequest.onCompleted.addListener(
//   handleOnCompleted,
//   { urls: ["<all_urls>"] },
//   ['extraHeaders', 'responseHeaders']);


// clean up when user navigates or reloads page
// chrome.webNavigation.onCommitted.addListener(handleTabNavigation);

// clean up when tab closes
// chrome.tabs.onRemoved.addListener(handleTabClose);

// // Set up action UI to show instructions for user
chrome.action.onClicked.addListener((tab) => {
  openStatusPage();
});

// Handle various messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(message.type);
  switch (message.type) {
    case messages.MessageType.SCREENSHOT:
      handleScreenshotRequest(message, sender, sendResponse);
      break;
    case messages.MessageType.OPEN_INSTRUCTIONS:
      openInstructionsPage();
      sendResponse({ success: true });
      break;
    case messages.MessageType.OPEN_STATUS:
      openStatusPage();
      sendResponse({ success: true });
      break;
    // case messages.MessageType.PROGRAMMATIC_COOKIE:
    //   handleProgrammaticCookieEvent(message, sender, sendResponse);
    //   break;
    case messages.MessageType.MEASUREMENT_DONE:
      handleMeasurementDone(message, sender, sendResponse);
      break;
    case messages.MessageType.MEASUREMENT_START:
      handleMeasurementStart(message, sender, sendResponse);
      break;
    // case messages.MessageType.RELOAD_PAGE:
    //   handleReloadPage(message, sender, sendResponse);
    // case messages.MessageType.SECOND_VISIT_CHECK:
    //   handleSecondVisitCheck(message, sender, sendResponse);
  }

  // make listener asynchronous so message response can be returned later
  return true;
});

// Listen for changes in siteStatus, trigger changes with certain flags on.
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== 'local' || !('siteStatus' in changes)) {
    return;
  }
  const siteStatus = await getSiteStatus();
  if (allowParticipantsToReviewAds && reviewOnAllowListComplete && restrictToAllowList && siteScrapeLimit != -1) {
    if (Object.values(siteStatus).every(visited => visited == siteScrapeLimit)) {
      chrome.tabs.create({ url: chrome.runtime.getURL('approveAds.html') });
    }
  }
});

////////////////////////////////////////////////////////////////////////////////
// Tracking Detection
////////////////////////////////////////////////////////////////////////////////

// // collection of request/response info in the form url -> requestId -> event info
// // siteUrlTabID is a combo string of ${siteURL} + ${tabID}
// let eventsBatch: { [siteUrlTabID: string]: { [reqId: string]: RequestEvent } } = {};
// let cookieBatch: { [siteUrlTabID: string]: ProgrammaticCookieEvent[] } = {};
// // let sitesFinished = new Set<string>();  // adds when we get a message in content script as done

/**
 * Pick out all valid web response events from a page that just finished
 * @param siteURL
 */
 async function processMeasurementStart(siteURL: string, tabID: number, timestamp: number) {
  // check events dict and add response event to table
  // by iterating through request ids
  console.log(`Creating new page load id`);
  let pageLoadID = uuid();
  // overwrites if a page was refreshed
  pageLoadIDs[multikey(siteURL, tabID)] = pageLoadID;
  // send message to stop iterating for previous tab id
  await addMeasurementStartToTable(siteURL, pageLoadID, timestamp);
}

// async function handleOnCompleted(details: chrome.webRequest.WebResponseCacheDetails) {
//   if (details.tabId < 0) {
//     return;
//   }

//   let tab : chrome.tabs.Tab;
//   try {
//     tab = await chromePromise.tabs.get(details.tabId);
//   } catch(e) {
//     // If the request headers come in after the tab was closed, exit early,
//     // there's nothing we can do to get the tab info we need.
//     return;
//   }

//   if (!tab || !tab.url || !tab.id) {
//     return;
//   }
//   let tabURL = tab.url;

//   let window : chrome.windows.Window;
//   try {
//     window = await chromePromise.windows.get(tab.windowId);
//   } catch(e) {
//     // If the window is closed, we should also exit early.
//     return;
//   }

//   let tabId = tab.id;

//   // const siteStatus = await getSiteStatus();

//   // check if tab id is the same tab id of a site we're analyzing
//   // and that we're not already done
//   // if (siteStatus[tabURL] < 2) {
//     let rId = details.requestId;
//     // info for responses that we want to collect
//     let eventInfo: RequestEvent = {
//       "referer_url": details.initiator,
//       "window_type": window.type,
//       "top_url": tabURL,
//       "request_url": details.url,
//       "resource_type": details.type,
//       "method": details.method,
//       "response_time": details.timeStamp,
//       "response_headers": details.responseHeaders,
//       "response_code": details.statusCode,
//       "request_id": rId
//     };

//     let mkey = multikey(tabURL, tabId);
//     // add to existing requestId info it exists, otherwise initialize
//     if (!(mkey in eventsBatch)) {
//       eventsBatch[mkey] = {};
//     }
//     if (!(rId.toString() in eventsBatch[mkey])) {
//       eventsBatch[mkey][rId] = eventInfo;
//     } else {
//       let merged = { ...eventsBatch[mkey][rId], ...eventInfo };
//       eventsBatch[mkey][rId] = merged;
//     }
//   // }
// }

// function handleOnBeforeSendHeaders(details: chrome.webRequest.WebRequestHeadersDetails) {
//   // Wrap in an anonymous async function because we are not in "blocking" mode,
//   // but the TypeScript definition assumes that we are, and will
//   // not take a Promise return value.
//   (async function() {
//     if (details.tabId < 0) {
//       return;
//     }
//     let tab : chrome.tabs.Tab;
//     try {
//       tab = await chromePromise.tabs.get(details.tabId);
//     } catch (e) {
//       // If the request headers come in after the tab was closed, exit early,
//       // there's nothing we can do to get the tab info we need.
//       return;
//     }
//     if (!tab || !tab.url || !tab.id) {
//       return;
//     }
//     let tabURL = tab.url;
//     let tabId = tab.id;

//     let window : chrome.windows.Window;
//     try {
//       window = await chromePromise.windows.get(tab.windowId);
//     } catch(e) {
//       return; // If the window is closed, early exit again.
//     }

//     // const siteStatus = await getSiteStatus();

//     // check if tab id is the same tab id of a site we're analyzing
//     // and that we're not already done
//     // if (siteStatus[tabURL] < 2) {
//       let rId = details.requestId;
//       let refererUrl = getValueFromDictionaryArray(details.requestHeaders, "Referer");
//       let eventInfo: RequestEvent = {
//         "referer_url": refererUrl,
//         "window_type": window.type,
//         "top_url": tabURL,
//         "request_url": details.url,
//         "resource_type": details.type,
//         "method": details.method,
//         "request_time": details.timeStamp,
//         "request_headers": details.requestHeaders,
//         "request_id": rId
//       };

//       let mkey = multikey(tabURL, tabId);

//       // add to existing requestId info it exists, otherwise initialize
//       if (!(mkey in eventsBatch)) {
//         eventsBatch[mkey] = {};
//       }
//       if (!(rId.toString() in eventsBatch[mkey])) {
//         eventsBatch[mkey][rId] = eventInfo;
//       } else {
//         let merged = { ...eventsBatch[mkey][rId], ...eventInfo };
//         eventsBatch[mkey][rId] = merged;
//       }
//     }
//   })();
// }

// /**
//  * Cleans up events in our data structures, from a specific tab+url combination
//  * @param url
//  * @param tabId
//  */
//  function cleanUpEvents(url: string, tabId: number) {
//   let mkey = multikey(url, tabId);
//   if (mkey in eventsBatch) {
//     delete eventsBatch[mkey];
//   }
//   if (mkey in cookieBatch) {
//     delete eventsBatch[mkey];
//   }
//   if (mkey in pageLoadIDs) {
//     delete pageLoadIDs[mkey];
//   }
// }

// // Clean up events when a tab navigates
// async function handleTabNavigation(
//     details: chrome.webNavigation.WebNavigationTransitionCallbackDetails) {
//   // No-op if it's a subframe navigation
//   if (details.frameId != 0) {
//     return;
//   }
//   let tab : chrome.tabs.Tab;
//   try {
//     tab = await chromePromise.tabs.get(details.tabId);
//   } catch(e) {
//     // If we can't get the tab, it's been closed - exit early and let
//     // onRemoved handle clean up.
//     return;
//   }
//   if (!tab || !tab.url || !tab.id) {
//     return;
//   }
//   cleanUpEvents(tab.url, tab.id);
// }

// // Clean up events when a tab closes
// async function handleTabClose(
//     tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) {
//   // chrome.tabs.onRemoved does not tell us the last URL of the closed tab, so
//   // we must check all URLs from this tab.
//   const siteStatus = await getSiteStatus();
//   for (let k of Object.keys(siteStatus)) {
//     cleanUpEvents(k, tabId);
//   }
// }

// // Helper function for parsing request/response headers
// function getValueFromDictionaryArray(array: chrome.webRequest.HttpHeader[] | undefined, key: string) {
//   if (key === undefined) {
//     return null;
//   }
//   if (array === undefined) {
//     return null;
//   }
//   for (var i = 0; i < array.length; i += 1) {
//     var item = array[i];

//     if (item.name === key)
//       return item.value;
//   }
//   return null; // key not found in array
// }


////////////////////////////////////////////////////////////////////////////////
// Content Script Message Handlers
////////////////////////////////////////////////////////////////////////////////

// async function handleProgrammaticCookieEvent(
//     message: messages.ProgrammaticCookieRequest,
//     sender: chrome.runtime.MessageSender,
//     sendResponse: (response: messages.BasicResponse) => void) {

//   const siteStatus = await getSiteStatus();

//   if (siteStatus[message.url] >= 2) {
//     sendResponse({ success: true });
//     return;
//   }
//   try {
//     const tab = sender.tab;
//     if (!tab) {
//       return;
//     }

//     let tabId : number = chrome.tabs.TAB_ID_NONE;
//     if (tab.id) {
//       tabId = tab.id;
//     }

//     const cookieInfo: ProgrammaticCookieEvent = {
//       "top_url": message.url,
//       "setting_script_url": message.scriptURL,
//       "cookie_string": message.cookieString,
//       "timestamp": message.timestamp
//     }
//     let mkey = multikey(message.url, tabId);

//     if (!(mkey in cookieBatch)) {
//       cookieBatch[mkey] = [];
//     }
//     cookieBatch[mkey].push(cookieInfo);
//     sendResponse({ success: true });
//   } catch (e) {
//     console.error(e);
//     sendResponse({ success: false, error: e });
//   }
// }

/**
 * Handle a screenshot request from the content script, by taking a screenshot,
 * and storing the image and metadata in localForage.
 * @param message
 * @param sender
 * @param sendResponse
 */
async function handleScreenshotRequest(
  message: messages.ScreenshotRequest,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void) {
  if (!sender.tab) {
    console.error('No tab associated with screenshot request');
    sendResponse({
      success: false,
      error: 'No tab associated with screenshot request'
    });
    return;
  }
  if (!sender.tab.id) {
    console.error('Tab associated with screenshot request has no id');
    sendResponse({
      success: false,
      error: 'Tab associated with screenshot request has no id'
    });
    return;
  }

  const tabId = sender.tab.id;
  const windowId = sender.tab.windowId;

  // Make the tab active if it currently is not the active tab
  if (!sender.tab.active) {
    try {
      await chromePromise.tabs.update(tabId, { active: true });
    } catch (e) {
      console.error('Could not refocus tab');
      console.error(e);
      sendResponse({ success: false, error: e });
      return; // if tab closed an no longer exists, no screenshot
    }
  }

  // Take screenshot
  let screenshot: string;
  try {
    screenshot = await chromePromise.tabs.captureVisibleTab(windowId);
  } catch (e) {
    console.error('Could not screenshot tab');
    console.error(e);
    sendResponse({ success: false, error: e });
    return;  // exit if screenshot request tab no longer exists
  }

  let eID: string;
  try {
    eID = (await chromePromise.storage.local.get('extension_id')).extension_id;
  } catch(e) {
    console.error('Could not get extension id from storage.');
    console.error(e);
    sendResponse({ success: false, error: e });
    return;
  }

  let data: any = {
    parentUrl: message.parentUrl,
    winningBids: message.winningBids,
    prebidWinningBids: message.prebidWinningBids,
    bidResponses: message.bidResponses,
    timestamp: new Date()
  }

  if (!allowParticipantsToReviewAds) {
    data = {
      ...data,
      html: message.html,
      adRect: message.adRect,
      height: message.height,
      width: message.width,
      screenshot: screenshot
    }
  }

  const response = await fetch(`${serverUrl}/ad_data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      'data': data,
      'eID': eID,
      'pageLoadID': pageLoadIDs[multikey(message.parentUrl, tabId)]
    })
  });

  if (!response.ok) {
    console.error(`Network error: ${response.status} ${response.statusText}`);
    sendResponse({ success: false, error: `Network error: ${response.status} ${response.statusText}`});
    return;
  }

  // Save ad -> screenshot mapping in storage
  const adId = (await response.json()).adId as number;
  const savedAds = (await chromePromise.storage.local.get('savedAds')).savedAds;
  let adIdList: string[];
  if (savedAds && savedAds.adIds) {
    adIdList = Array.from(savedAds.adIds);
    adIdList.push(adId.toString());
  } else {
    adIdList = [adId.toString()];
  }
  await chromePromise.storage.local.set({
    [adId.toString()]: {
      html: message.html,
      screenshot: screenshot,
      rect: message.adRect,
      height: message.height,
      width: message.width,
      pixelRatio: message.pixelRatio,
      winningBidCpm: message.winningBids?.cpm
    },
    savedAds: { adIds: adIdList }
  });

  sendResponse({ success: true });
}

async function handleMeasurementDone(
    message: messages.MeasurementDoneRequest,
    sender: chrome.runtime.MessageSender,
    sendResponse:(message: messages.BasicResponse) => void) {

  const siteStatus = await getSiteStatus();

  // // only process events if valid site and hasn't been done already
  // if (siteStatus[message.pageURL] >= 1) {
  //   sendResponse({ success: true });
  //   return;
  // }

  // if (!sender.tab || !sender.tab.id) {
  //   console.error('No tab associated with MEASUREMENT_DONE event');
  //   sendResponse({
  //     success: false,
  //     error: 'No tab associated with MEASUREMENT_DONE event'
  //   });
  //   return;
  // }

  // try {
  //   // add the current dictionary batch and send request
  //   // so that we can process all events in dictionary for
  //   // given site
  //   await addResponseEventsToTable(message.pageURL, sender.tab.id);
  // } catch (e) {
  //   console.log(e);
  //   console.error('Failed to upload events data');
  //   sendResponse({
  //     success: false,
  //     error: 'Error uploading events data'
  //   });
  //   return;
  // }

  // Mark site by number of completed
  if (!restrictToAllowList && !siteStatus[message.pageURL]) {
    siteStatus[message.pageURL] = 0;
  }

  siteStatus[message.pageURL] += 1;
  await chromePromise.storage.local.set({ siteStatus: siteStatus });

  sendResponse({ success: true });
}

async function handleMeasurementStart(
  message: messages.MeasurementStartRequest,
  sender: chrome.runtime.MessageSender, sendResponse:
    (message: messages.BasicResponse) => void) {

  if (!sender.tab) {
    console.error('No tab associated with page load');
    sendResponse({
      success: false,
      error: 'No tab associated with page load'
    });
    return;
  }
  if (!sender.tab.id) {
    console.error('Tab associated with page load has no id');
    sendResponse({
      success: false,
      error: 'Tab associated with page load has no id'
    });
    return;
  }
  const tabId = sender.tab.id;

  // upon new page load, associate page with url and tabid
  processMeasurementStart(message.pageURL, tabId, message.timestamp);

  // add the current dictionary batch and send request
  // so that we can process all events in dictionary for
  // given site
  sendResponse({ success: true });
}

async function handleReloadPage(
  message: messages.MeasurementStartRequest,
  sender: chrome.runtime.MessageSender, sendResponse:
    (message: messages.BasicResponse) => void) {

  if (!sender.tab) {
    console.error('No tab associated with page load');
    sendResponse({
      success: false,
      error: 'No tab associated with page load'
    });
    return;
  }
  if (!sender.tab.id) {
    console.error('Tab associated with page load has no id');
    sendResponse({
      success: false,
      error: 'Tab associated with page load has no id'
    });
    return;
  }
  const tabId = sender.tab?.id;
  chrome.tabs.reload(tabId);

  sendResponse({ success: true });
}

// async function handleSecondVisitCheck(
//   message: messages.SecondVisitCheckRequest,
//   sender: chrome.runtime.MessageSender, sendResponse:
//   (message: messages.BasicResponse) => void) {
//     const siteStatus = await getSiteStatus();

//     // on the second load if already visited once
//     let isSecond = (siteStatus[message.pageURL] === 1);
//     sendResponse({success: true, message: isSecond});
// }


////////////////////////////////////////////////////////////////////////////////
// Server Communication
////////////////////////////////////////////////////////////////////////////////

// maps siteUrl and tab id to given unique page load id
let pageLoadIDs : {[siteUrlTabID: string] : string } = {};

// /**
//  * Collect info on web event and send to server
//  * @param siteURL url the events take place on
//  */
//  async function addResponseEventsToTable(siteURL : string, tabID: number) {
//   let mkey = multikey(siteURL, tabID);

//   let eID;
//   try {
//     eID = (await chromePromise.storage.local.get('extension_id')).extension_id;
//   } catch (e) {
//     console.error('Could not get extension ID from storage');
//     console.error(e);
//     return;
//   }

//   try {
//     await fetch(`${serverUrl}/request_event_data`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({
//         'data': Object.values(eventsBatch[mkey]),
//         'pageLoadID': pageLoadIDs[mkey],
//         'eID': eID
//       })
//     });
//     // don't want to overpopulate dict, so delete the finished site
//     // and its associated requests from the background script
//     delete eventsBatch[mkey];
//   } catch (e) {
//     console.log(e);
//   }

//   try {
//     const cookies = cookieBatch[mkey];
//     await fetch(`${serverUrl}/cookie_event_data`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({
//         'data': cookies ? cookies : [],
//         'pageLoadID': pageLoadIDs[mkey],
//         'eID': eID
//       })
//     });
//     delete cookieBatch[mkey];
//   } catch (e) {
//     console.log(e);
//   }
// }

/**
 * Send page load info to server
 * @param siteURL url the events take place on
 */
 async function addMeasurementStartToTable(siteURL: string, pageLoadID: string, timestamp: number) {
  let eID;
  try {
    eID = (await chromePromise.storage.local.get('extension_id')).extension_id;
  } catch(e) {
    console.error('Could not get extension ID from storage');
    console.error(e);
    return;
  }

  // Get the number of times the page has been scraped previously.
  const siteStatus = await getSiteStatus();

  let curLoad: number;
  if (!restrictToAllowList && !siteStatus[siteURL]) {
    curLoad = 1;
  } else {
    curLoad = siteStatus[siteURL] + 1;
  }

  // first, we have to add page url with eID to the pages database
  try {
    await fetch(`${serverUrl}/log_page_data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        'pageURL': siteURL,
        'eID': eID,
        'pageLoadID': pageLoadID,
        'timestamp': timestamp,
        'curLoad': curLoad
      })
    });
  } catch (e) {
    console.log(e);
  }
}

function multikey(siteURL : string, tabID : number) {
  return siteURL + tabID.toString();
}


////////////////////////////////////////////////////////////////////////////////
// User Facing Functionality
////////////////////////////////////////////////////////////////////////////////
function openStatusPage() {
  try {
    return chromePromise.tabs.create({ url: chrome.runtime.getURL('status.html') });
  } catch (e) {
    console.error(e);
  }
}

function openInstructionsPage() {
  try {
    return chromePromise.tabs.create({ url: chrome.runtime.getURL('intro.html') });
  } catch (e) {
    console.error(e);
  }
}

async function getSiteStatus() {
  const getResult = await chromePromise.storage.local.get('siteStatus');
  if (!getResult.siteStatus) {
    throw new Error(`siteStatus doesn't exist in chrome.storage.local`);
  }
  return getResult.siteStatus as {[url: string]: number};
}
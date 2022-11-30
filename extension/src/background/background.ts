import { v4 as uuid } from 'uuid';
import * as messages from '../common/messages';
import {allowParticipantsToReviewAds, restrictToAllowList, reviewAdsOnComplete, serverUrl, siteScrapeLimit, surveyOnComplete} from '../config';

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
    case messages.MessageType.MEASUREMENT_DONE:
      handleMeasurementDone(message, sender, sendResponse);
      break;
    case messages.MessageType.MEASUREMENT_START:
      handleMeasurementStart(message, sender, sendResponse);
      break;
    case messages.MessageType.PBJS_CALL:
      handlePBJSCall(message, sender, sendResponse);
      break;
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

  if (restrictToAllowList && siteScrapeLimit != -1) {
    if (Object.values(siteStatus).every(visited => visited == siteScrapeLimit)) {
      if (surveyOnComplete) {
        chrome.tabs.create({ url: chrome.runtime.getURL('relevanceSurvey.html') });
        return;
      }
      if (allowParticipantsToReviewAds && reviewAdsOnComplete) {
        chrome.tabs.create({ url: chrome.runtime.getURL('approveAds.html') });
        return;
      }
    }
  }
});

////////////////////////////////////////////////////////////////////////////////
// Tracking Detection
////////////////////////////////////////////////////////////////////////////////

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

////////////////////////////////////////////////////////////////////////////////
// Content Script Message Handlers
////////////////////////////////////////////////////////////////////////////////

function getTabFromSender(sender: chrome.runtime.MessageSender):
    [chrome.tabs.Tab, number] {
  if (!sender.tab) {
    throw new Error('No tab associated with runtime message');
  }
  if (!sender.tab.id) {
    throw new Error('No tab id associated with runtime message');
  }

  return [sender.tab, sender.tab.id];
}

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
    sendResponse: (response?: messages.BasicResponse) => void) {

  let tab: chrome.tabs.Tab;
  let tabId: number;
  try {
    [tab, tabId] = getTabFromSender(sender);
  } catch {
    sendResponse({
      success: false,
      error: 'No tab associated with ScreenshotRequest message'
    });
    return;
  }

  const windowId = tab.windowId;

  // Make the tab active if it currently is not the active tab
  if (!tab.active) {
    try {
      await chrome.tabs.update(tabId, { active: true });
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
    screenshot = await chrome.tabs.captureVisibleTab(windowId);
  } catch (e) {
    console.error('Could not screenshot tab');
    console.error(e);
    sendResponse({ success: false, error: e });
    return;  // exit if screenshot request tab no longer exists
  }

  let eID: string;
  try {
    eID = (await chrome.storage.local.get('extension_id')).extension_id;
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
  const savedAds = (await chrome.storage.local.get('savedAds')).savedAds;
  let adIdList: string[];
  if (savedAds && savedAds.adIds) {
    adIdList = Array.from(savedAds.adIds);
    adIdList.push(adId.toString());
  } else {
    adIdList = [adId.toString()];
  }
  await chrome.storage.local.set({
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

  // Mark site by number of completed
  if (!restrictToAllowList && !siteStatus[message.pageURL]) {
    siteStatus[message.pageURL] = 0;
  }

  siteStatus[message.pageURL] += 1;
  await chrome.storage.local.set({ siteStatus: siteStatus });

  sendResponse({ success: true });
}

async function handleMeasurementStart(
  message: messages.MeasurementStartRequest,
  sender: chrome.runtime.MessageSender, sendResponse:
    (message: messages.BasicResponse) => void) {

  let tab: chrome.tabs.Tab;
  let tabId: number;
  try {
    [tab, tabId] = getTabFromSender(sender);
  } catch {
    sendResponse({
      success: false,
      error: 'No tab associated with PBJSRequest message'
    });
    return;
  }

  // upon new page load, associate page with url and tabid
  processMeasurementStart(message.pageURL, tabId, message.timestamp);

  // add the current dictionary batch and send request
  // so that we can process all events in dictionary for
  // given site
  sendResponse({ success: true });
}

async function handlePBJSCall(
    message: messages.PBJSRequest,
    sender: chrome.runtime.MessageSender,
    sendResponse: (message: messages.BasicResponse) => void) {

  let tab: chrome.tabs.Tab;
  let tabId: number;
  try {
    [tab, tabId] = getTabFromSender(sender);
  } catch {
    sendResponse({
      success: false,
      error: 'No tab associated with PBJSRequest message'
    });
    return;
  }

  let results;
  if (message.function === 'exists') {
    results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      func: checkIfPbjsExists
    });
  } else {
    results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      func: callPbjsFunction,
      args: [message.function]
    });
  }
  if (results[0].result instanceof Error) {
    sendResponse({
      success: false,
      error: results[0].result.message
    })
  } else {
    sendResponse({
      success: true,
      message: results[0].result
    });
  }
}

function checkIfPbjsExists() {
  try {
    // @ts-ignore
    return !(typeof pbjs === 'undefined' || pbjs.getAllWinningBids === undefined);
  } catch (e) {
    return e;
  }
}

function callPbjsFunction(functionName: string) {
  try {
    // @ts-ignore
    return pbjs[functionName]();
  } catch (e) {
    return e;
  }
}


////////////////////////////////////////////////////////////////////////////////
// Server Communication
////////////////////////////////////////////////////////////////////////////////

// maps siteUrl and tab id to given unique page load id
let pageLoadIDs : {[siteUrlTabID: string] : string } = {};

/**
 * Send page load info to server
 * @param siteURL url the events take place on
 */
 async function addMeasurementStartToTable(siteURL: string, pageLoadID: string, timestamp: number) {
  let eID;
  try {
    eID = (await chrome.storage.local.get('extension_id')).extension_id;
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
    return chrome.tabs.create({ url: chrome.runtime.getURL('status.html') });
  } catch (e) {
    console.error(e);
  }
}

function openInstructionsPage() {
  try {
    return chrome.tabs.create({ url: chrome.runtime.getURL('intro.html') });
  } catch (e) {
    console.error(e);
  }
}


////////////////////////////////////////////////////////////////////////////////
// Helpers
////////////////////////////////////////////////////////////////////////////////

async function getSiteStatus() {
  const getResult = await chrome.storage.local.get('siteStatus');
  if (!getResult.siteStatus) {
    throw new Error(`siteStatus doesn't exist in chrome.storage.local`);
  }
  return getResult.siteStatus as {[url: string]: number};
}

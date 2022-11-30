import React from 'react';
import ReactDOM from 'react-dom';
import * as messages from "../common/messages";
import * as pbjsAdapter from './pbjsAdapter';
import Popup, { PopupStage } from './popup';
import PopupStyles from './popup.css';
import * as chromePromise from '../common/chromePromise';
import { promptBeforeScraping, restrictToAllowList, showAdBoundingBox, siteScrapeLimit } from '../config';

////////////////////////////////////////////////////////////////////////////////
// Helper Functions
////////////////////////////////////////////////////////////////////////////////

/**
 * Helper function - asynchronous version of sleep, using setTimeout.
 * @param ms
 */
function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Detects whether a given HTML Element is currently fully visible in the
 * viewport.
 * @param element HTML Element to check
 */
function elementIsInViewport(element: Element) {
  const rect = element.getBoundingClientRect();
  return rect.top >= 0 &&
         rect.left >= 0 &&
         rect.bottom <= window.innerHeight &&
         rect.right <= window.innerWidth &&
         rect.height > 5 &&
         rect.width > 5;
}

/**
 * Applies a 2px solid red border to the given set of elements, used to
 * help visually debug if ads are being detected.
 * @param ads Set of HTML Elements representing the ads to highlight with
 * red borders.
 */
function applyAdsDebugOutline(ads: Set<Element>) {
  const htmlAds = ads as Set<HTMLElement>;
  htmlAds.forEach(ad => {
    if (ad.style) {
      ad.style.border = '2px solid red';
    }
  });
}

////////////////////////////////////////////////////////////////////////////////
// Ad Detection
////////////////////////////////////////////////////////////////////////////////

/**
 * Loads CSS selectors for ads from JSON files in the extension folder
 * into this script, and returns them as a JavaScript array.
 * @return An array of CSS selectors that will match ads.
 */
async function getSelectors() {
  const selectorsUrl = chrome.runtime.getURL('easylist_selectors.json');

  const selectorsRes = await fetch(selectorsUrl);
  const selectors = await selectorsRes.json() as string[];

  const manualSelectorsUrl = chrome.runtime.getURL('manual_selectors.json');

  const manualRes = await fetch(manualSelectorsUrl);
  const manual = await manualRes.json() as string[];

  return selectors.concat(manual);
}

/**
 * Detects ads using the provided list of CSS selectors.
 * @param selectors An array of CSS selectors that will match ads.
 * @return A Set of HTML Elements that match the input selectors.
 */
function detectAds(selectors: string[]) {
  let ads = new Set(selectors
      .map(s => Array.from(document.querySelectorAll(s)))
      .filter(a => a.length > 0)
      .flat());

  for (let ad of ads) {
    // For each element in the set, traverse up until it hits <body>, or another
    // element in the set.
    let removed = false;
    let current = ad;
    while (current !== document.body && current.parentElement !== null) {
      current = current.parentElement;
      for (let otherAd of ads) {
        if (current === otherAd) {
          ads.delete(ad);
          removed = true;
          break;
        }
      }
      if (removed) {
        break;
      }
    }
  }
  return new Set<Element>(ads);
}

////////////////////////////////////////////////////////////////////////////////
// Programmatic Cookie Modification Detection
////////////////////////////////////////////////////////////////////////////////

// Monkeypatch document.cookie
// (a real pain due to the above referenced Chrome bug... need to send updated
// cookies to background script to actually set them in Chrome's cookie store,
// and need to keep current cookies in page to make them accessible via JavaScript)

// let monkeypatchCookieCode =
//   // Need to inject stack trace into page
//   // checking when cookies are set
//   // Inspects the call stack, and notifies the background script of a possible category A tracking situation.
//   `function inspectStackA() {
//     let callstack = [];
//     let uri_pattern = /\\b((?:[a-z][\\w-]+:(?:\\/{1,3}|[a-z0-9%])|www\\d{0,3}[.]|[a-z0-9.\\-]+[.][a-z]{2,4}\\/)(?:[^\\s()<>]+|\\(([^\\s()<>]+|(\\([^\\s()<>]+\\)))*\\))+(?:\\(([^\\s()<>]+|(\\([^\\s()<>]+\\)))*\\)|[^\\s\`!()\\[\\]{};:'".,<>?������]))/ig;
//     let isCallstackPopulated = false;
//     try {
//       // @ts-ignore
//       i.dont.exist += 0; // Will cause exception
//     } catch (e) {
//       let urls = e.stack.match(uri_pattern);
//       return urls;
//     }
//   }`
//    +
//   // Event to notify background script when a cookie is set using document.cookie's setter
//   `
//   function createCookieEvent(cookieString, urls) {
//     document.dispatchEvent(
//       new CustomEvent("setCookieEvent", {
//         detail: { cookieString: cookieString, stackTrace: urls,
//         timestamp: Date.now() }
//       }));
//   }
//   ` +

//   // Actually overwrite document.cookie
//   // On set, create event to notify background script
//   `
//   let _cookieSetter = document.__lookupSetter__("cookie");
//   let _cookieGetter = document.__lookupGetter__("cookie");
//   document.__defineSetter__("cookie", function(cookieString) {
//     createCookieEvent(cookieString, inspectStackA());
//     _cookieSetter.call(document, cookieString);
//   });
//   document.__defineGetter__("cookie", _cookieGetter);
//   `;

// interface CookieEvent extends CustomEvent {
//   detail: {
//     cookieString: string,
//     stackTrace: string[] | null,
//     timestamp: number
//   }
// }

// // THIS CODE RUNS WHEN PAGE LOADS:
// // Actually inject the code
// let scriptDiv = document.createElement('script');
// scriptDiv.appendChild(document.createTextNode(monkeypatchCookieCode));
// (document.head || document.documentElement).appendChild(scriptDiv);
// // scriptDiv.parentNode!.removeChild(scriptDiv);

// // Event that fires when document.cookie's setter is called.
// // Send message to background script to actually set the cookie.
// document.addEventListener('setCookieEvent',
//   function (e: CookieEvent) {
//     let cookieVal = e.detail.cookieString;
//     let stackTraceVal = e.detail.stackTrace;

//     let scriptURL;
//     if (stackTraceVal && stackTraceVal.length > 0) {
//       scriptURL = stackTraceVal[stackTraceVal.length - 1];
//     }

//     sendProgrammaticCookieMessage({
//       type: messages.MessageType.PROGRAMMATIC_COOKIE,
//       url: document.URL,
//       stackTrace: stackTraceVal,
//       scriptURL: scriptURL,
//       cookieString: cookieVal,
//       timestamp: e.detail.timestamp
//     });

//   } as EventListener);

////////////////////////////////////////////////////////////////////////////////
// Measurement Functions
////////////////////////////////////////////////////////////////////////////////

/**
 * Given an ad, finds the corresponding data retrieved from Prebid.js
 * @param ad HTML element corresponding to ad
 * @param dataToCollect name of the pbjs function call for the type of responses:
 * either "getBidResponses", "getAllWinningBids", or "getAllPrebidWinningBids"
 * @param responses the
 * @return responses associated with given ad for given data to collect, undefined if none exists
 */
async function associatePBJSResponsesWithAd(
    ad: Element, dataToCollect: string, responses: any) {
  const isBidResponses = dataToCollect === 'getBidResponses';

  // the element id of the current ad should be the same
  // as the key in the bidresponses
  // for each key in bid responses, check if ad is a child of pbAd,
  // and if pbAd is a child of ad
  // return ad info if there is a parent child relationship
  for (let key of Object.keys(responses)) {
    const adUnitCode = isBidResponses ? key : responses[key]['adUnitCode'];
    const adUnitElement = document.querySelector(`[id*="${adUnitCode}"]`);

    if (!adUnitElement) {
      return;
    }

    if (adUnitElement === ad) {
      return isBidResponses ? responses[key]['bids'] : responses[key];
    }
    // check if ad is a child of pbAd, and if pbAd is a child of ad
    if (ad.contains(adUnitElement) || adUnitElement.contains(ad)) {
      return isBidResponses ? responses[key]['bids'] : responses[key];
    }
  }
  return;
}

/**
 * Main class storing the state and logic for measuring data, and managing
 * the popup UI. Implemented as a class because the Popup UI state depends
 * heavily on the progress of the measurement procedure.
 */
class Measurement {
  uiContainer: HTMLDivElement;
  shadow: ShadowRoot;
  popupRoot: HTMLDivElement;
  popupRef: React.RefObject<Popup>;

  /**
   * Instantiates the popup - on construction, it immediately adds visible popup
   * elements to the DOM, so do not call until ready to show the UI.
   */
  constructor() {
    // Creates a div with a Shadow DOM, where the popup UI will live.
    // This helps encapsulate the CSS for the popup from the rest of the page.
    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'adprext-container';
    this.shadow = this.uiContainer.attachShadow({mode: 'open'});
    this.shadow.innerHTML = `<style>${PopupStyles}</style>`;
    this.popupRoot = document.createElement('div');
    this.popupRoot.id = 'root';
    this.shadow.appendChild(this.popupRoot);
    document.body.appendChild(this.uiContainer);

    let startingStage = promptBeforeScraping ? PopupStage.PROMPT : PopupStage.IN_PROGRESS;

    // Instantiate the React Popup component inside the Shadow DOM
    this.popupRef = React.createRef<Popup>();
    let props = {
      initialNumAds: 0,
      onPromptStart: this.collectData.bind(this),
      onPromptHelp: sendOpenInstructionsMessage,
      onPromptSkip: this.remove.bind(this),
      onPromptStatus: sendOpenStatusMessage,
      ref: this.popupRef,
      stage: startingStage,
    }
    ReactDOM.render(React.createElement(Popup, props), this.popupRoot);

    if (!promptBeforeScraping) {
      this.collectData();
    }
  }

  /**
   * Hides the popup (when screenshotting an ad).
   */
  hide() {
    this.popupRoot.style.opacity = '0%';
  }

  /**
   * Shows the popup (after screnshotting an ad).
   */
  show() {
    this.popupRoot.style.opacity = '100%';
  }

  /**
   * Removes the popup entirely (if user skips the scan).
   */
  remove() {
    this.uiContainer.remove();
  }

  /**
   * Increments the progress bar.
   */
  incrementAdCounter() {
    this.popupRef.current?.setState({
      currentAd: this.popupRef.current.state.currentAd + 1
    });
  }

  /**
   * MAIN MEASUREMENT FUNCTION. Triggered by the React component when
   * the user clicks the "Start" button.
   */
  async collectData() {
    this.popupRef.current?.setState({ stage: PopupStage.IN_PROGRESS });

    // first, we have to add page url with eID to the pages database
    try {
      await sendMeasurementStartMessage();
    } catch (e) {
      this.popupRef.current?.setState({ error: e });
      return;
    }

    // Retrieve selectors
    const selectors = await getSelectors();
    if (selectors === undefined) {
      console.error('no selectors found');
      this.popupRef.current?.setState({ error: 'Error: couldn\'t load ad selectors.' });
      return;
    }

    // Wait for 3s, for the page to finish loading the ads (this number is a guess)
    await sleep(3000);

    let cpmTotal = 0;
    let pbAdCount = 0;
    let bidders = new Set<string>();

    // Run ad detection round
    console.log('Detecting ads');

    let ads = detectAds(selectors);
    if (showAdBoundingBox) {
      applyAdsDebugOutline(ads);
    }

    console.log(ads);

    this.popupRef.current?.setState({ numAds: ads.size });

    // scroll to each detected ad, take a screenshot
    for (let ad of ads) {
      try {
        // scroll to ad
        ad.scrollIntoView({ block: 'center' });
        // wait 2 seconds for ad to load (guess)
        await sleep(2000);

        // scroll to the ad again in case it loaded and increased in size
        ad.scrollIntoView({ block: 'center' });
        await sleep(400);

        let bidResponses, prebidWinningBids, winningBids,
            associatedBidResponses, associatedWinningBids,
            associatedPrebidWinningBids;

        if (await pbjsAdapter.checkIfExists()) {
          console.log('Collecting PBJS data');
          // get data associated with current ad
          try {
            bidResponses = await pbjsAdapter.callFn(`getBidResponses`);
            prebidWinningBids = await pbjsAdapter.callFn(`getAllPrebidWinningBids`);
            winningBids = await pbjsAdapter.callFn(`getAllWinningBids`);

            // associate current screenshot with given bid response
            // this is called after each iteration because new info may
            // load when a new ad becomes visible
            associatedBidResponses = await associatePBJSResponsesWithAd(
                  ad, "getBidResponses", bidResponses);
            associatedWinningBids = await associatePBJSResponsesWithAd(
                  ad, "getAllWinningBids", winningBids);
            associatedPrebidWinningBids = await associatePBJSResponsesWithAd(
                  ad, "getAllPrebidWinningBids", prebidWinningBids);
          } catch (e) {
            console.warn('Prebid.js not found on page, not recording bid data');
          }

          if (associatedBidResponses) {
            associatedBidResponses.forEach((bid: any) => {
              bidders.add(bid);
            });
          }
          if (associatedWinningBids) {
            cpmTotal += associatedWinningBids.cpm;
            pbAdCount += 1;
          } else if (associatedPrebidWinningBids) {
            cpmTotal += associatedPrebidWinningBids.cpm;
            pbAdCount += 1;
          }
          this.popupRef.current?.setState({
            cpmTotal: cpmTotal,
            pbAdCount: pbAdCount,
            bidderCount: bidders.size
          });
        }

        // Skip ad if it is too small - it probably didn't render
        const rect = ad.getBoundingClientRect();
        if (rect.height < 50 || rect.width < 50 ||
            rect.height * rect.width < 15000) {
          console.log(`Skipping ad, too small (${rect.width}x${rect.height})`);
          this.incrementAdCounter();
          continue;
        }

        // Hide the popup for the screenshot, add a slight delay
        this.hide();
        await sleep(100);

        console.log('Sending screenshot message to bg');
        // Send all relevant data to background script
        await sendScreenshotMessage({
          type: messages.MessageType.SCREENSHOT,
          adRect: ad.getBoundingClientRect(),
          html: ad.outerHTML,
          height: window.innerHeight,
          width: window.innerWidth,
          parentUrl: window.location.href,
          winningBids: associatedWinningBids,
          prebidWinningBids: associatedPrebidWinningBids,
          bidResponses: associatedBidResponses,
          pixelRatio: window.devicePixelRatio
        });
        this.incrementAdCounter();
      } catch (e) {
        console.error(e);
        this.incrementAdCounter();
      } finally {
        this.show();
      }
    }

    // Done with looping through ads, notify background script to upload request
    // data
    this.popupRef.current?.setState({ stage: PopupStage.UPLOADING });
    try {
      await sendMeasurementDoneMessage();

      // Update running totals of bid amounts in chrome.storage
      const storedBidData = await chromePromise.storage.local.get(
          ['cpmTotal', 'pbAdCount', 'bidders']);
      const storedCpmTotal: number =
          storedBidData.cpmTotal ? storedBidData.cpmTotal : 0;
      const storedPbAdCount: number =
          storedBidData.pbAdCount ? storedBidData.pbAdCount : 0;
      const storedBidders: string[] =
          storedBidData.bidders ? storedBidData.bidders : [];

      storedBidders.forEach(b => bidders.add(b));
      await chromePromise.storage.local.set({
        cpmTotal: storedCpmTotal + cpmTotal,
        pbAdCount: storedPbAdCount + pbAdCount,
        bidders: Array.from(bidders)
      });
    } catch (e) {
      this.popupRef.current?.setState({ error: e });
      return;
    }

    this.popupRef.current?.setState({ stage: PopupStage.COMPLETE });
  }
}

////////////////////////////////////////////////////////////////////////////////
// Background script communication
////////////////////////////////////////////////////////////////////////////////

 /**
 * Makes a request to the background script to take a screenshot of an ad,
 * and store that information. Asynchronous to allow waiting to take
 * screenshot
 * @param message A ScreenshotRequest object containing metadata, like the
 * dimensions and location of the ad, the HTML content of the ad, etc.
 */
function sendScreenshotMessage(message: messages.ScreenshotRequest) {
  return sendAsyncMessage(message);
}

function sendProgrammaticCookieMessage(message: messages.ProgrammaticCookieRequest) {
  return sendAsyncMessage(message);
}

function sendOpenInstructionsMessage() {
  return sendAsyncMessage({
    type: messages.MessageType.OPEN_INSTRUCTIONS
  } as messages.OpenInstructionsRequest);
}

function sendOpenStatusMessage() {
  return sendAsyncMessage({
    type: messages.MessageType.OPEN_STATUS
  } as messages.OpenStatusRequest);
}

function sendMeasurementDoneMessage() {
  return sendAsyncMessage({
    type: messages.MessageType.MEASUREMENT_DONE,
    pageURL: location.href
  } as messages.MeasurementDoneRequest);
}

function sendMeasurementStartMessage() {
  return sendAsyncMessage({
    type: messages.MessageType.MEASUREMENT_START,
    pageURL: location.href,
    timestamp: Date.now()
  } as messages.MeasurementStartRequest);
}

function sendAsyncMessage(message: messages.BasicMessage) {
  return new Promise<any>((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: messages.BasicResponse) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      }
      if (!response.success) {
        reject(new Error(response.error));
        return;
      }
      resolve(response.message);
    });
  });
}

////////////////////////////////////////////////////////////////////////////////
// Main
////////////////////////////////////////////////////////////////////////////////

// This is where content script starts executing, after it is first injected
// into a web page.
async function main() {
  console.log('restrictToAllowList = '  + restrictToAllowList);


  // If not using the allow list, run the measurement popup
  if (!restrictToAllowList) {
    new Measurement();
    return;
  }

  chrome.storage.local.get('siteStatus', (items) => {
    console.log('items.siteStatus[window.location.href] = ' + items.siteStatus[window.location.href]);
    console.log('siteScrapeLimit = ' + siteScrapeLimit);
    if (!items.siteStatus) {
      return;
    }

    // Skip if current url is not in the allow list
    // (implicitly stored as keys in siteStatus if the restrictToAllowList flag
    // is true)
    if (!(window.location.href in items.siteStatus)) {
      return;
    }

    // Run measurement if current site is below siteScrapeLimit or
    // siteScrapeLimit doesn't exist
    if (siteScrapeLimit == -1
        || items.siteStatus[window.location.href] < siteScrapeLimit) {
      console.log('Instantiating object');
      new Measurement();
    }
  });
}

main();

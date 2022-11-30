// Configuration file and feature flags for the extension.

///////////////////////////////////
// Configuration and debug flags //
///////////////////////////////////

// This is the URL of the server that the extension sends data to.
export const serverUrl: string = 'http://localhost:6800';

// Adds a red border around all detected ads. For debugging purposes.
export const showAdBoundingBox: boolean = false;

// Collect webRequest and cookie data, which can be used for detecting and
// measuring web trackers. Data is collected in the format used by the
// TrackingObserver and TrackingExcavator projects.
// export const experimentalTrackingDetection: boolean = false;

///////////////////////////////
// Extension behavior flags  //
///////////////////////////////

// Change the flags here to control the behavior of the extension, like
// whether to give participants a chance to review ad screenshots before they
// are uploaded, or whether to restrict data collection to an allowlist.

// Settings for running a user study, such as the one in Zeng et al (IMC 2022),
// where collection is restricted to a limited number of sites, and participants
// can review ads before sending:
// restrictToAllowList = true
// siteScrapeLimit = 2
// promptBeforeScraping = true
// allowParticipantsToReviewAds = true
// reviewAdsOnComplete = true
// surveyOnComplete = true

// Settings for running a more scraper-like study, where the extension runs on
// all sites, and uploads all data immediately:
// restrictToAllowList = false
// siteScrapeLimit = -1
// promptBeforeScraping = false
// allowParticipantsToReviewAds = false
// reviewAdsOnComplete = false
// surveyOnComplete = false

// When set to true, the extension can only collect data on URLs specified
// in ./siteAllowList.json.
// When set to false the extension can collect data on all URLs.
export const restrictToAllowList: boolean = true;

// The number of times the extension is allowed to scrape a URL. After this
// limit is reached, the extension will no longer be active on that URL.
// When set to -1, there is no limit.
export const siteScrapeLimit: number = 1;

// When set to true, the extension will wait for users to accept a prompt
// before scraping a web page.
// When set to false, the extension will start scraping a page immediately on
// load.
// Since the data collection routine requires control of scrolling on the page,
// if working with real users, this flag gives users more control over when
// the extension takes over the tab.
export const promptBeforeScraping: boolean = true;

// When set to true, participants must review the ad content of the ads
// collected by the extension before uploading screenshots and HTML content.
// A review interface is provided in approveAds.html, which is linked to in
// status.html.
// Alternatively, the review interface can be configured to automatically
// open in a new tab after all sites in the allow list are scraped
// using the flag |reviewAdsOnComplete|.
// When set to false, screenshots and HTML content are uploaded immediately
// after each ad is scraped.
export const allowParticipantsToReviewAds: boolean = true;

// If |restrictToAllowList| is true AND |siteScrapeLimit| is not -1 AND
// |allowParticipantsToReviewAds| is true,
// when this option is set to true, the extension automatically shows the
// ad review interface after each site on the allow list has been scraped
// |siteScrapeLimit| times.
export const reviewAdsOnComplete: boolean = true;

// If |restrictToAllowList| is true AND |siteScrapeLimit| is not -1,
// when this option is set to true, the extension automatically shows the
// post-data collection survey after each site on the allow list has been
// scraped |siteScrapeLimit| times.
export const surveyOnComplete: boolean = true;

// If |restrictToAllowList| is true,
// when set to true, randomizes the list of URLs from the allow list shown to
// participants in status.html.
// This is flag used to randomize the list of sites participants see to
// control for ordering effects.
export const randomizeAllowListOrder: boolean = true;


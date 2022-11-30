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
// where collection is restricted to a limited set of sites, and participants
// can review ads before sending:
// restrictToAllowList = true
// siteScrapeLimit = 2
// promptBeforeScraping = true
// allowParticipantsToReviewAds = true
// reviewOnAllowListComplete = true

// Settings for running a more scraper-like study, where the extension runs on
// all sites, and uploads all data immediately:
// restrictToAllowList = false
// siteScrapeLimit = -1
// promptBeforeScraping = false
// allowParticipantsToReviewAds = false
// reviewOnAllowListComplete = false

// Set to true if the extension should only collect data on URLs specified
// in ./siteAllowList.json.
// Set to false if the extension should collect data on all URLs.
export const restrictToAllowList: boolean = true;

// The number of times the extension should be allowed to scrape a URL,
// before no longer showing the prompt.
// If set to -1, there is no limit
export const siteScrapeLimit: number = 2;

// Set to true if the extension should wait for user input before starting to
// scraping a webpage.
// Set to false if the extension should start scraping a page immediately on
// load.
// Since the data collection routine requires control of scrolling on the page,
// if working with real users, this gives users more control over when
// they are interrupted.
export const promptBeforeScraping: boolean = true;

// Set to true if participants can review the ad content of the ads
// before uploading screenshots and HTML content. This can be good if
// participants have privacy concerns about targeted ads revealing
// information about them.
// Set to false to upload screenshots and HTML content immediately after
// scraping.
export const allowParticipantsToReviewAds: boolean = true;

// If restrictToAllowList is true, and siteScrapeLimit is not -1, and
// allowParticipantsToReviewAds is true, automatically shows the review
// interface once all sites on the allow list are scraped siteScrapeLimit times.
// Use this flag in the context of a user study where participants visit
// a restricted set of sites a set number of times.
export const reviewOnAllowListComplete: boolean = true;

// Set to true if using an allow list, and the list of URLs shown to
// participants should be randomized. You might want to set this to conrol for
// ordering effects.
export const randomizeAllowListOrder: boolean = true;


# Ad Prices Extension
This directory contains the code for the data collection extension, which
collects ads, metadata, and bidding information for each ad.

## First Time Setup
Install dependencies from npm
```
npm install
```

## Building and running the extension
This extension is a Typescript + React project, we use a webpack-based toolchain
to compile into JavaScript.

### Compile the extension:
```
npm run build
```
Alternatively, to compile the extension automatically when you save
a file, you can run:
```
webpack --watch
```

### Load the extension in the browser
* Go to `chrome://extensions`
* At the top right of the top bar, turn on Developer mode if it is not on already
* Click "Load Unpacked"
* Select the `dist/` folder in this repository



## How do we find the amount bid to run an ad?
The amount advertisers bid to run the ad is _sometimes_ leaked by prebid.js, an
open source header bidding library that is popular on many websites.

You can tell if a site leaks this information by going to the Developer Tools,
opening the JavaScript console, and typing "pbjs". If it returns an object,
then the site is using a vulnerable version of prebid.

Some sites that use pbjs:
* vox.com
* espn.com
* militarytimes.com
* dailyherald.com
* zdnet.com
* androidauthority.com
* askmen.com
* startribune.com
* katu.com
* billboard.com
* bostonglobe.com
* wpxi.com
* avclub.com

### What functions will give us the bids?
Based on the [prebid.js documentation](https://docs.prebid.org/dev-docs/publisher-api-reference.html),
it looks like calling the following functions will give us relevant info:
* `pbjs.getBidResponses()` will show all of the bids for each ad slot (see the
`cpm` field for the value), though not necessarily the winner
* `pbjs.getAllWinningBids()` will show bids that have won and are on the page
* `pbjs.getAllPrebidWinningBids()` will show bids that have won but haven't yet
rendered on the page.
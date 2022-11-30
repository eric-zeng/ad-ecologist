# AdEcologist: A Browser-based Tool for Crowdsourcing Data Collection of Ads and Ad Auctions on the Web

The online advertising ecosystem is extremely opaque, especially when it comes
to targeted advertising.
From the outside, we have very little data on how ads are
targeted, such as who is being targeted by what, and how prevalent different
forms of targeting (e.g. contextual, behavioral, retargeting) are. This lack of
transparency makes it difficult to have informed discussion about tradeoffs
between targeted advertising and user privacy.

Studying targeting without data from the ad tech companies is difficult.
Because of the sheer volume of ads on the internet, and the multitude of
parameters advertisers can use to target people, one must collect a large amount
of data from multiple browsing profiles to make inferences about how
a particular ad or category of ad is targeted. And to capture truly
ecologically valid data, the ads ideally are collected from real users'
browsers, rather than web crawlers.

**AdEcologist** is a browser extension for crowdsourcing data collection of ad
content on the web. It can scrape screenshots of ads on the websites that the
user visits, as well as information on header bidding ad auctions (for sites
that have them). Researchers can distribute a variant of AdEcologist to
study participants or volunteers to collect a dataset of ads from a diversity
of vantage points.

This (base) version of AdEcologist is not just a scraping tool, but also
includes user interfaces to guide study participants or volunteers through the
setup and usage of the extension. Developed for a previous user study [1],
the extension includes flows for:

- Registering the extension with the researchers' backend
- Brief introduction and tutorial
- To-do list of websites to visit
- A survey asking participants to rate the relevance of the ads shown to them
- An interface to allow participants to review and withhold any ad screenshots that they may consider too privacy-sensitive to share with researchers

The dataset that AdEcologist generates can be used to study ad targeting using a
"topic-based" or "content-based" approach. In our previous work [1], we used
OCR, topic modeling, and manual qualitative analysis to sort ads into categories,
and then analyzed how different ad categories were distributed across
demographic characteristics and websites.

AdEcologist also contains functionality for collecting data on ad auctions
conducted in *header bidding* scripts. This data provides information on the
value of bids offered to fill ad slots by different ad networks, and the value
of the winning bid. This information can be used to analyze how much advertisers
value a particular user's impression, or a particular website. It can also
suggest when an ad is a retargeted ad - research findings show that retargeted
ads fetch significantly higher bid values [1,2].

**Disclamer:** This tool is research code, and may not work out of the box for
all use cases. However, we hope that it provides a starting point for other
researchers hoping to collect ad data with the help of real users. We welcome
contributions, and encourage modifications for your own studies. If you find
this codebase at all helpful for your efforts, consider citing our paper [1].

## What's in this repository

This repository contains two components - the
Chrome extension and a backend. See the [extension README](extension/README.md)
and [server README](server/README.md) for more details on setting up the
infrastructure.

### Extension

A Chrome/Chromium extension for crowdsourced data collection of ad content from
the web. Contains user interfaces suitable for a user study, but can also
configured to operate more like a crawler.

### Server

A simple node.js backend for receiving the data from the extension. The data is
more or less directly stored in a PostgreSQL database. It also contains basic
authentication/registration features to restrict usage to registered
study participants.

## References

AdEcologist was developed by [Eric Zeng](https://ericwzeng.com) and
[Rachel McAmis](https://homes.cs.washington.edu/~rcmcamis/). It was used to collect
data in our IMC 2022 paper measuring targeted advertising and ad auctions, and
how they vary across demographic characteristics and websites [1].

[1] Eric Zeng, Rachel McAmis, Tadayoshi Kohno, Franziska Roesner.
[What Factors Affect Targeting and Bids in Online Advertising? A Field Measurement Study.](https://doi.org/10.1145/3517745.3561460)
ACM Internet Measurement Conference (IMC), 2022.

[2] Lukasz Olejnik, Tran Minh-Dung, Claude Castelluccia. [Selling Off Privacy at Auction](https://hal.inria.fr/hal-00915249/PDF/SellingOffPrivacyAtAuction.pdf). Network and Distributed System Security (NDSS) Symposium, 2014.

[3] Michalis Pachilakis, Panagiotis Papadopoulos, Evangelos P. Markatos, Nicolas Kourtellis. [No More Chasing Waterfalls: A Measurement Study of the Header Bidding Ad-Ecosystem](https://arxiv.org/abs/1907.12649). ACM Internet Measurement Conference (IMC), 2019.
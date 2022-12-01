import React from 'react';
import ReactDOM from 'react-dom';
import MersenneTwister from 'mersenne-twister';
import { allowParticipantsToReviewAds, randomizeAllowListOrder, restrictToAllowList, reviewAdsOnComplete, siteScrapeLimit, surveyOnComplete } from '../../config';

const mt = new MersenneTwister();

interface StatusState {
  siteStatus?: {[url: string]: number},
  pbAdCount: number,
  cpmTotal: number,
  randomSeed: number
}

class Status extends React.Component<{}, StatusState> {
  constructor(props: any) {
    super(props);
    this.state = {
      siteStatus: {},
      cpmTotal: 0,
      pbAdCount: 0,
      randomSeed: 0
    };
  }

  async componentDidMount() {
    const { siteStatus, extension_id, cpmTotal, pbAdCount, randomSeed } =
      await chrome.storage.local.get(
        ['siteStatus', 'extension_id', 'pbAdCount', 'cpmTotal', 'randomSeed']);

    if (!extension_id) {
      window.location.href = '/register.html';
    }

    this.setState({
      siteStatus: siteStatus,
      pbAdCount: pbAdCount ? pbAdCount : 0,
      cpmTotal: cpmTotal ? cpmTotal : 0,
      randomSeed: randomSeed
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      console.log(changes)
      if (areaName !== 'local') {
        return;
      }
      if ('siteStatus' in changes) {
        this.setState({ siteStatus: changes.siteStatus.newValue });
      }
      if ('cpmTotal' in changes) {
        this.setState({ cpmTotal: changes.cpmTotal.newValue });
      }
      if ('pbAdCount' in changes) {
        this.setState({ pbAdCount: changes.pbAdCount.newValue });
      }
    });
  }

  getRandomizedSiteStatusOrder() {
    mt.init_seed(this.state.randomSeed);

    if (!this.state.siteStatus) {
      return [];
    }
    return shuffle(this.getSortedSiteStatusOrder());
  }

  getSortedSiteStatusOrder() {
    if (!this.state.siteStatus) {
      return [];
    }
    return Object.entries(this.state.siteStatus).sort((a, b) => {
      if (a[0] < b[0]) {
        return -1;
      }
      if (a[0] > b[0]) {
        return 1;
      }
      return 0;
    });
  }

  render() {
    const sitesRemaining = this.state.siteStatus
      ? Object.values(this.state.siteStatus).filter(val => val < siteScrapeLimit).length
      : '';

    const siteStatusEntries = randomizeAllowListOrder
      ? this.getRandomizedSiteStatusOrder()
      : this.getSortedSiteStatusOrder();

    return (
      <div className="container">
        <h1>AdEcologist Study Status</h1>
        <h4>
          Sites to Visit
          { restrictToAllowList && siteScrapeLimit != -1
            ? <>({sitesRemaining} sites remaining)</>
            : null }
        </h4>
        <p>
          We need your help to collect data on the ads that appear on the
          following websites.
          <br/>
          <b>Please visit each website in this list, and follow the instructions
          that appear in the purple popup.</b>
          <br/>
        </p>

        { restrictToAllowList
            && siteScrapeLimit != -1
            && (allowParticipantsToReviewAds && reviewAdsOnComplete || surveyOnComplete)
            && this.state.siteStatus
            && Object.values(this.state.siteStatus).every(v => v == siteScrapeLimit)
          ? <>
              <h5>All sites visited!</h5>
              <p>
                <a href={surveyOnComplete ? 'relevanceSurvey.html' : '/approveAds.html'}
                    role="button" className="btn btn-primary">
                  Click Here to Continue
                </a>
              </p>
            </>
          : null
        }

        { allowParticipantsToReviewAds && siteScrapeLimit === -1
          ? <a href="approveAds.html" role="button" className="btn btn-primary">
              Review and Submit Ad Screenshots
            </a>
          : null
        }

        <table className="table">
          <thead>
            <tr>
              <th>Website (Link opens in new tab)</th>
              <th># of Visits</th>
            </tr>
          </thead>
          <tbody>
          { this.state.siteStatus
              ? siteStatusEntries.map(([url, status]) =>
                  <Site key={url} url={url} status={status}/>
                )
              : <tr>
                  <td>Loading...</td>
                  <td>Please wait</td>
                </tr>
          }
          </tbody>
        </table>

        <p>
          So far, based on the data available to us, advertisers have
          paid <b>${(this.state.cpmTotal / 1000).toFixed(3)} </b>
          to show you <b>{this.state.pbAdCount} ads</b> on these sites
          (Our tool many not be able to see the amount paid for every ad on the
          page).
        </p>
        { allowParticipantsToReviewAds && reviewAdsOnComplete
          ? <p>
              At the end, you will have a chance
              to review the ads we collected, and remove any screenshots of ads
              that you do not want to share with us (in case you find them too
              sensitive).
            </p>
          : null
        }
      </div>
    );
  }
}

interface SiteProps {
  url: string,
  status: number
}

class Site extends React.Component<SiteProps, {}> {
  render() {
    return (
      <tr>
        <td>
          { restrictToAllowList
              && siteScrapeLimit != -1
              && this.props.status >= siteScrapeLimit
            ? <span className="site-visited">
                {this.props.url}
              </span>
            : <a href={this.props.url} target="_blank">
                {this.props.url}
              </a>
          }
        </td>
        <td>
          <span>
            {this.props.status}
          </span>
        </td>
      </tr>
    )
  }
}

ReactDOM.render(<Status/>, document.getElementById('react'));

// Fisher-Yates shuffle using seeded Mersenne Twister
function shuffle(array: any[]) {
  let m = array.length, t, i;
  while (m) {
    i = Math.floor(mt.random() * m--);
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
}
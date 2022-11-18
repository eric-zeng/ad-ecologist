import React from 'react';
import ReactDOM from 'react-dom';
import MersenneTwister from 'mersenne-twister';
import * as chromePromise from '../../common/chromePromise';

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
    const { siteStatus, visitCount, extension_id, cpmTotal, pbAdCount, randomSeed } =
      await chromePromise.storage.local.get(
        ['siteStatus', 'visitCount', 'extension_id', 'pbAdCount', 'cpmTotal', 'randomSeed']);

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

    let sorted = Object.entries(this.state.siteStatus).sort((a, b) => {
      if (a[0] < b[0]) {
        return -1;
      }
      if (a[0] > b[0]) {
        return 1;
      }
      return 0;
    });
    return shuffle(sorted);
  }

  render() {
    const sitesRemaining = this.state.siteStatus
      ? Object.values(this.state.siteStatus).filter(val => val < 2).length
      : '';

    const orderedSiteStatus = this.getRandomizedSiteStatusOrder();

    return (
      <div className="container">
        <img id="logo" src="/img/Allen-School-purple-RGB-med.png"/>
        <h2>UW Ad Tracker Extension</h2>

        <h4>Sites to Visit ({sitesRemaining} sites remaining)</h4>
        <p>
          We need your help to collect data on the ads that appear on the
          following websites.
          <br/>
          <b>Please visit each website in this list, and follow the instructions
          that appear in the purple popup.</b>
          <br/>
        </p>
        <p>
          We need to scan each website two times. The popup will automatically
          do this, but if you accidentally close the tab after one visit, the
          status of the website will say "Partially Visited", and you will
          need to open the link again to complete the scan.
        </p>
        { this.state.siteStatus ?
          Object.values(this.state.siteStatus).every(v => v == 2)
            ? <>
                <h5>All sites visited!</h5>
                <p>
                  <a href="/relevanceSurvey.html" role="button" className="btn btn-primary">
                    Click Here to Continue
                  </a>
                </p>
              </>
            : null
          : null
        }

        <table className="table">
          <thead>
            <tr>
              <th>Website (Link opens in new tab)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
          { this.state.siteStatus
              ? orderedSiteStatus.map(([url, status]) =>
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
        <p>
          Once you have visited and collected data on each site, we will
          ask you to fill out a short survey. At the end, you will have a chance
          to review the ads we collected, and remove any screenshots of ads
          that you do not want to share with us (in case you find them too
          sensitive).
          <br/>
          After all tasks are complete, we will give you the Prolific
          completion code.
        </p>
        <h4>Questions? Problems?</h4>
        <ul>
          <li>
            <a href="/intro.html">Click here</a> to read the instructions for the
            survey again.
          </li>
          <li>
            If you are having issues, please contact the researchers through
            Prolific, or at&nbsp;
            <a href="mailto:uwadstudy@cs.washington.edu">
              uwadstudy@cs.washington.edu
            </a>.
          </li>
          <li>
            <a href="https://adsurvey.kadara.cs.washington.edu/privacy.html" target="_blank">
            Click here</a> to view our Privacy Policy.
          </li>
        </ul>
      </div>
    )
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
          { this.props.status == 2
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
            {this.props.status  == 2 ? '✅ Visited' :
            this.props.status == 1 ? 'Partially Visited' :
            'Not Visited Yet'}
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
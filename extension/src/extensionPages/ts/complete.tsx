import React from 'react';
import ReactDOM from 'react-dom';
import { detect } from 'detect-browser';

const browser = detect();

interface State {
  pbAdCount: number,
  cpmTotal: number
}

class CompletionAdSummary extends React.Component<{}, State> {
  constructor(props: any) {
    super(props);
    this.state = { pbAdCount: 0, cpmTotal: 0 };
  }

  componentDidMount() {
    chrome.storage.local.get(['pbAdCount', 'cpmTotal'], (stored) => {
      this.setState({
        pbAdCount: stored.pbAdCount,
        cpmTotal: stored.cpmTotal
      });
    });
  }

  render() {
    return (
      <>
        <p>During this study, advertisers paid <b>
        ${(this.state.cpmTotal / 1000).toFixed(2)}</b> to show you <b>
        {this.state.pbAdCount}</b> ads. Thanks for helping us collect this data!
        </p>
      </>
    );
  }
}

class Uninstall extends React.Component {
  render() {
    if (browser && browser.name === 'chrome') {
      return (
        <div>
        <p>Click the puzzle piece icon in the top right of the browser: </p>
        <img className="steps" id="step1" src="/img/step1.png" />
        <br/><br/>
        <p>
          Then click the three dots to get to the dropdown menu. Click the
          "Remove from Chrome" option.
        </p>
        <img className="steps" id="step1" src="/img/step2.png" />
        <br/><br/>
        <p>Click Remove to confirm that you want to remove it.</p>
        <img className="steps" id="step3" src="/img/step3.png" />
        <br/><br/>
        </div>
      )
    }
    if (browser && browser.name === 'edge-chromium') {
      return (
        <>
          <div>
          <p>Click the puzzle piece icon in the top right of the browser: </p>
          <img className="steps" id="step1" src="/img/edgeremove1.png" />
          <br/><br/>
          <p>
            Then click the three dots to get to the dropdown menu. Click the
            "Remove from Microsoft Edge" option.
          </p>
          <img className="steps" id="step1" src="/img/edgeremove2.png" />
          <br/><br/>
          <p>Click Remove to confirm that you want to remove it.</p>
          <img className="steps" id="step3" src="/img/edgeremove3.png" />
          <br/><br/>
          </div>
        </>
      )
    }

  }
}

ReactDOM.render(<CompletionAdSummary/>, document.getElementById('prices'));
ReactDOM.render(<Uninstall/>, document.getElementById('uninstall'));

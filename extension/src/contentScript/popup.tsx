import React from 'react';
import ErrorAlert from '../common/errorAlert';

interface State {
  currentAd: number,
  numAds: number,
  stage: PopupStage,
  // visitCount: number,
  error?: any,
  cpmTotal: number,
  pbAdCount: number,
  bidderCount: number
}

interface Props {
  initialNumAds: number,
  stage: PopupStage,
  // visitCount: number,
  onPromptStart: () => void,
  onPromptSkip: () => void,
  onPromptHelp: () => void,
  onPromptStatus: () => void,
  // onPromptSecondVisit: () => void
}

export enum PopupStage {
  PROMPT,
  IN_PROGRESS,
  COMPLETE,
  COMPLETE_ONE,
  COMPLETE_TWO,
  UPLOADING
}

export default class Popup extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      currentAd: 0,
      // visitCount: 0,
      numAds: this.props.initialNumAds,
      stage: this.props.stage,
      cpmTotal: 0,
      pbAdCount: 0,
      bidderCount: 0
    }
    // if (this.props.visitCount == 1) {
    //   this.props.onPromptSecondVisit();
    // }
  }

  renderProgressBar() {
    const pctDone = this.state.numAds == 0
      ? 0
      : Math.round(100 * this.state.currentAd / this.state.numAds);

    const adsLeft = this.state.numAds - this.state.currentAd;
    const secondsLeft = Math.round(adsLeft * 2.5);

    return (
      <div>
        <progress max={this.state.numAds} value={this.state.currentAd}/>
        <div><b>{pctDone}%</b> Done</div>
        { this.state.currentAd !== this.state.numAds
          ? <div id='popup-progress-count'>
              (Scanning ad {this.state.currentAd + 1} of {this.state.numAds}, estimated time remaining: {secondsLeft} seconds)
            </div>
          : null }
      </div>
    );
  }

  renderInProgress() {
    return (
      <div className='popup-content'>
        <h4>Please wait, UW Ad Tracker is collecting data on this page</h4>
        { this.renderProgressBar() }
        { this.renderBidInfo() }
      </div>
    );
  }

  // TODO: perhaps show some more info when user says "skip for now", like
  // tell them to go back later.
  renderPermissionPrompt() {
    return (
      <div className='popup-content'>
        <h3>
          UW Ad Tracker wants to collect data on this page.
        </h3>
        <p>
          After clicking start, the extension will automatically scan the ads
          on the page.
        </p>
        <div className="button-strip">
          <button className="button-primary"
                  onClick={() => this.props.onPromptStart()}>
            Start
          </button>
          <button className="button-secondary"
                  onClick={() => this.props.onPromptSkip()}>
            Close
          </button>
        </div>
      </div>
    );
  }

  renderUploading() {
    return (
      <div className="popup-content">
        <h4>Please wait, UW Ad Tracker is uploading data...</h4>
        <p>
          This may take 30-60 seconds. Please do not close the tab!
        </p>
        <span className="spinner"></span>
        {this.renderBidInfo()}
      </div>
    );
  }

  renderComplete() {
    return (
      <div className='popup-content'>
        <h4>UW Ad Tracker is done collecting data on this page!</h4>
        <p>You may safely close this tab.</p>
        {this.renderProgressBar()}
        {this.renderBidInfo()}
      </div>
    );
  }

  renderBidInfo() {
    return (
      <div>
        <p>
          Advertisers paid <b>${(this.state.cpmTotal / 1000).toFixed(3)}</b> to
          show you <b> {this.state.pbAdCount} of the ads</b> on this page.
          <br/>
          <span style={{fontSize: '11pt'}}>
            (Our tool many not be able to see the amount paid for every ad on the page).
          </span>
        </p>
      </div>
    );
  }

  render() {
    let content: JSX.Element | null;
    switch (this.state.stage) {
      case PopupStage.PROMPT:
        content = this.renderPermissionPrompt();
        break;
      case PopupStage.IN_PROGRESS:
        content = this.renderInProgress();
        break;
      case PopupStage.COMPLETE:
        content = this.renderComplete();
        break;
      case PopupStage.UPLOADING:
        content = this.renderUploading();
        break;
      default:
        content = null;
    }

    return (
      <div className='popup-background'>
        <div className='popup'>
          { content }
          { this.state.error
            ? <ErrorAlert error={this.state.error}/>
            : null
          }
        </div>
      </div>
    );
  }
}

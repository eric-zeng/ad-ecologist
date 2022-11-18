import React from 'react';
import ReactDOM from 'react-dom';
import * as chromePromise from '../../common/chromePromise';
import serverUrl from '../../common/serverUrl';
import AdScreenshotInContext from './AdScreenshotInContext';
import ErrorAlert from '../../common/errorAlert';
import AdData from './AdData';

interface State {
  adData: { [adId: string]: AdData },
  toExclude: { [ adId: string ]: boolean },
  excludeReasons: { [adId: string]: ExcludeReasons },
  excludeReasonPopupVisible: boolean,
  excludeReasonAdId?: string
  uploading: boolean,
  numAds: number,
  currentAd: number,
  error: string | null,
  loadingInitial: boolean
}

interface ExcludeReasons {
  tooPersonal: boolean,
  revealsHistory: boolean,
  incorrect: boolean,
  other: boolean,
  otherReason?: string,
  adDescription?: string
}

class ApproveAds extends React.Component<{}, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      adData: {},
      toExclude: {},
      excludeReasonPopupVisible: false,
      excludeReasons: {},
      loadingInitial: true,
      uploading: false,
      numAds: 0,
      currentAd: 0,
      error: null,
    };

    this.toggleSelect = this.toggleSelect.bind(this);
    this.toggleExcludePopup = this.toggleExcludePopup.bind(this);
    this.updateExcludeReasons = this.updateExcludeReasons.bind(this);
    this.submit = this.submit.bind(this);
  }

  async componentDidMount() {
    let {savedAds, toExclude, excludeReasons} =
        await chromePromise.storage.local.get(['savedAds', 'toExclude', 'excludeReasons']);

    if (!toExclude) {
      toExclude = {};
    }

    if (!excludeReasons) {
      excludeReasons = {};
    }

    const adData = await chromePromise.storage.local.get(savedAds.adIds);

    for (let adId of Object.keys(adData)) {
      if (!toExclude.hasOwnProperty(adId)) {
        toExclude[adId] = false;
      }
    }

    this.setState({
      adData: adData,
      toExclude: toExclude,
      excludeReasons: excludeReasons,
      loadingInitial: false
    });

    await chromePromise.storage.local.set({ toExclude: toExclude });
  }

  toggleSelect(adId: string) {
    this.setState(prevState => {
      return {
        toExclude: {
          ...prevState.toExclude,
          [adId]: !prevState.toExclude[adId]
        }
      };
    }, () => {
      chrome.storage.local.set({ toExclude: this.state.toExclude });
    });
  }

  toggleExcludePopup(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    this.setState({
      excludeReasonPopupVisible: true,
      excludeReasonAdId: e.currentTarget.dataset.adid
    });
  }

  updateExcludeReasons(adId: string, reason: keyof ExcludeReasons, value: boolean | string) {
    let prev = this.state.excludeReasons[adId]
      ? this.state.excludeReasons[adId]
      : {
          tooPersonal: false,
          revealsHistory: false,
          incorrect: false,
          other: false
        };
    let updated = {
      ...prev,
      [reason]: value
    };

    // Delete object for adId if all fields are empty
    if (!updated.adDescription && !updated.incorrect && !updated.other &&
        !updated.otherReason && !updated.revealsHistory && !updated.tooPersonal) {
      this.setState((prevState) => {
        delete prevState.excludeReasons[adId];
        return {
          excludeReasons: prevState.excludeReasons
        }
      }, () => {
        chrome.storage.local.set({ excludeReasons: this.state.excludeReasons })
      });
    // Otherwise update object
    } else {
      this.setState({
        excludeReasons: {
          ...this.state.excludeReasons,
          [adId]: updated
        }
      }, () => {
        chrome.storage.local.set({ excludeReasons: this.state.excludeReasons })
      });
    }
  }

  async submit() {
    if (this.state.loadingInitial) {
      return;
    }

    let areYouSure = confirm('Are you sure that you have selected all of the' +
      ' ads that you do not want to share with researchers?');
    if (!areYouSure) {
      return;
    }

    const adIdsToSubmit = new Set(Object.entries(this.state.toExclude)
      .filter(([adId, values]) => !values)
      .map(([adId, values]) => adId));

    const ads = Object.entries(this.state.adData)
        .filter(([adId, data]) => adIdsToSubmit.has(adId))
        .map(([adId, data]) => {
          return {
            adId: Number.parseInt(adId),
            ...data
          }
        });

    this.setState({ numAds: ads.length, currentAd: 0, uploading: true });

    let eID: string;
    try {
      eID = (await chromePromise.storage.local.get('extension_id')).extension_id;
    } catch (e) {
      console.error(e);
      this.setState({
        error: `Error: could not get extension ID. (${e})`
      });
      return;
    }

    try {
      let res = await fetch(`${serverUrl}/exclude_reason_data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excludeReasons: this.state.excludeReasons,
          eID: eID
        })
      });
      if (!res.ok) {
        this.setState({
          error: `Error occurred while sending ads to the server, please `
           + `reload the page and try again. `
           + `(Error ${res.status}: ${res.statusText})`
        });
        return;
      }
    } catch (e) {
      this.setState({
        error: `Error occurred while sending ads to the server, please `
         + `reload the page and try again. `
         + `(${e})`
      });
    }


    for (let ad of ads) {
      try {
        let res = await fetch(`${serverUrl}/ad_screenshot_data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...ad,
            eID: eID
          })
        });
        if (!res.ok) {
          this.setState({
            error: `Error occurred while sending ads to the server, please `
             + `reload the page and try again. `
             + `(Error ${res.status}: ${res.statusText})`
          });
          break;
        }
        this.setState((prevState) => {
          return { currentAd: prevState.currentAd + 1 }
        });

      } catch (e) {
        console.error(e);
        this.setState({
          error: `Error occurred while sending ads to the server, please `
           + `reload the page and try again. `
           + `(${e})`
        });
        break;
      }
    }
  }

  render() {
    const countSelected = Object.values(this.state.toExclude).filter(Boolean).length;
    const totalAds = Object.entries(this.state.adData).length;
    return (
      <>
        <div id="exclude-count-continue">
          <p>
            {totalAds - countSelected} ads will be shared with the
            research team.
            <br/>
            <b id="ad-count">{countSelected} ads</b> will not be
            shared with the research team.
            <br/>
            Click to select any ads you do not want to share. Once you have
            selected all ads that you are not comfortable
            with sharing, click Continue.
          </p>

          <button className="btn btn-primary"
              role="button"
              onClick={this.submit}
              disabled={this.state.loadingInitial}>
            Continue
          </button>
        </div>
        { this.state.loadingInitial
          ? <div style={{ textAlign: 'center', marginTop: '36px' }}>
              <span className="large-spinner"></span>
              <h4>Loading...</h4>
            </div>
          : null
        }
        <div className="image-grid">
          { Object.entries(this.state.adData).map(([adId, ad]) =>
            <div key={adId} className="ad" onClick={() => this.toggleSelect(adId)}>
              <div className={this.state.toExclude[adId] ? 'inset-selected' : 'inset-not-selected'}>
                { this.state.toExclude[adId]
                  ? <div className="selected-ad">
                      <div className="selected-ad-content">
                        <h6>This ad will not be shared with the research team.</h6>
                        { this.state.excludeReasons[adId]
                          ? <button className="btn btn-secondary btn-sm"
                                data-adid={adId}
                                role="button"
                                onClick={this.toggleExcludePopup}>
                              Edit Responses
                            </button>
                          : <button className="btn btn-primary"
                                data-adid={adId}
                                role="button"
                                onClick={this.toggleExcludePopup}>
                              Tell Us Why
                            </button>
                        }
                      </div>
                    </div>
                  : null
                }
                <AdScreenshotInContext
                    style={{ maxWidth: '100%' }}
                    width={ad.width}
                    height={ad.height}
                    screenshot={ad.screenshot}
                    rect={ad.rect}
                    pixelRatio={ad.pixelRatio}/>
              </div>
            </div>
          )}
        </div>
        { this.state.uploading
            ? <UploadProgress
              currentAd={this.state.currentAd}
                numAds={this.state.numAds}
                error={this.state.error} />
            : null
        }
        { this.state.excludeReasonPopupVisible && this.state.excludeReasonAdId
          ? <ExcludePopup
              adId={this.state.excludeReasonAdId}
              ad={this.state.adData[this.state.excludeReasonAdId]}
              update={this.updateExcludeReasons}
              excludeReasons={this.state.excludeReasons[this.state.excludeReasonAdId]}
              dismiss={(e: React.MouseEvent) => {
                if (e.target === e.currentTarget) {
                  this.setState({ excludeReasonPopupVisible: false });
                }
              }}
              />
          : null
        }
      </>
    );
  }
}

interface ExcludePopupProps {
  ad: AdData,
  adId: string,
  excludeReasons?: ExcludeReasons,
  update: (adId: string, reason: keyof ExcludeReasons, value: boolean|string) => void
  dismiss: (e: React.MouseEvent) => void
}

class ExcludePopup extends React.Component<ExcludePopupProps, {}> {
  constructor(props: ExcludePopupProps) {
    super(props);
    this.onCheckboxChange = this.onCheckboxChange.bind(this);
    this.onTextChange = this.onTextChange.bind(this);
  }

  onCheckboxChange(e: React.ChangeEvent<HTMLInputElement>) {
    // console.log(e.target.checked)
    this.props.update(
      this.props.adId,
      e.target.id as keyof ExcludeReasons,
      e.target.checked
    );
  }

  onTextChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    this.props.update(
      this.props.adId,
      e.target.id as keyof ExcludeReasons,
      e.target.value
    );
  }

  render() {
    let { excludeReasons, ad } = this.props;
    return (
      <div className="popup-background" onClick={this.props.dismiss}>
        <div className="popup">
          <div className="popup-content">
            <div className="exclude-popup-content">
              <AdScreenshotInContext
                style={{ maxWidth: '100%', maxHeight: '400px' }}
                width={ad.width}
                height={ad.height}
                screenshot={ad.screenshot}
                rect={ad.rect}
                pixelRatio={ad.pixelRatio}/>
              <form className="exclude-popup-form">
                <h5>Why don't you want to share this ad with us?</h5>
                <div className="form-check">
                  <input className="form-check-input"
                    type="checkbox"
                    id="tooPersonal"
                    checked={excludeReasons ? excludeReasons.tooPersonal : false}
                    onChange={this.onCheckboxChange}/>
                  <label className="form-check-label" htmlFor="tooPersonal">
                    Ad reveals too much about me and/or my interests
                  </label>
                </div>
                <div className="form-check">
                  <input className="form-check-input"
                    type="checkbox"
                    id="revealsHistory"
                    checked={excludeReasons ? excludeReasons.revealsHistory : false}
                    onChange={this.onCheckboxChange}/>
                  <label className="form-check-label" htmlFor="revealsHistory">
                    The ad reveals a product or website I looked at or purchased before
                  </label>
                </div>
                <div className="form-check">
                  <input className="form-check-input"
                    type="checkbox"
                    id="incorrect"
                    checked={excludeReasons ? excludeReasons.incorrect : false}
                    onChange={this.onCheckboxChange}/>
                  <label className="form-check-label" htmlFor="incorrect">
                    The ad feels targeted or personalized, but made incorrect
                    assumptions about me
                  </label>
                </div>
                <div className="form-check">
                  <input className="form-check-input"
                    type="checkbox"
                    id="other"
                    checked={excludeReasons ? excludeReasons.other : false}
                    onChange={this.onCheckboxChange}/>
                  <label className="form-check-label" htmlFor="other">
                    Other (please explain)
                  </label>
                  <input type="text"
                      id="otherReason"
                      className="form-control"
                      value={excludeReasons && excludeReasons.otherReason ? excludeReasons.otherReason : ''}
                      onChange={this.onTextChange} />
                </div>
                <br/>
                <div className="mb-3">
                  <label htmlFor="exampleFormControlTextarea1" className="form-label">
                    <h5>(Optional) Could you describe what is in this ad, in general?</h5>
                  </label>
                  <p style={{ fontSize: '10pt' }}>
                    We are not trying to learn anything about you
                    specifically, but it would help us to know in general
                    what the ad is about, so that we can learn how advertisers
                    target people.
                  </p>
                  <textarea className="form-control"
                    id="adDescription"
                    rows={3}
                    value={excludeReasons && excludeReasons.adDescription ? excludeReasons.adDescription : ''}
                    onChange={this.onTextChange} />
                </div>
                <button className="btn btn-primary" onClick={this.props.dismiss} role="button">
                  Submit
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

interface ProgressState {
  currentAd: number,
  numAds: number,
  error: string | null
}

class UploadProgress extends React.Component<ProgressState, {}> {
  render() {
    const pctDone = this.props.numAds == 0
      ? 100
      : Math.round(100 * this.props.currentAd / this.props.numAds);
    return (
      <div className="popup-background">
        <div className="popup">
          <div className="popup-content">
            { this.props.currentAd !== this.props.numAds
              ? <>
                  <h4>Uploading Ads</h4>
                  <p>Please wait...</p>
                </>
              : <h4>Upload Complete</h4>
            }
            <progress max={this.props.numAds} value={this.props.currentAd}/>
            <div><b>{pctDone}%</b> Done</div>
            { this.props.currentAd !== this.props.numAds
              ? <div id='popup-progress-count'>
                  (Uploading ad {this.props.currentAd + 1} of {this.props.numAds})
                </div>
              : <button className="btn btn-primary" onClick={() => {
                  window.location.href = '/complete.html'
                }}>
                  Continue
                </button> }
            { this.props.error
                ? <ErrorAlert error={this.props.error}/>
                : null
            }
          </div>
        </div>
      </div>
    );
  }
}

ReactDOM.render(<ApproveAds/>, document.getElementById('container'));
import React from 'react';
import ReactDOM from 'react-dom';
import ErrorAlert from '../../common/errorAlert';
import {serverUrl} from '../../config';
import AdData from './AdData';
import AdScreenshotInContext from './AdScreenshotInContext';

interface TargetingResponse {
  isblank: boolean,
  targetingPerception?: number,
  relevance?: number,
  retargeted?: string,
  likelyToClick?: number,
}

interface State {
  adSample: (AdData & { adId: string })[]
  adIndex: number
  responses: {[adId: string]: TargetingResponse}
  error?: string
}

const SAMPLE_SIZE = 8;

export default class RelevanceSurvey extends React.Component<{}, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      adSample: [],
      adIndex: 0,
      responses: {}
    }
    this.onChange = this.onChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  async componentDidMount() {
    const { savedAds, relevanceSurveyIndex } =
      await chrome.storage.local.get(
        ['savedAds', 'relevanceSurveyIndex']);


    const adDataObj = await chrome.storage.local.get(savedAds.adIds as string[]) as {[adId: string]: AdData};

    let adsWithBids = Object.entries(adDataObj)
      .map(([adId, data]) => { return { adId: adId, ...data }})
      .filter(ad => ad.winningBidCpm !== undefined);

    if (adsWithBids.length === 0) {
      window.location.href = '/approveAds.html';
    }

    const sampleSize = Math.min(SAMPLE_SIZE - 1, adsWithBids.length - 1);

    const adIndex = relevanceSurveyIndex ? relevanceSurveyIndex : 0;
    if (adIndex >= sampleSize) {
      window.location.href = '/approveAds.html';
    }

    let sampleStep = adsWithBids.length / sampleSize;
    let adSample = [];
    let i = 0;
    while (Math.round(i) < adsWithBids.length - 1) {
      adSample.push(adsWithBids[Math.round(i)]);
      i += sampleStep;
    }
    adSample.push(adsWithBids[adsWithBids.length - 1]);

    this.setState({ adSample: adSample, adIndex: adIndex });
  }

  onChange(question: keyof TargetingResponse, value: number | string | boolean) {
    const ad = this.state.adSample[this.state.adIndex];
    const adId = ad.adId;

    let prev = this.state.responses[adId];
    if (!prev) {
      prev = { isblank: false }
    }

    let updated = {
      ...prev,
      [question]: value
    };

    this.setState((prevState) => {
      return {
        responses: {
          ...prevState.responses,
          [adId]: updated
        }
      };
    });
  }

  async onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { adIndex, adSample, responses } = this.state;
    const adId = adSample[adIndex].adId;

    try {
      const { extension_id } = await chrome.storage.local.get('extension_id');
      let res = await fetch(`${serverUrl}/relevance_survey_data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: {...responses[adId], adId: adId},
          eID: extension_id
        })
      });

      if (!res.ok) {
        this.setState({
          error: `Error occurred while sending data to the server, please `
          + `reload the page and try again. `
          + `(Error ${res.status}: ${res.statusText})`
        });
        return;
      }
      if (adIndex < adSample.length - 1) {
        this.setState({ adIndex: adIndex + 1 });
        document.getElementById('progress')?.scrollIntoView(true);
        await chrome.storage.local.set({ relevanceSurveyIndex: adIndex + 1 });
      } else {
        await chrome.storage.local.set({ relevanceSurveyIndex: adIndex + 1 });
        window.location.href = '/approveAds.html';
      }
    } catch (e) {
      this.setState({
        error: `Error occurred while sending data to the server, please `
        + `reload the page and try again. `
        + `(${e})`
      });
    }
  }


  render() {
    if (this.state.adSample.length == 0) {
      return (
        <>
          <div style={{ textAlign: 'center' }}>
            <span className="large-spinner"></span>
            <h4>Loading...</h4>
          </div>
          { this.state.error
              ? <ErrorAlert error={this.state.error}/>
              : null }
        </>
      );
    }

    console.log(this.state);

    let ad = this.state.adSample[this.state.adIndex];
    let response = this.state.responses[ad.adId] as TargetingResponse | undefined;

    const progressPct = Math.round(100 * this.state.adIndex / this.state.adSample.length);

    return (
      <>
        <div id="progress" className="progress" style={{ height: '10px', width: "75%"}}>
          <div className="progress-bar"
            role="progressbar"
            style={{ width: progressPct + '%'}}
            aria-valuenow={this.state.adIndex + 1}
            aria-valuemin={1}
            aria-valuemax={this.state.adSample.length}>
          </div>
        </div>
        <p style={{ textAlign: 'center', width: "75%" }}>
          Ad {this.state.adIndex + 1} of {this.state.adSample.length}
        </p>

        <div id="survey-container">
          <div className="ad">
            <AdScreenshotInContext
                style={{ maxWidth: '100%', maxHeight: '100%' }}
                width={ad.width}
                height={ad.height}
                screenshot={ad.screenshot}
                rect={ad.rect}
                pixelRatio={ad.pixelRatio} />
          </div>
          <form onSubmit={this.onSubmit}>
            <h6>
              <b>Check this box if the ad is blank</b>
              <br/>
              <span style={{fontSize: '10pt'}}>(i.e. there is no clearly visible ad in the screenshot)</span>
            </h6>
            <div className="form-check">
              <input className="form-check-input"
                type="checkbox"
                name="isblank"
                id="isblank" value="yes"
                checked={response?.isblank === true}
                onChange={(e) => this.onChange('isblank', e.target.checked)} />
              <label className="form-check-label" htmlFor="isblank">
                Yes
              </label>
            </div>
            <br/>
            <div style={{ color: response?.isblank ? '#c3c3c3' : 'inherit'}}>
              <SemanticDifferentialScale
                  name="relevance"
                  question="How relevant is this ad to your interests?"
                  minLabel="Not relevant at all"
                  maxLabel="Very relevant"
                  disabled={response?.isblank}
                  value={response?.relevance}
                  onChange={this.onChange} />
              <SemanticDifferentialScale
                name="targetingPerception"
                question="How personalized or targeted is this ad to you?"
                description="i.e. How much do you think this advertiser used your web history
                demographics (like age, gender, or ethnicity), or other data about you to specifically target
                you with this ad?"
                minLabel="Not personalized or targeted at all"
                maxLabel="Very personalized or targeted"
                value={response?.targetingPerception}
                disabled={response?.isblank}
                onChange={this.onChange} />
              <SemanticDifferentialScale
                name="likelyToClick"
                question="How likely would you be to click on this ad?"
                minLabel="Very unlikely"
                maxLabel="Very likely"
                value={response?.likelyToClick}
                disabled={response?.isblank}
                onChange={this.onChange} />
              <h6>
                <b>
                  Have you ever previously clicked on this ad, viewed the product or
                  website featured in the ad, or bought the product in the ad?
                </b>
              </h6>
              <div className="form-check">
                <input className="form-check-input"
                  type="radio"
                  name="retargeted"
                  id="retargeted-yes" value="yes"
                  checked={response?.retargeted === 'yes'}
                  onChange={() => this.onChange('retargeted', 'yes')}
                  disabled={response?.isblank}
                  required />
                <label className="form-check-label" htmlFor="retargeted-yes">
                  Yes
                </label>
              </div>
              <div className="form-check">
                <input className="form-check-input"
                  type="radio"
                  name="retargeted"
                  id="retargeted-no" value="no"
                  checked={response?.retargeted === 'no'}
                  onChange={() => this.onChange('retargeted', 'no')}
                  disabled={response?.isblank}
                  required />
                <label className="form-check-label" htmlFor="retargeted-no">
                  No
                </label>
              </div>
              <div className="form-check">
                <input className="form-check-input"
                  type="radio"
                  name="retargeted"
                  id="retargeted-notsure" value="notsure"
                  checked={response?.retargeted === 'notsure'}
                  onChange={() => this.onChange('retargeted', 'notsure')}
                  disabled={response?.isblank}
                  required/>
                <label className="form-check-label" htmlFor="retargeted-notsure">
                  Not Sure
                </label>
              </div>
            </div>
            <br/>
            { this.state.error
              ? <ErrorAlert error={this.state.error}/>
              : null
            }
            <button type="submit" className="btn btn-primary">
              Next
            </button>
          </form>
        </div>
      </>
    );
  }
}

interface SDSProps {
  question: string,
  minLabel: string,
  maxLabel: string,
  description?: string,
  value?: number,
  disabled?: boolean,
  name: keyof TargetingResponse,
  onChange: (name: keyof TargetingResponse, value: number) => void
}

const scaleIndices = [1, 2, 3, 4, 5];

class SemanticDifferentialScale extends React.Component<SDSProps, {}> {
  render() {
    return (
      <div>
        <h6><b>{this.props.question}</b></h6>
        {this.props.description ?
        <p style={{ fontSize: '10pt' }}>{this.props.description}</p> :
        null}
        <table className="scale-table">
          <thead>
            <tr>
            <th className="scale-label"></th>
            <th className="scale-item">1</th>
            <th className="scale-item">2</th>
            <th className="scale-item">3</th>
            <th className="scale-item">4</th>
            <th className="scale-item">5</th>
            <th className="scale-label"></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ textAlign: 'right' }}>{this.props.minLabel}</td>
              { scaleIndices.map((scaleIdx) =>
                <td key={this.props.name + scaleIdx}>
                  <div className="radio-wrapper">
                    <input type="radio"
                      className="form-check-input"
                      name={this.props.name}
                      value={scaleIdx}
                      checked={this.props.value === scaleIdx}
                      aria-label={scaleIndices.toString()}
                      disabled={this.props.disabled}
                      onChange={() => this.props.onChange(this.props.name, scaleIdx)}
                      required />
                  </div>
                </td>
              )}
              <td>{this.props.maxLabel}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}

ReactDOM.render(<RelevanceSurvey />, document.getElementById('react'))

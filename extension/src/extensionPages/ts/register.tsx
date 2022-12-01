import React from 'react';
import ReactDOM from 'react-dom';
import { v4 as uuid } from 'uuid';
import ErrorAlert from '../../common/errorAlert';
import { serverUrl } from '../../config';

interface State {
  prolificId: string,
  error?: string,
  loading: boolean
}

class Register extends React.Component<{}, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      prolificId: '',
      error: undefined,
      loading: false
    };
    this.registerUser = this.registerUser.bind(this);
  }

  /**
   * Generates new extension id upon installation
   * which is associated with a prolific id
   */
  async registerUser(prolificId: string) {
    // Get extension ID from storage, generate if it doesn't exist
    let extensionId =
        (await chrome.storage.local.get('extension_id')).extension_id;
    if (!extensionId) {
      extensionId = uuid();
      await chrome.storage.local.set({ 'extension_id': extensionId });
    }

    try {
      this.setState({ loading: true, error: undefined });
      const res = await fetch(`${serverUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          extensionId: extensionId,
          prolificId: prolificId
        })
      });
      this.setState({ loading: false });

      if (res.ok) {
        window.location.href = '/intro.html';
        return;
      }
      if (res.status === 403) {
        this.setState({
          error: 'Sorry, this Prolific ID is not in our system. Please check ' +
            'and make sure that it is correct. If you were not admitted to ' +
            'this study through the pre-study, unfortunately you are not ' +
            'eligible.',
          loading: false});
      } else if (res.status === 502) {
        this.setState({
          error: 'Sorry, the research study server appears to be offline. ' +
            'Please let us know via Prolific or email and we will fix it as ' +
            'soon as possible.'
        });
      } else {
        this.setState({
          error: 'Unknown error'
        });
      }

    } catch (e) {
      console.error(e);
      this.setState({
        error: 'There seems to be a problem with the internet connection. ' +
          'Please try again.',
        loading: false
      })
      throw e;
    }
  }

  render() {
    return (
      <div className="container">
        <div className="vspace">
          <h2>Welcome to the AdEcologist Study</h2>

          <p>
            This is placeholder text for the registration page. You can modify
            this page (register.html, register.tsx) for whatever onboarding
            procedures you would like to use, such as a consent form, or
            asking them to log in with their MTurk or Prolific ID.
          </p>

          <label htmlFor="prolificId" className="form-label">
            To get started, please enter your Prolific ID.
          </label>
          <input type="text" className="form-control" id="prolificId"
            placeholder="Enter your Prolific ID"
            value={this.state.prolificId}
            onChange={(e) => this.setState({ prolificId: e.target.value })}/>
        </div>
        <div className="vspace">
          <button type="button" className="btn btn-primary"
              onClick={() => { this.registerUser(this.state.prolificId) }}
              disabled={this.state.loading}>
            Submit
          </button>
          { this.state.loading
            ? <span className="spinner"></span>
            : null
          }
        </div>

        { this.state.error
          ? <ErrorAlert error={this.state.error}/>
          : null }
      </div>
    );
  }
}

ReactDOM.render(<Register/>, document.getElementById('react'));

import React from 'react';

interface Props {
  error: Error | string
}

export default class ErrorAlert extends React.Component<Props, {}> {
  render() {
    return (
      <div className="alert alert-danger" role="alert">
        <p>{this.props.error}</p>
        <hr/>
        <p>
          If you are having issues, please contact the researchers through
          Prolific, or at&nbsp;
          <a href="mailto:uwadstudy@cs.washington.edu" className="alert-link">
            uwadstudy@cs.washington.edu
          </a>.
        </p>
      </div>);
  }
}
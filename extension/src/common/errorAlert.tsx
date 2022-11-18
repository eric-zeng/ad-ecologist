import React from 'react';

interface Props {
  error: Error | string
}

export default class ErrorAlert extends React.Component<Props, {}> {
  render() {
    console.log(this.props.error)
    return (
      <div className="alert alert-danger" role="alert">
        <p>{this.props.error}</p>
      </div>);
  }
}
import React from 'react';
import ReactDOM from 'react-dom';

interface State {
  prolificId: string,
  age: number,
  whiteChecked: boolean,
  blackAfricanAmericanChecked: boolean,
  hispanicLatinoChecked: boolean,
  asianChecked: boolean,
  otherChecked: boolean
}

interface Props {

}

class Survey extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      prolificId: '',
      age: NaN,
      whiteChecked: false,
      blackAfricanAmericanChecked: false,
      hispanicLatinoChecked: false,
      asianChecked: false,
      otherChecked: false
    }

    this.onProlificIdChange = this.onProlificIdChange.bind(this);
    this.onAgeChange = this.onAgeChange.bind(this);

    // this.onCheckboxChange = this.onCheckboxChange.bind(this);
    this.onWhiteChange = this.onWhiteChange.bind(this);
    this.onBlackAfricanAmericanChange = this.onBlackAfricanAmericanChange.bind(this);
    this.onHispanicLatinoChange = this.onHispanicLatinoChange.bind(this);
    this.onAsianChange = this.onAsianChange.bind(this);
    this.onOtherChange = this.onOtherChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  onProlificIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ prolificId: e.target.value });
  }

  onAgeChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ age: e.target.valueAsNumber });
  }

  onWhiteChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ whiteChecked: !this.state.whiteChecked });
  }

  onBlackAfricanAmericanChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ blackAfricanAmericanChecked: !this.state.blackAfricanAmericanChecked });
  }

  onHispanicLatinoChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ hispanicLatinoChecked: !this.state.hispanicLatinoChecked });
  }

  onAsianChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ asianChecked: !this.state.asianChecked });
  }

  onOtherChange(e: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ otherChecked: !this.state.otherChecked });
  }

  onSubmit(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    console.log('Submit button clicked');
    console.log(this.state.prolificId);
    console.log(this.state.whiteChecked);
  }

  render() {
    return (
      <div className="container">
        <h1>Hello, study participant</h1>
        <h2>First, some questions about you...</h2>
        <form>
          <div className="form-group">
            <label htmlFor="prolificId">What is your Prolific ID?</label>
            <input type="text" className="form-control" id="prolificId" aria-describedby="emailHelp" placeholder="Prolific ID"
                onChange={this.onProlificIdChange}
                value={this.state.prolificId}
            />
          </div>
          <div className="form-group">
            <label htmlFor="age">What is your age?</label>
            <input type="number" className="form-control" id="age" aria-describedby="emailHelp" placeholder="Age"
                onChange={this.onAgeChange}
                value={this.state.prolificId}
            />
          </div>
          <div className="form-check">
            <label htmlFor="age">What is your ethnicity?</label>
            <br></br>
            <input type="checkbox" className="form-check-input" id="white"
                checked={this.state.whiteChecked}
                onChange={this.onWhiteChange}
            />
            <label className="form-check-label" htmlFor="checkWhite">
              White
            </label>
            <br></br>
            <input type="checkbox" className="form-check-input" id="blackAfricanAmerican"
                checked={this.state.blackAfricanAmericanChecked}
                onChange={this.onBlackAfricanAmericanChange}
            />
            <label className="form-check-label" htmlFor="checkBlackAfricanAmerican">
              Black or African American
            </label>
            <br></br>
            <input type="checkbox" className="form-check-input" id="hispanicLatino"
                checked={this.state.hispanicLatinoChecked}
                onChange={this.onHispanicLatinoChange}
            />
            <label className="form-check-label" htmlFor="checkHispanicLatino">
              Hispanic or Latino
            </label>
            <br></br>
            <input type="checkbox" className="form-check-input" id="asian"
                checked={this.state.asianChecked}
                onChange={this.onAsianChange}
            />
            <label className="form-check-label" htmlFor="checkAsian">
              Asian
            </label>
            <br></br>
            <input type="checkbox" className="form-check-input" id="other"
                checked={this.state.otherChecked}
                onChange={this.onOtherChange}
            />
            <label className="form-check-label" htmlFor="checkOther">
              Other
            </label>
            <br></br>
          </div>
          <button type="submit" className="btn btn-primary" onClick={this.onSubmit}>Submit</button>
        </form>
      </div>
    );
  }
}

ReactDOM.render(<Survey/>, document.getElementById('react'));
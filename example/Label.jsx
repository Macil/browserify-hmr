import React from 'react';
import { hot } from 'react-hot-loader';

class Label extends React.Component {
  render() {
    return (
      <div className="commentBox">
        Hello, world!
      </div>
    );
  }
}

export default hot(module)(Label);

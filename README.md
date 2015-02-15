# React Side Effect
Create components whose prop changes map to a global side effect.

## Installation

```
npm install --save react-side-effect
```

## Use Cases

* Setting `document.style.overflow` or background color depending on current screen;
* Firing Flux actions using declarative API depending on current screen;
* Some crazy stuff I haven't thought about.

## API

#### `createSideEffect: (onChange: Array<Props> -> ()) -> ReactComponent`

Returns a component that, when mounting, unmounting or receiving new props, calls `onChange` with `props` of **each mounted instance**.
It's up to you to `reduce` them, use innermost values, or whatever you fancy.

Component will have a static `dispose()` method to clear the stack of mounted instances.  
When rendering on server, you must call it after each request.

## Usage

Here's how to implement [React Document Title](https://github.com/gaearon/react-document-title) (both client and server side) using React Side Effect:

```js
'use strict';

var React = require('react'),
    createSideEffect = require('react-side-effect');

/**
 * Extract title from a list of each mounted component's props.
 * We're interested in the innermost title, but for other use cases we might want to call `propList.reduce`.
 */
function extractTitle(propsList) {
  var innermostProps = propsList[propsList.length - 1];
  if (innermostProps) {
    return innermostProps.title;
  }
}

var _serverTitle = null;

/**
 * Generate a component that reacts to mounting, onmounting and prop changes by updating document title.
 */
var SetDocumentTitle = createSideEffect(function handleChange(propsList) {
  var title = extractTitle(propsList);

  if (typeof document !== 'undefined') {
    document.title = title || '';
  } else {
    _serverTitle = title || null;
  }
});

/**
 * Create a wrapper for it with propTypes, displayName and helpers for server and testing.
 */
var DocumentTitle = React.createClass({
  propTypes: {
    title: React.PropTypes.string.isRequired
  },

  statics: {
    /**
     * Peek at current title (for tests).
     */
    peek: function () {
      return _serverTitle;
    },

    /**
     * Call this on server after each request to get current title.
     */
    rewind: function () {
      var title = _serverTitle;
      SetDocumentTitle.dispose();
      return title;
    }
  },

  render: function () {
    return React.createElement(SetDocumentTitle, this.props);
  }
});

module.exports = DocumentTitle;
```

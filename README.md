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

## How's That Different from `componentDidUpdate`?

It gathers current props across *the whole tree* before passing them to side effect. For example, this allows you to create `<BodyStyle style>` component like this:

```js
// RootComponent.js
return (
  <BodyStyle style={{ backgroundColor: 'red' }}>
    {this.state.something ? <SomeComponent /> : <OtherComponent />}
  </BodyStyle>
);

// SomeComponent.js
return (
  <BodyStyle style={{ backgroundColor: this.state.color }}>
    <div>Choose color: <input valueLink={this.linkState('color')} /></div>
  </BodyStyle>
);
```

and let the effect handler merge `style` from different level of nesting with innermost winning:

```js
var BodyStyle = createSideEffect(function handleChange(propsList) {
  var style = {};
  propsList.forEach(function (props) {
    Object.assign(style, props.style);
  });
  
  for (var key in style) {
    document.style[key] = style[key];
  }
});
```


## API

#### `createSideEffect: (onChange: Array<Props> -> (), mixin: Object?) -> ReactComponent`

Returns a component that, when mounting, unmounting or receiving new props, calls `onChange` with `props` of **each mounted instance**.
It's up to you to `reduce` them, use innermost values, or whatever you fancy.

Component will have a static `dispose()` method to clear the stack of mounted instances.  
When rendering on server, you must call it after each request.

You can use optional second `mixin` parameter to specify `propTypes`, `displayName` or `statics`. It will be mixed into the generated component.

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
var DocumentTitle = createSideEffect(function handleChange(propsList) {
  var title = extractTitle(propsList);

  if (typeof document !== 'undefined') {
    document.title = title || '';
  } else {
    _serverTitle = title || null;
  }
}, {
  displayName: 'DocumentTitle',

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
      this.dispose();
      return title;
    }
  }
});

module.exports = DocumentTitle;
```

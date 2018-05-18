# React Reffect

[![Downloads](https://img.shields.io/npm/dm/react-reffect.svg)](https://npmjs.com/react-reffect)
[![npm version](https://img.shields.io/npm/v/react-reffect.svg?style=flat)](https://www.npmjs.com/package/react-reffect)

Create components whose prop changes map to a global side effect with the power of redux and new Context API.

!! This is a fork of [react-side-effect](https://github.com/gaearon/react-side-effect), thanks to [Dan Abramov](http://github.com/gaearon) for the awesome work!

## Different from react-side-effect and the motivation of this project

When you use react-side-effect on server, you must call `rewind()` after every `renderToString()`, otherwise it will result a memory leak and incorrect results. However `renderToString()` is so heavy and [blocks the node.js event loop](https://medium.com/@markuretsky/asynchronous-react-server-side-rendering-813a934a1ad1).

React 16 supports Streaming to resolve this problem. You can use `renderTo(Static)NodeStream` instead of `renderToString()` and `renderToStaticMarkup`. Since it is an asynchronous api, thr non-thread-safe `react-side-effect` and `rewind()` will be broken and cause incorrect result.

This library use redux and [React 16.3 new context API](https://medium.com/dailyjs/reacts-%EF%B8%8F-new-context-api-70c9fe01596b) (use react-broadcast as a polyfill) to help you create a context for each request and prevent memory leak, so that you can use it safely both on server side and client side.

## Installation

```
npm install --save react-reffect
```

Note: React Reffect requires React 15.3+.

### As a script tag

#### Development

```
<script src="https://unpkg.com/react/umd/react.development.js" type="text/javascript"></script>
<script src="https://unpkg.com/react-reffect/lib/index.umd.js" type="text/javascript"></script>
```

#### Production

```
<script src="https://unpkg.com/react/umd/react.production.min.js" type="text/javascript"></script>
<script src="https://unpkg.com/react-reffect/lib/index.umd.min.js" type="text/javascript"></script>
```

## Use Cases

* Setting `document.body.style.margin` or background color depending on current screen;
* Firing Flux actions using declarative API depending on current screen;
* Some crazy stuff I haven't thought about.

## How's That Different from `componentDidUpdate`?

It gathers current props across *the whole tree* before passing them to side effect. For example, this allows you to create `<BodyStyle style>` component like this:

```js
// RootComponent.js
import BodyStyle from './BodyStyle';
const store = BodyStyle.createStore();
return (
  <BodyStyle.Provider store={store}>
    <BodyStyle.Consumer style={{ backgroundColor: 'red' }}>
      {this.state.something ? <SomeComponent /> : <OtherComponent />}
    </BodyStyle.Consumer>
  </BodyStyle.Provider>
);

// SomeComponent.js
return (
  <BodyStyle.Consumer style={{ backgroundColor: this.state.color }}>
    <div>Choose color: <input valueLink={this.linkState('color')} /></div>
  </BodyStyle.Consumer>
);
```

and let the effect handler merge `style` from different level of nesting with innermost winning:

```js
// BodyStyle.js
import { Component, Children } from 'react';
import PropTypes from 'prop-types';
import createSideEffect from 'react-reffect';

class BodyStyle extends Component {
  render() {
    return Children.only(this.props.children);
  }
}

BodyStyle.propTypes = {
  style: PropTypes.object.isRequired
};

function reducePropsToState(propsList) {
  var style = {};
  propsList.forEach(function (props) {
    Object.assign(style, props.style);
  });
  return style;
}

function handleStateChangeOnClient(style) {
  Object.assign(document.body.style, style);
}

export default createSideEffect(
  reducePropsToState,
  handleStateChangeOnClient
)(BodyStyle);
```

On the server, you’ll be able to call `store.peek()` to get the current state. The `handleStateChangeOnClient` will only be called on the client.

## Migrate from react-side-effect

### 1. Change withSideEffect to createSideEffect and use { Consumer } instead of original result. Remove `mapStateOnServer`.

``` js
const BodyStyle = withSideEffect(
  reducePropsToState,
  handleStateChangeOnClient
)(BodyStyle);

export default BodyStyle;
```

to

``` js
const { Provider, Consumer, createStore } = withSideEffect(
  reducePropsToState,
  handleStateChangeOnClient
)(BodyStyle);

export default Consumer;
export const BodyStyleProvider = Provider;
export const createBodyStyleStore = createStore;
```

### 2. Wrap root component with `Provider`

``` js
const App = (
  <MyRootComponent />
);
```

to

``` js
const App = (
  <BodyStyleProvider>
    <MyRootComponent />
  </BodyStyleProvider>
);
```

### 3. Create a store both on server side and client side and use it with `Provider`. Make sure create a store for each request on server side.

``` js
const store = createBodyStyleStore();
const App = (
  <BodyStyleProvider store={store}>
    <MyRootComponent />
  </BodyStyleProvider>
);
```

### 4. Migrate `mapStateOnServer` and `rewind()`

``` js
const result = BodyStyle.rewind()
```

to

``` js
const result = mapStateOnServer(store.peek());
```

## API

#### `createSideEffect: (reducePropsToState, handleStateChangeOnClient) -> ReactComponent -> {Provider, Consumer, createStore}

A helper to create Provider, Consumer and createStore. When mounting, unmounting or receiving new props on Consumer, calls `reducePropsToState` with `props` of **each mounted instance**. It is up to you to return some state aggregated from these props.

On the client, every time the returned component is (un)mounted or its props change, `reducePropsToState` will be called, and the recalculated state will be passed to `handleStateChangeOnClient` where you may use it to trigger a side effect.

On the server, `handleStateChangeOnClient` will not be called. You will still be able to call the static `peek()` method on the returned component class to retrieve the current state after a `renderToString()` call. Make sure to create a new store for each request, otherwise it will result in a memory leak and incorrect information. 

## Usage

Here's how to implement [React Document Title](https://github.com/gaearon/react-document-title) (both client and server side) using React Reffect:

```js
import React, { Children, Component } from 'react';
import PropTypes from 'prop-types';
import createSideEffect from 'react-reffect';

class DocumentTitle extends Component {
  render() {
    if (this.props.children) {
      return Children.only(this.props.children);
    } else {
      return null;
    }
  }
}

DocumentTitle.propTypes = {
  title: PropTypes.string.isRequired
};

function reducePropsToState(propsList) {
  var innermostProps = propsList[propsList.length - 1];
  if (innermostProps) {
    return innermostProps.title;
  }
}

function handleStateChangeOnClient(title) {
  document.title = title || '';
}

const SideEffect = createSideEffect(
  reducePropsToState,
  handleStateChangeOnClient
)(DocumentTitle);

export const createDocumentTitleStore = SideEffect.createStore;
export const DocumentTitleProvider = SideEffect.Provider;
export default SideEffect.Consumer;
```

## LICENSE

MIT

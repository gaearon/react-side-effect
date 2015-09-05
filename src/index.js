'use strict';

var React = require('react');
var ExecutionEnvironment = require('fbjs/lib/ExecutionEnvironment');
var shallowEqual = require('fbjs/lib/shallowEqual');
var Component = React.Component;

module.exports = function withSideEffect(
  reducePropsToState,
  handleStateChangeOnClient, 
  mapStateOnServer
) {
  if (typeof reducePropsToState !== 'function') {
    throw new Error('Expected reducePropsToState to be a function.');
  }
  if (typeof handleStateChangeOnClient !== 'function') {
    throw new Error('Expected handleStateChangeOnClient to be a function.');
  }
  if (typeof mapStateOnServer !== 'undefined' && typeof mapStateOnServer !== 'function') {
   throw new Error('Expected mapStateOnServer to either be undefined or a function.'); 
  }

  return function wrap(WrappedComponent) {
    if (typeof WrappedComponent !== 'function') {
      throw new Error('Expected WrappedComponent to be a React component.');
    }

    class SideEffect extends Component {
      shouldComponentUpdate(nextProps) {
        return !shallowEqual(nextProps, this.props);
      }

      componentWillMount() {
        mountedInstances.push(this);
        emitChange();
      }

      componentDidUpdate() {
        emitChange();
      }

      componentWillUnmount() {
        var index = mountedInstances.indexOf(this);
        mountedInstances.splice(index, 1);
        emitChange();
      }

      render() {
        return React.createElement(WrappedComponent, this.props);
      }
    }

    // Try to use displayName of wrapped component
    var wrappedDisplayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
    SideEffect.displayName = 'SideEffect(' + wrappedDisplayName + ')';

    // Expose canUseDOM so tests can monkeypatch it
    SideEffect.canUseDOM = ExecutionEnvironment.canUseDOM;

    var mountedInstances = [];
    var state;

    function emitChange() {
      state = reducePropsToState(mountedInstances.map(function (instance) {
        return instance.props;
      }));

      if (SideEffect.canUseDOM) {
        handleStateChangeOnClient(state);
      } else if (mapStateOnServer) {
        state = mapStateOnServer(state);
      }
    }

    SideEffect.peek = function peek() {
      return state;
    };

    SideEffect.rewind = function rewind() {
      if (SideEffect.canUseDOM) {
        throw new Error('You may ony call rewind() on the server. Call peek() to read the current state.');
      }

      var recordedState = state;
      state = undefined;
      mountedInstances = [];
      return recordedState;
    }

    return SideEffect;
  }
}

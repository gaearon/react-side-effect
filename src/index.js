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

    function SideEffect() {
      Component.apply(this, arguments);
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

    SideEffect.prototype = {
      shouldComponentUpdate: function shouldComponentUpdate(nextProps) {
        return !shallowEqual(nextProps, this.props);
      },

      componentWillMount: function componentWillMount() {
        mountedInstances.push(this);
        emitChange();
      },

      componentDidUpdate: function componentDidUpdate() {
        emitChange();
      },

      componentWillUnmount: function componentWillUnmount() {
        var index = mountedInstances.indexOf(this);
        mountedInstances.splice(index, 1);
        emitChange();
      },

      render: function render() {
        return React.createElement(WrappedComponent, this.props);
      }
    };

    return SideEffect;
  }
}

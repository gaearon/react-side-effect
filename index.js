'use strict';

var React = require('react'),
    invariant = require('fbjs/lib/invariant'),
    shallowEqual = require('fbjs/lib/shallowEqual');

function createSideEffect(onChange, mixin, render) {
  invariant(
    typeof onChange === 'function',
    'onChange(propsList) is a required argument.'
  );

  var mountedInstances = [];

  function emitChange() {
    onChange(mountedInstances.map(function (instance) {
      return instance.props;
    }));
  }

  var componentPrototype = {
    mixins: [mixin],

    statics: {
      dispose: function () {
        mountedInstances = [];
        emitChange();
      }
    },

    shouldComponentUpdate: function (nextProps) {
      return !shallowEqual(nextProps, this.props);
    },

    componentWillMount: function () {
      mountedInstances.push(this);
      emitChange();
    },

    componentDidUpdate: function () {
      emitChange();
    },

    componentWillUnmount: function () {
      var index = mountedInstances.indexOf(this);
      mountedInstances.splice(index, 1);
      emitChange();
    },

    render: function () {
      if (this.props.children) {
        return React.Children.only(this.props.children);
      } else {
        return null;
      }
    }
  };

  if(render) {
    invariant(
      typeof render === 'function',
      'if specified, render must be a function.'
    );

    componentPrototype.render = render;
  }

  return React.createClass(componentPrototype);
}

module.exports = createSideEffect;

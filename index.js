var React = require('react'),
    invariant = require('react/lib/invariant'),
    shallowEqual = require('react/lib/shallowEqual');

function createSideEffect(onChange, options) {
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

  return React.createClass({
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
  });
}

module.exports = createSideEffect;
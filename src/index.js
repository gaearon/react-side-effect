import React, { useLayoutEffect } from 'react';

const canUseDOM = !!(
  typeof window !== 'undefined' &&
  window.document &&
  window.document.createElement
);

export default function withSideEffect(
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

  function getDisplayName(WrappedComponent) {
    return WrappedComponent.displayName || WrappedComponent.name || 'Component';
  }

  return function wrap(WrappedComponent) {
    if (typeof WrappedComponent !== 'function') {
      throw new Error('Expected WrappedComponent to be a React component.');
    }

    let mountedInstances = [];
    let state;

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

    const SideEffect = ({ ...props }) => {
      useLayoutEffect(() => {
        const instance = <SideEffect {...props} />;
        mountedInstances.push(instance);
        emitChange();

        return () => {
          const index = mountedInstances.indexOf(instance);
          mountedInstances.splice(index, 1);
          emitChange();
        };
      }, [props]);

      return <WrappedComponent {...props} />;
    };

    SideEffect.canUseDOM = canUseDOM;
    SideEffect.peek = () => state;
    SideEffect.displayName = `SideEffect(${getDisplayName(WrappedComponent)})`;
    SideEffect.rewind = function() {
      if (SideEffect.canUseDOM) {
        throw new Error(
          'You may only call rewind() on the server. Call peek() to read the current state.'
        );
      }

      const recordedState = state;
      state = undefined;
      mountedInstances = [];
      return recordedState;
    };

    return SideEffect;
  };
}

import React from "react";
import PropTypes from "prop-types";

import getDisplayName from "./getDisplayName";

export default function createProvider(SideEffectContext, WrappedComponent) {
  const SideEffectProvider = ({ store, children }) => {
    if (!store || !store.dispatch || !store.getState) {
      throw new Error("Expected store to be a redux store.");
    }
    return (
      <SideEffectContext.Provider value={store}>
        {children}
      </SideEffectContext.Provider>
    );
  };

  SideEffectProvider.propTypes = {
    store: PropTypes.shape({
      subscribe: PropTypes.func.isRequired,
      dispatch: PropTypes.func.isRequired,
      getState: PropTypes.func.isRequired
    }).isRequired,
    children: PropTypes.element.isRequired
  };

  SideEffectProvider.displayName = `SideEffectProvider(${getDisplayName(
    WrappedComponent
  )})`;
  return SideEffectProvider;
}

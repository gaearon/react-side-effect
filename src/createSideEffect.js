import React from "react";
import { createStore, applyMiddleware } from "redux";
import createReactContext from "create-react-context";

import rootReducer from "./modules";
import createProvider from "./createProvider";
import createConsumer from "./createConsumer";

const createContext = React.createContext || createReactContext;

export default function createSideEffect(
  reducePropsToState,
  handleStateChangeOnClient
) {
  if (typeof reducePropsToState !== "function") {
    throw new Error("Expected reducePropsToState to be a function.");
  }
  if (typeof handleStateChangeOnClient !== "function") {
    throw new Error("Expected handleStateChangeOnClient to be a function.");
  }

  const createStoreBase = applyMiddleware(({ getState }) => next => action => {
    if (!action.meta.canUseDOM) {
      return next(action);
    }
    const prevState = getState();
    const result = next(action);
    const nextState = getState();
    if (prevState !== nextState) {
      const state = reducePropsToState(nextState.propsList);
      handleStateChangeOnClient(state);
    }
    return result;
  })(createStore);

  function createSideEffectStore(preloadedState, enhancer) {
    const store = createStoreBase(rootReducer, preloadedState, enhancer);
    return {
      ...store,
      peek: () => reducePropsToState(store.getState().propsList)
    };
  }

  return function wrap(WrappedComponent) {
    if (typeof WrappedComponent !== "function") {
      throw new Error("Expected WrappedComponent to be a React component.");
    }
    const SideEffectContext = createContext();
    return {
      Provider: createProvider(SideEffectContext, WrappedComponent),
      Consumer: createConsumer(SideEffectContext, WrappedComponent),
      createStore: createSideEffectStore
    };
  };
}

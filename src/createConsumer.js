import React from "react";
import hoistNonReactStatics from "hoist-non-react-statics";
import ExecutionEnvironment from "exenv";

import { addProps, removeProps } from "./modules";
import getDisplayName from "./getDisplayName";

export default function createConsumer(SideEffectContext, WrappedComponent) {
  class SideEffectConsumer extends React.PureComponent {
    constructor(props) {
      super(props);
      this.renderWithStore = this.renderWithStore.bind(this);
    }

    renderWithStore(store) {
      this.store = store;
      if (this.store) {
        this.store.dispatch(
          addProps(this, this.props, SideEffectConsumer.canUseDOM)
        );
      }
      return <WrappedComponent {...this.props} />;
    }

    componentWillUnmount() {
      if (this.store) {
        this.store.dispatch(removeProps(this, SideEffectConsumer.canUseDOM));
      }
    }

    render() {
      return (
        <SideEffectContext.Consumer>
          {this.renderWithStore}
        </SideEffectContext.Consumer>
      );
    }
  }
  hoistNonReactStatics(SideEffectConsumer, WrappedComponent);
  SideEffectConsumer.canUseDOM = ExecutionEnvironment.canUseDOM;
  SideEffectConsumer.displayName = `SideEffectConsumer(${getDisplayName(
    WrappedComponent
  )})`;
  return SideEffectConsumer;
}

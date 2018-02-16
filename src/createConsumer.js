import React from "react";
import PropTypes from "prop-types";

import { addProps, removeProps } from "./modules";
import getDisplayName from "./getDisplayName";

const storeShape = PropTypes.shape({
  subscribe: PropTypes.func.isRequired,
  dispatch: PropTypes.func.isRequired,
  getState: PropTypes.func.isRequired
}).isRequired;

export default function createConsumer(SideEffectContext, WrappedComponent) {
  class SideEffect extends React.PureComponent {
    static displayName = `SideEffect(${getDisplayName(WrappedComponent)})`;

    static propTypes = {
      store: storeShape
    };

    constructor(props) {
      super(props);
    }

    componentWillMount() {
      if (this.props.store) {
        const { store, ...restProps } = this.props;
        this.props.store.dispatch(addProps(this, restProps));
      }
    }

    componentDidUpdate() {
      if (this.props.store) {
        const { store, ...restProps } = this.props;
        this.props.store.dispatch(addProps(this, restProps));
      }
    }

    componentWillUnmount() {
      if (this.props.store) {
        this.props.store.dispatch(removeProps(this));
      }
    }

    render() {
      const { store, ...restProps } = this.props;
      return <WrappedComponent {...restProps} />;
    }
  }

  const SideEffectConsumer = props => (
    <SideEffectContext.Consumer>
      {store => <SideEffect {...props} store={store} />}
    </SideEffectContext.Consumer>
  );
  SideEffectConsumer.displayName = `SideEffectConsumer(${getDisplayName(
    WrappedComponent
  )})`;
  return SideEffectConsumer;
}

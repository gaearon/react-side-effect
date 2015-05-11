import React from "react";
import invariant from "react/lib/invariant";
import shallowEqual from "react/lib/shallowEqual";

const RESERVED_PROPS = {
    arguments: true,
    caller: true,
    key: true,
    length: true,
    name: true,
    prototype: true,
    ref: true,
    type: true
};

export default (Component) => {
    invariant(
        typeof Component.handleChange === "function",
        "handleChange(propsList) is not a function."
    );

    let mountedInstances = [];
    let emitChange = () => {
        Component.handleChange(mountedInstances.map(instance => instance.props));
    };

    class CreateSideEffect extends React.Component {
        static dispose() {
            mountedInstances = [];
            emitChange();
        };

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
            let index = mountedInstances.indexOf(this);
            mountedInstances.splice(index, 1);
            emitChange();
        }

        render() {
            return (
                <Component {...this.props} />
            );
        }
    }

    Object.getOwnPropertyNames(Component).filter(componentKey => {
        return Component.hasOwnProperty(componentKey) && !RESERVED_PROPS[componentKey];
    }).forEach(componentKey => {
        CreateSideEffect[componentKey] = Component[componentKey];
    });

    return CreateSideEffect;
};

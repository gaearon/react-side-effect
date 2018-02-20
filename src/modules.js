export const ADD_PROPS = "effect/ADD";
export const REMOVE_PROPS = "effect/REMOVE";

export function addProps(instance, props, canUseDOM) {
  return {
    type: ADD_PROPS,
    payload: {
      instance,
      props
    },
    meta: {
      canUseDOM
    }
  };
}

export function removeProps(instance, canUseDOM) {
  return {
    type: REMOVE_PROPS,
    payload: {
      instance
    },
    meta: {
      canUseDOM
    }
  };
}

function getInitState() {
  return {
    mountedInstances: [],
    propsList: []
  };
}

export default function rootReducer(state = getInitState(), action) {
  switch (action.type) {
    case ADD_PROPS: {
      const { instance, props } = action.payload;
      const idx = state.mountedInstances.indexOf(instance);
      if (idx === -1) {
        return {
          mountedInstances: [...state.mountedInstances, instance],
          propsList: [...state.propsList, props]
        };
      }
      if (state.propsList[idx] !== props) {
        const newInstanceProps = [].concat(state.propsList);
        newInstanceProps[idx] = props;
        return {
          mountedInstances: state.mountedInstances,
          propsList: newInstanceProps
        };
      }
      return state;
    }
    case REMOVE_PROPS: {
      const { mountedInstances, propsList } = state;
      const { instance } = action.payload;
      const idx = mountedInstances.indexOf(instance);
      if (idx === -1) {
        return state;
      }
      return {
        mountedInstances: mountedInstances
          .slice(0, idx)
          .concat(mountedInstances.slice(idx + 1)),
        propsList: propsList.slice(0, idx).concat(propsList.slice(idx + 1))
      };
    }
    default:
      return state;
  }
}

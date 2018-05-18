import { expect } from "chai";
import React from "react";
import PropTypes from "prop-types";
import { JSDOM } from "jsdom";
import { renderToStaticMarkup } from "react-dom/server";
import ReactDOM from "react-dom";
import TestRenderer from "react-test-renderer";

import createSideEffect from "../src";

function noop() {}
const identity = x => x;

describe("react-reffect", () => {
  describe("argument validation", () => {
    it("should throw if no reducePropsState function is provided", () => {
      expect(createSideEffect).to.throw(
        "Expected reducePropsToState to be a function."
      );
    });

    it("should throw if no handleStateChangeOnClient function is provided", () => {
      expect(createSideEffect.bind(null, noop)).to.throw(
        "Expected handleStateChangeOnClient to be a function."
      );
    });

    it("should throw if no WrappedComponent is provided", () => {
      expect(createSideEffect(noop, noop)).to.throw(
        "Expected WrappedComponent to be a React component"
      );
    });
  });

  describe("displayName", () => {
    const createNoopSideEffect = createSideEffect(noop, noop);

    it("[Provider] should wrap the displayName of wrapped ES2015 class component", () => {
      class DummyComponent extends React.Component {
        static displayName = "Dummy";
        render() {
          return null;
        }
      }
      const { Provider } = createNoopSideEffect(DummyComponent);

      expect(Provider.displayName).to.equal("SideEffectProvider(Dummy)");
    });

    it("[Provider] should use the constructor name of the wrapped functional component", () => {
      function DummyComponent() {}

      const { Provider } = createNoopSideEffect(DummyComponent);

      expect(Provider.displayName).to.equal(
        "SideEffectProvider(DummyComponent)"
      );
    });

    it('[Provider] should fallback to "Component"', () => {
      const { Provider } = createNoopSideEffect(() => null);

      expect(Provider.displayName).to.equal("SideEffectProvider(Component)");
    });

    it("[Consumer] should wrap the displayName of wrapped ES2015 class component", () => {
      class DummyComponent extends React.Component {
        static displayName = "Dummy";
        render() {
          return null;
        }
      }
      const { Consumer } = createNoopSideEffect(DummyComponent);

      expect(Consumer.displayName).to.equal("SideEffectConsumer(Dummy)");
    });

    it("[Consumer] should use the constructor name of the wrapped functional component", () => {
      function DummyComponent() {}

      const { Consumer } = createNoopSideEffect(DummyComponent);

      expect(Consumer.displayName).to.equal(
        "SideEffectConsumer(DummyComponent)"
      );
    });

    it('[Consumer] should fallback to "Component"', () => {
      const { Consumer } = createNoopSideEffect(() => null);

      expect(Consumer.displayName).to.equal("SideEffectConsumer(Component)");
    });
  });

  describe("SideEffect component", () => {
    class DummyComponent extends React.Component {
      static propTypes = {
        foo: PropTypes.string
      };

      render() {
        return <div>hello {this.props.foo}</div>;
      }
    }

    const withIdentitySideEffect = createSideEffect(identity, noop);
    let SideEffect;

    beforeEach(() => {
      SideEffect = withIdentitySideEffect(DummyComponent);
    });

    describe("peek", () => {
      it("should return the current state", () => {
        const store = SideEffect.createStore();
        renderToStaticMarkup(
          <SideEffect.Provider store={store}>
            <SideEffect.Consumer foo="bar" />
          </SideEffect.Provider>
        );
        expect(store.peek()).to.deep.equal([{ foo: "bar" }]);
      });

      it("should NOT reset the state", () => {
        const store = SideEffect.createStore();
        renderToStaticMarkup(
          <SideEffect.Provider store={store}>
            <SideEffect.Consumer foo="bar" />
          </SideEffect.Provider>
        );

        store.peek();
        const state = store.peek();

        expect(state).to.deep.equal([{ foo: "bar" }]);
      });
    });

    describe("handleStateChangeOnClient", () => {
      it("should execute handleStateChangeOnClient", () => {
        let sideEffectCollectedData;

        const handleStateChangeOnClient = state =>
          (sideEffectCollectedData = state);

        SideEffect = createSideEffect(identity, handleStateChangeOnClient)(
          DummyComponent
        );
        const store = SideEffect.createStore();
        SideEffect.Consumer.canUseDOM = true;
        renderToStaticMarkup(
          <SideEffect.Provider store={store}>
            <SideEffect.Consumer foo="bar" />
          </SideEffect.Provider>
        );

        expect(sideEffectCollectedData).to.deep.equal([{ foo: "bar" }]);
      });
    });

    it("should collect props from all instances", () => {
      const store = SideEffect.createStore();

      renderToStaticMarkup(
        <SideEffect.Provider store={store}>
          <SideEffect.Consumer foo="bar" />
        </SideEffect.Provider>
      );
      renderToStaticMarkup(
        <SideEffect.Provider store={store}>
          <SideEffect.Consumer something="different" />
        </SideEffect.Provider>
      );

      const state = store.peek();

      expect(state).to.deep.equal([{ foo: "bar" }, { something: "different" }]);
    });

    it("should render the wrapped component", () => {
      const store = SideEffect.createStore();
      const markup = renderToStaticMarkup(
        <SideEffect.Provider store={store}>
          <SideEffect.Consumer foo="bar" />
        </SideEffect.Provider>
      );

      expect(markup).to.equal("<div>hello bar</div>");
    });

    describe("with DOM", () => {
      const originalWindow = global.window;
      const originalDocument = global.document;

      before(() => {
        const dom = new JSDOM(
          "<!doctype html><html><head></head><body></body></html>"
        );
        global.window = dom.window;
        global.document = global.window.document;
      });

      after(() => {
        global.window = originalWindow;
        global.document = originalDocument;
      });

      it("should be findable by react TestUtils", () => {
        class AnyComponent extends React.Component {
          render() {
            return <SideEffect.Consumer foo="bar" />;
          }
        }
        const store = SideEffect.createStore();
        const testRenderer = TestRenderer.create(
          <SideEffect.Provider store={store}>
            <AnyComponent />
          </SideEffect.Provider>
        );
        const testInstance = testRenderer.root;
        const sideEffect = testInstance.findByType(SideEffect.Consumer);
        expect(sideEffect.props).to.deep.equal({ foo: "bar" });
        testRenderer.unmount();
      });

      it("should only recompute when component updates", () => {
        let collectCount = 0;

        let latestState;
        function handleStateChangeOnClient(state) {
          collectCount += 1;
          latestState = state;
        }

        SideEffect = createSideEffect(identity, handleStateChangeOnClient)(
          DummyComponent
        );
        SideEffect.Consumer.canUseDOM = true;

        const node = document.createElement("div");
        document.body.appendChild(node);
        const node2 = document.createElement("div");
        document.body.appendChild(node2);

        const store = SideEffect.createStore();

        ReactDOM.render(
          <SideEffect.Provider store={store}>
            <SideEffect.Consumer text="bar" />
          </SideEffect.Provider>,
          node
        );
        expect(collectCount).to.equal(1);
        expect(store.getState().mountedInstances.length).to.equal(1);
        expect(store.getState().propsList).to.deep.equal([
          {
            text: "bar"
          }
        ]);
        expect(latestState).to.deep.equal(store.getState().propsList);

        // Do nothing
        ReactDOM.render(
          <SideEffect.Provider store={store}>
            <SideEffect.Consumer text="bar" />
          </SideEffect.Provider>,
          node
        );
        expect(collectCount).to.equal(1);
        expect(store.getState().mountedInstances.length).to.equal(1);
        expect(store.getState().propsList).to.deep.equal([
          {
            text: "bar"
          }
        ]);
        expect(latestState).to.deep.equal(store.getState().propsList);

        // Change props
        ReactDOM.render(
          <SideEffect.Provider store={store}>
            <SideEffect.Consumer text="baz" />
          </SideEffect.Provider>,
          node
        );
        expect(collectCount).to.equal(2);
        expect(store.getState().mountedInstances.length).to.equal(1);
        expect(store.getState().propsList).to.deep.equal([
          {
            text: "baz"
          }
        ]);
        expect(latestState).to.deep.equal(store.getState().propsList);

        // Mount new node
        ReactDOM.render(
          <SideEffect.Provider store={store}>
            <SideEffect.Consumer text="foo" />
          </SideEffect.Provider>,
          node2
        );
        expect(collectCount).to.equal(3);
        expect(store.getState().mountedInstances.length).to.equal(2);
        expect(store.getState().propsList).to.deep.equal([
          {
            text: "baz"
          },
          {
            text: "foo"
          }
        ]);
        expect(latestState).to.deep.equal(store.getState().propsList);

        // Unmount node2
        ReactDOM.unmountComponentAtNode(node2);

        expect(collectCount).to.equal(4);
        expect(store.getState().mountedInstances.length).to.equal(1);
        expect(store.getState().propsList).to.deep.equal([
          {
            text: "baz"
          }
        ]);
        expect(latestState).to.deep.equal(store.getState().propsList);
      });
    });
  });
});

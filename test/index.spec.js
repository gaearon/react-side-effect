'use strict';

var expect = require('chai').expect;
var React = require('react/addons');
var TestUtils = React.addons.TestUtils;
var ExecutionEnvironment = require('exenv');
var withSideEffect = require('../src');
var jsdom = require('jsdom');

function noop() { }
function identity(arg) { return arg; }

describe('react-side-effect', function () {
  describe('argument validation', function () {
    it('should throw if no reducePropsState function is provided', function () {
      expect(withSideEffect).to.throw('Expected reducePropsToState to be a function.');
    });

    it('should throw if no handleStateChangeOnClient function is provided', function () {
      expect(withSideEffect.bind(null, noop)).to.throw('Expected handleStateChangeOnClient to be a function.');
    });

    it('should throw if mapStateOnServer is defined but not a function', function () {
      expect(withSideEffect.bind(null, noop, noop, 'foo')).to.throw('Expected mapStateOnServer to either be undefined or a function.');
    });

    it('should throw if no WrappedComponent is provided', function () {
      expect(withSideEffect(noop, noop)).to.throw('Expected WrappedComponent to be a React component');
    });
  });

  describe('displayName', function () {
    var withNoopSideEffect = withSideEffect(noop, noop);

    it('should wrap the displayName of wrapped component', function () {
      var DummyComponent = React.createClass({displayName: 'Dummy', render: noop});
      var SideEffect = withNoopSideEffect(DummyComponent);

      expect(SideEffect.displayName).to.equal('SideEffect(Dummy)');
    });

    it('should use the constructor name of the wrapped component', function () {
      function DummyComponent() {
      }

      var SideEffect = withNoopSideEffect(DummyComponent);

      expect(SideEffect.displayName).to.equal('SideEffect(DummyComponent)');
    });

    it('should fallback to "Component"', function () {
      var DummyComponent = React.createClass({displayName: null, render: noop});
      var SideEffect = withNoopSideEffect(DummyComponent);

      expect(SideEffect.displayName).to.equal('SideEffect(Component)');
    });
  });

  describe('SideEffect component', function () {
    var DummyComponent = React.createClass({
      render: function () {
        return React.createElement('div', null, 'hello ' + this.props.foo);
      }
    });

    var withIdentitySideEffect = withSideEffect(identity, noop);
    var SideEffect, renderer;

    beforeEach(function () {
      SideEffect = withIdentitySideEffect(DummyComponent);
      renderer = TestUtils.createRenderer();
    });

    it('should expose the canUseDOM flag', function () {
      expect(SideEffect).to.have.property('canUseDOM', ExecutionEnvironment.canUseDOM);
    });

    describe('rewind', function () {
      it('should throw if used in the browser', function () {
        SideEffect.canUseDOM = true;

        expect(SideEffect.rewind).to.throw('You may only call rewind() on the server. Call peek() to read the current state.');
      });

      it('should return the current state', function () {
        renderer.render(React.createElement(SideEffect, {foo: 'bar'}));

        var state = SideEffect.rewind();

        expect(state).to.deep.equal([{foo: 'bar'}]);
      });

      it('should reset the state', function () {
        renderer.render(React.createElement(SideEffect, {foo: 'bar'}));

        SideEffect.rewind();
        var state = SideEffect.rewind();

        expect(state).to.equal(undefined);
      });
    });

    describe('peek', function () {
      it('should return the current state', function () {
        renderer.render(React.createElement(SideEffect, {foo: 'bar'}));

        var state = SideEffect.peek();

        expect(state).to.deep.equal([{foo: 'bar'}]);
      });

      it('should NOT reset the state', function () {
        renderer.render(React.createElement(SideEffect, {foo: 'bar'}));

        SideEffect.peek();
        var state = SideEffect.peek();

        expect(state).to.deep.equal([{foo: 'bar'}]);
      });
    });

    describe('handleStateChangeOnClient', function () {
      it('should execute handleStateChangeOnClient', function () {
        var sideEffectCollectedData;

        function handleStateChangeOnClient(state) { sideEffectCollectedData = state; }

        SideEffect = withSideEffect(identity, handleStateChangeOnClient)(DummyComponent);

        SideEffect.canUseDOM = true;

        renderer.render(React.createElement(SideEffect, {foo: 'bar'}));

        expect(sideEffectCollectedData).to.deep.equal([{foo: 'bar'}]);
      });
    });

    describe('mapStateOnServer', function () {
      it('should apply a custom mapStateOnServer function', function () {
        function mapStateOnServer(propsList) { return propsList[0]; }

        SideEffect = withSideEffect(identity, noop, mapStateOnServer)(DummyComponent);

        SideEffect.canUseDOM = false;

        renderer.render(React.createElement(SideEffect, {foo: 'bar'}));

        var state = SideEffect.rewind();

        expect(state).not.to.be.an('Array');
        expect(state).to.deep.equal({foo: 'bar'});

        renderer = TestUtils.createRenderer();

        SideEffect.canUseDOM = true;

        renderer.render(React.createElement(SideEffect, {foo: 'bar'}));

        state = SideEffect.peek();

        expect(state).to.an('Array');
        expect(state).to.deep.equal([{foo: 'bar'}]);
      });
    });

    it('should collect props from all instances', function () {
      React.renderToStaticMarkup(React.createElement(SideEffect, {foo: 'bar'}));
      React.renderToStaticMarkup(React.createElement(SideEffect, {something: 'different'}));

      var state = SideEffect.peek();

      expect(state).to.deep.equal([{foo: 'bar'}, {something: 'different'}]);
    });

    it('should render the wrapped component', function () {
      var markup = React.renderToStaticMarkup(React.createElement(SideEffect, {foo: 'bar'}));

      expect(markup).to.equal('<div>hello bar</div>');
    });

    describe('with DOM', function () {
      var originalWindow = global.window;
      var originalDocument = global.document;

      before(function (done) {
        jsdom.env('<!doctype html><html><head></head><body></body></html>', function (error, window) {
          if (!error) {
            global.window = window;
            global.document = window.document;
          }

          done(error);
        });
      });

      after(function () {
        global.window = originalWindow;
        global.document = originalDocument;
      });

      it('should be findable by react TestUtils', function () {
        var AnyComponent = React.createClass({
          render: function () {
            return React.createElement(SideEffect, {foo: 'bar'});
          }
        });

        var container = TestUtils.renderIntoDocument(React.createElement(AnyComponent));
        var sideEffect = TestUtils.findRenderedComponentWithType(container, SideEffect);

        expect(sideEffect).to.be.ok;
        expect(sideEffect).to.have.deep.property('props.foo', 'bar');
      });

      it('should only recompute when component updates', function () {
        var collectCount = 0;

        function handleStateChangeOnClient(state) {
          collectCount += 1;
        }

        SideEffect = withSideEffect(identity, handleStateChangeOnClient)(DummyComponent);

        SideEffect.canUseDOM = true;

        var node = document.createElement('div');
        document.body.appendChild(node);

        React.render(React.createElement(SideEffect, {text: 'bar'}), node);
        expect(collectCount).to.equal(1);
        React.render(React.createElement(SideEffect, {text: 'bar'}), node);
        expect(collectCount).to.equal(1);
        React.render(React.createElement(SideEffect, {text: 'baz'}), node);
        expect(collectCount).to.equal(2);
        React.render(React.createElement(SideEffect, {text: 'baz'}), node);
        expect(collectCount).to.equal(2);
      });
    });
  });
});

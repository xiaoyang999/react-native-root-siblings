import React, { Component } from "react";
import { StyleSheet, View, AppRegistry } from "react-native";
import StaticContainer from "static-container";
import PropTypes from "prop-types";

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});

class Provider extends Component {
  static childContextTypes = {
    store: PropTypes.shape({
      subscribe: PropTypes.func.isRequired,
      dispatch: PropTypes.func.isRequired,
      getState: PropTypes.func.isRequired
    })
  };

  getChildContext() {
    return { store: this.props.store };
  }

  render() {
    return this.props.children;
  }
}

if (!global.__rootSiblingsInjected) {
  AppRegistry.setWrapperComponentProvider(function() {
    return function RootSiblingsWrapper(props) {
      return (
        <View style={styles.container} pointerEvents="box-none">
          {props.children}
          <RootSiblings />
        </View>
      );
    };
  });
  global.__rootSiblingsInjected = true;
}

let uuid = 0;
const triggers = [];
class RootSiblings extends Component {
  _updatedSiblings = {};
  _siblings = {};
  _stores = {};
  _zIndexs = {};

  constructor(props) {
    super(props);
    this._siblings = {};
    triggers.push(this._update);
  }

  componentWillUnmount() {
    triggers.splice(triggers.indexOf(this._update), 1);
  }

  _update = (id, element, callback, store, zIndex) => {
    const siblings = { ...this._siblings };
    const stores = { ...this._stores };
    const zIndexs = { ...this._zIndexs };
    if (siblings[id] && !element) {
      delete siblings[id];
      delete stores[id];
    } else if (element) {
      siblings[id] = element;
      stores[id] = store;
      zIndexs[id] = zIndex ? zIndex : 0;
    }
    this._updatedSiblings[id] = true;
    this._siblings = siblings;
    this._stores = stores;
    this._zIndexs = zIndexs;
    this.forceUpdate(callback);
  };

  render() {
    const siblings = this._siblings;
    const stores = this._stores;
    const zIndexs = this._zIndexs;
    const elements = [];
    const zIndexsArray = [];
    Object.keys(siblings).forEach(key => {
      const zIndex = zIndexs[key];
      zIndexsArray.push({zIndex: zIndex, key: key});
    });
    zIndexsArray.sort(function(a, b){return a.zIndex - b.zIndex});
    zIndexsArray.forEach((value) => {
      const key = value.key;
      const element = siblings[key];
      if (element) {
        const sibling = (
          <StaticContainer
            key={`root-sibling-${key}`}
            shouldUpdate={!!this._updatedSiblings[key]}
          >
            {element}
          </StaticContainer>
        );

        const store = stores[key];
        if (store) {
          elements.push(
            <Provider store={store} key={`root-sibling-${key}-provider`}>
              {sibling}
            </Provider>
          );
        } else {
          elements.push(sibling);
        }
      }
    })
    this._updatedSiblings = {};
    return elements;
  }
}

export default class RootSiblingManager {
  constructor(element, callback, store, zIndex) {
    const id = uuid++;
    function update(element, callback, store, zIndex) {
      triggers.forEach(function(trigger) {
        trigger(id, element, callback, store, zIndex);
      });
    }

    function destroy(callback) {
      triggers.forEach(function(trigger) {
        trigger(id, null, callback);
      });
    }

    update(element, callback, store, zIndex);
    this.update = update;
    this.destroy = destroy;
  }
}

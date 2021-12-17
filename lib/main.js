'use babel';

import {CompositeDisposable}   from 'atom'

import SofistikProvider from './sofistik-provider';

export default {

  config: {
    textCase: {
      type: 'boolean',
      title: 'Text upper case',
      description: "If ticked then text appear as upper text else lower case",
      default: true,
      order: 1,
    },
  },

  activate () {
    this.subscriptions = new CompositeDisposable()
    SofistikProvider.changeCase(atom.config.get("autocomplete-sofistik.textCase"))
    this.subscriptions.add(
      atom.config.onDidChange("autocomplete-sofistik.textCase", (event)=>{
        SofistikProvider.changeCase(event.newValue)
      })
    )
	},

  deactivate() {
    this.subscriptions.dispose();
  },

  dispose() {
		return
	},

  getProvider() {
      return SofistikProvider;
  }
};

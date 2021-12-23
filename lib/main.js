'use babel';

import {CompositeDisposable}   from 'atom'

import Provider from './provider';

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
    Provider.changeCase(atom.config.get("autocomplete-sofistik.textCase"))
    this.subscriptions.add(
      atom.config.onDidChange("autocomplete-sofistik.textCase", (event)=>{
        Provider.changeCase(event.newValue)
      })
    )
	},

  deactivate() {
    this.subscriptions.dispose();
    return
  },

  getProvider() {
    return Provider;
  }
};

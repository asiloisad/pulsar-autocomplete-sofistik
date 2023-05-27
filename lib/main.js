'use babel';

import { CompositeDisposable } from 'atom'
import suggestions from './suggestions'

const keywords = {}
for (suggestion of suggestions) {
  if (('module' in suggestion) && !('command' in suggestion)) {
    if (!(suggestion.module in keywords)) {
      keywords[suggestion.module] = []
    }
    keywords[suggestion.module].push(suggestion.text)
  }
}

export default {

  config: {
    textCase: {
      type: 'boolean',
      title: 'Text upper case',
      description: "Get suggestions as upper case text else lower case",
      default: true,
      order: 1,
    },
  },

  activate () {
    this.provider = new Provider()
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.config.observe("autocomplete-sofistik.textCase", (value) => {
        this.changeCase(value)
      })
    )
	},

  deactivate() {
    this.disposables.dispose()
  },

  getProvider() {
    return this.provider
  },

  changeCase(mode) {
		if (mode) {
			for (suggestion of suggestions) {
				suggestion.text = suggestion.text.toUpperCase()
			}
		} else {
			for (suggestion of suggestions) {
				suggestion.text = suggestion.text.toLowerCase()
			}
		}
	},

  getKeywords() {
    const keywords = {}
    for (suggestion of suggestions) {
    	if (('module' in suggestion) && !('command' in suggestion)) {
    		if (!(suggestion.module in keywords)) {
    			keywords[suggestion.module] = []
    		}
    		keywords[suggestion.module].push(suggestion.text)
    	}
    }
    return keywords
  },
}

class Provider {

	constructor() {
		this.selector = '.source.sofistik'
	}

	getSuggestions(options) {
		const { editor, bufferPosition, prefix } = options;
    this.module = false
    this.moduleRow = false
    this.moduleNow = false
    this.command = false
    this.commandNow = false
    this.allowSpecial(editor, bufferPosition)
    if (!this.moduleNow) {
      this.findModule(editor, bufferPosition)
      this.findCommand(editor, bufferPosition)
    }
		return this.findMatchingSuggestions(prefix)
	}

  findModule(editor, bufferPosition) {
    editor.backwardsScanInBufferRange(/^ *[\+-]?prog +(\w+)/i, [[0,0], bufferPosition], (object) => {
      this.module = object.match[1].toLowerCase()
      this.moduleRow = object.range.start.row
      object.stop()
    })
  }

  findCommand(editor, bufferPosition) {
    if (!this.module) { return }
    let keys = keywords[this.module.toUpperCase()]
    if (!keys) {return}
    keys = keys.concat(keywords.BASICS)
    let pattern = new RegExp('(?:^[ \\t]*|; *)('+keys.join('|')+') ', 'i')
    editor.backwardsScanInBufferRange(pattern, [[this.moduleRow,0], bufferPosition], (object) => {
      this.command = object.match[1].toLowerCase()
      object.stop()
    })
  }

  allowSpecial(editor, bufferPosition) {
    let text = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition])
    let pattern1 = /^ *(\w+)?$/i
    this.commandNow = pattern1.test(text)
    let pattern2 = /^ *[\+-]?prog +/i
    this.moduleNow = pattern2.test(text)
  }

	findMatchingSuggestions(prefix) {
		let prefixLower = prefix.toLowerCase();
		let matchingSuggestions = suggestions.filter((suggestion) => {
      if (this.moduleNow) {
          if (suggestion.type==='class' && suggestion.text.toLowerCase().startsWith(prefixLower)) { return true }
      } else if (suggestion.module && (this.module===suggestion.module.toLowerCase() || suggestion.module.toLowerCase()==='basics')) {
        if (suggestion.command) {
          if (this.command===suggestion.command.toLowerCase()) {
            if (prefixLower===' ') { return true }
            if (suggestion.text.toLowerCase().startsWith(prefixLower)) { return true }
          }
        } else if (this.commandNow) {
          if (suggestion.text.toLowerCase().startsWith(prefixLower)) { return true }
        }
      }
		});
		return matchingSuggestions
	}
}

'use babel';

import suggestions from './suggestions';

parsers = {}
for (suggestion of suggestions) {
	if (('module' in suggestion) && !('command' in suggestion)) {
		if (!(suggestion.module in parsers)) {
			parsers[suggestion.module] = []
		}
		parsers[suggestion.module].push(suggestion.text)
	}
}

class SofistikProvider {
	constructor() {
		this.selector = '.source.sofistik';
	}

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
	}

	getSuggestions(options) {
		const { editor, bufferPosition, prefix } = options;

    this.module     = false
    this.moduleRow  = false
    this.moduleNow  = false
    this.command    = false
    this.commandNow = false
    this.allowSpecial(editor, bufferPosition)
    if (!this.moduleNow) {
      this.findModule(editor, bufferPosition)
      this.findCommand(editor, bufferPosition)
    }
    // console.log(this.module, this.moduleRow, this.moduleNow, this.command, this.commandNow)
		return this.findMatchingSuggestions(prefix);
	}

  findModule(editor, bufferPosition) {
    editor.backwardsScanInBufferRange(/^ *[\+-]?prog +(\w+)/i, [[0,0], bufferPosition], (object)=>{
      this.module = object.match[1].toLowerCase()
      this.moduleRow = object.range.start.row
      object.stop()
    })
  }

  findCommand(editor, bufferPosition) {
    if (!this.module) {return}
    keys = parsers[this.module.toUpperCase()]
    if (!keys) {return}
    keys = keys.concat(parsers.BASICS)
    pattern = new RegExp('^ *('+keys.join('|')+') ', 'i')
    editor.backwardsScanInBufferRange(pattern, [[this.moduleRow,0], bufferPosition], (object)=>{
      this.command = object.match[1].toLowerCase()
      object.stop()
    })
  }

  allowSpecial(editor, bufferPosition) {
    text = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition])
    pattern = /^ *(\w+)?$/i
    this.commandNow = pattern.test(text)
    pattern = /^ *[\+-]?prog +/i
    this.moduleNow = pattern.test(text)
  }

	findMatchingSuggestions(prefix) {
		let prefixLower = prefix.toLowerCase();
		let matchingSuggestions = suggestions.filter((suggestion) => {
      if (this.moduleNow) {
          if (suggestion.type==='class' && suggestion.text.toLowerCase().startsWith(prefixLower)) {return true}
      } else if (suggestion.module && (this.module===suggestion.module.toLowerCase() || suggestion.module.toLowerCase()==='basics')) {
        if (suggestion.command) {
          if (this.command===suggestion.command.toLowerCase()) {
            if (prefixLower===' ') {return true}
            if (suggestion.text.toLowerCase().startsWith(prefixLower)) {return true}
          }
        } else if (this.commandNow) {
          if (suggestion.text.toLowerCase().startsWith(prefixLower)) {return true}
        }
      }
		});

		return matchingSuggestions.map(this.inflateSuggestion);
	}

	inflateSuggestion(suggestion) {
    return suggestion
	}


}
export default new SofistikProvider();

'use babel';

import suggestions from '../data/autokeys';

import parsers from '../data/autoparse';

class SofistikProvider {
	constructor() {
		this.selector = '.source.sofistik';
	}

	getSuggestions(options) {
		const { editor, bufferPosition, prefix } = options;

    this.module     = undefined
    this.moduleRow  = undefined
    this.command    = undefined
    this.commandNow = false
    this.findModule(editor, bufferPosition)
    this.findCommand(editor, bufferPosition)
    this.allowNewCommand(editor, bufferPosition)

		return this.findMatchingSuggestions(prefix);
	}

  findModule(editor, bufferPosition) {
    editor.backwardsScanInBufferRange(/^ *[\+-]?prog +(\w+) .*?/i, [[0,0], bufferPosition], (object)=>{
      this.module = object.match[1].toLowerCase()
      this.moduleRow = object.range.row
      object.stop()
    })
  }

  findCommand(editor, bufferPosition) {
    if (!this.module) {return}
    keys = parsers[this.module.toUpperCase()]
    if (!keys) {return}
    pattern = new RegExp('^ *('+keys.join('|')+') ', 'i')
    editor.backwardsScanInBufferRange(pattern, [[this.moduleRow,0], bufferPosition], (object)=>{
      this.command = object.match[1].toLowerCase()
      object.stop()
    })
  }

  allowNewCommand(editor, bufferPosition) {
    pattern = /^ *(\w+)?$/i
    text = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition])
    this.commandNow = pattern.test(text)
  }

	findMatchingSuggestions(prefix) {
		let prefixLower = prefix.toLowerCase();
		let matchingSuggestions = suggestions.filter((suggestion) => {
      if (suggestion.module && this.module===suggestion.module.toLowerCase()) {
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
		return {
			text: suggestion.text,
			description: `SOFiSTiK${suggestion.module ? '::'+suggestion.module : ''}${suggestion.command ? '::'+suggestion.command : ''} ${suggestion.text}`,
			descriptionMoreURL: suggestion.descriptionMoreURL,
			type: 'value',
			rightLabel: `SOFiSTiK ${suggestion.module ? suggestion.module : ''}`,
		};
	}


}
export default new SofistikProvider();

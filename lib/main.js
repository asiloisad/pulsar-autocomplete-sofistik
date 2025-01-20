const { CompositeDisposable } = require('atom')
const path = require('path')
const fs = require('fs')

module.exports = {

  config: {
    textCase: {
      type: 'boolean',
      title: 'Suggestions case',
      description: 'A case of suggestions keywords',
      default: true,
      enum: [
        { value:true , description:'Uppercase' },
        { value:false, description:'Lowercase' },
      ],
      order: 1,
    },
  },

  activate () {
    this.provider = new Provider()
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.config.observe("autocomplete-sofistik.textCase", (value) => { this.provider.loader(value) }),
    )
	},

  deactivate() {
    this.disposables.dispose()
  },

  getProvider() {
    return this.provider
  },
}

class Provider {

	constructor() {
		this.selector = '.source.sofistik'
    this.keywords = null ; this.suggestions = null
	}

  loader(textCase) {
    let fmt = (text) => { return textCase ? text : text.toLowerCase() }
    let langPath = atom.packages.resolvePackagePath('language-sofistik')
    if (!langPath) { return }
    let keyPath = path.join(langPath, 'assets', 'keywords.json')
    try { this.keywords = JSON.parse(fs.readFileSync(keyPath))
    } catch (e) { return }
    this.suggestions = []
    for (let [idc, mkeys] of Object.entries(this.keywords)) {
      if (idc!=='BASIC') {
        this.suggestions.push({ text:fmt(idc), type:'class', rightLabel:'SOFiSTiK' })
      }
      for (let [idk, ckeys] of Object.entries(mkeys)) {
        this.suggestions.push({ idc:idc, text:fmt(idk), type:'keyword', leftLabel:fmt(idc), rightLabel:'SOFiSTiK' })
        for (let idp of ckeys) {
          this.suggestions.push({ idc:idc, idk:idk, text:fmt(idp), type:'property', leftLabel:fmt(idc+' '+idk), rightLabel:'SOFiSTiK' })
        }
      }
    }
  }

	getSuggestions(options) {
    if (!this.keywords) { return [] }
		const { editor, bufferPosition, prefix } = options
    this.module=false ; this.moduleRow=false ; this.moduleNow=false ; this.command=false ; this.commandNow=false
    this.allowSpecial(editor, bufferPosition)
    if (!this.moduleNow) {
      this.findModule(editor, bufferPosition)
      this.findCommand(editor, bufferPosition)
    }
		return this.findMatchingSuggestions(prefix)
	}

  findModule(editor, bufferPosition) {
    editor.backwardsScanInBufferRange(/^ *[\+-]?prog +(\w+)/i, [[0,0], bufferPosition], (object) => {
      this.module = object.match[1].toUpperCase()
      this.moduleRow = object.range.start.row
      object.stop()
    })
  }

  findCommand(editor, bufferPosition) {
    if (!this.module) { return }
    let name = this.module.toUpperCase()
    if (!(name in this.keywords)) { return }
    let keys = Object.keys(this.keywords[name])
    if (!keys) { return }
    keys = keys.concat(Object.keys(this.keywords.BASIC))
    let pattern = new RegExp('(?:^[ \\t]*|; *)('+keys.join('|')+') ', 'i')
    editor.backwardsScanInBufferRange(pattern, [[this.moduleRow,0], bufferPosition], (object) => {
      this.command = object.match[1].toUpperCase()
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
		prefix = prefix.toUpperCase()
		return this.suggestions.filter((suggestion) => {
      let text = suggestion.text.toUpperCase()
      if (this.moduleNow) {
          if (suggestion.type==='class' && text.startsWith(prefix)) { return true }
      } else if (suggestion.idc && (this.module===suggestion.idc || suggestion.idc==='BASIC')) {
        if (suggestion.idk) {
          if (this.command===suggestion.idk) {
            if (prefix===' ') { return true }
            if (text.startsWith(prefix)) { return true }
          }
        } else if (this.commandNow) {
          if (text.startsWith(prefix)) { return true }
        }
      }
		})
	}
}

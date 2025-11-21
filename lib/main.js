const { CompositeDisposable, Disposable } = require('atom')

module.exports = {

  activate () {
    this.provider = new Provider()
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.config.observe("autocomplete-sofistik.textCase", (value) => { 
        this.provider.setTextCase(value) 
      }),
    )
	},

  deactivate() {
    this.disposables.dispose()
    if (this.provider) {
      this.provider.dispose()
    }
  },

  getProvider() {
    return this.provider
  },

  /**
   * Consume the sofistik.keywords service from language-sofistik package
   */
  consumeKeywordsService(service) {
    if (this.provider) {
      this.provider.setKeywordsService(service)
    }
    return new Disposable(() => {
      if (this.provider) {
        this.provider.clearKeywordsService()
      }
    })
  }
}

class Provider {

	constructor() {
		this.selector = '.source.sofistik'
    this.keywordsService = null
    this.textCase = true
    this.suggestions = null
	}

  /**
   * Set the keywords service from language-sofistik
   * @param {Object} service - The keywords service provider
   */
  setKeywordsService(service) {
    this.keywordsService = service.provider
    this.loadSuggestions()
  }

  /**
   * Clear the keywords service
   */
  clearKeywordsService() {
    this.keywordsService = null
    this.suggestions = null
  }

  /**
   * Set text case preference
   * @param {boolean} textCase - True for uppercase, false for lowercase
   */
  setTextCase(textCase) {
    this.textCase = textCase
    this.loadSuggestions()
  }

  /**
   * Load suggestions from the keywords service
   */
  loadSuggestions() {
    if (!this.keywordsService) { return }
    
    const fmt = (text) => { return this.textCase ? text : text.toLowerCase() }
    const keywords = this.keywordsService.getKeywords()
    
    if (!keywords) { return }
    
    this.suggestions = []
    
    // Build suggestions from keywords
    for (let [idc, mkeys] of Object.entries(keywords)) {
      // Add module names (except BASIC)
      if (idc !== 'BASIC') {
        this.suggestions.push({ 
          text: fmt(idc), 
          type: 'class', 
          rightLabel: 'SOFiSTiK' 
        })
      }
      
      // Add commands and their parameters
      for (let [idk, ckeys] of Object.entries(mkeys)) {
        this.suggestions.push({ 
          idc: idc, 
          text: fmt(idk), 
          type: 'keyword', 
          leftLabel: fmt(idc), 
          rightLabel: 'SOFiSTiK' 
        })
        
        // Add command parameters
        for (let idp of ckeys) {
          this.suggestions.push({ 
            idc: idc, 
            idk: idk, 
            text: fmt(idp), 
            type: 'property', 
            leftLabel: fmt(idc + ' ' + idk), 
            rightLabel: 'SOFiSTiK' 
          })
        }
      }
    }
  }

  /**
   * Cleanup method
   */
  dispose() {
    this.keywordsService = null
    this.suggestions = null
  }

	getSuggestions(options) {
    // If no keywords service is available, return empty array
    if (!this.keywordsService || !this.suggestions) { return [] }
    
		const { editor, bufferPosition, prefix } = options
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

  /**
   * Find the current module in the buffer
   */
  findModule(editor, bufferPosition) {
    editor.backwardsScanInBufferRange(/^ *[\+-\\$]?prog +(\w+)/i, [[0,0], bufferPosition], (object) => {
      this.module = object.match[1].toUpperCase()
      this.moduleRow = object.range.start.row
      object.stop()
    })
  }

  /**
   * Find the current command in the buffer
   */
  findCommand(editor, bufferPosition) {
    if (!this.module) { return }
    
    const moduleName = this.module.toUpperCase()
    
    // Get commands for this module using the service
    const moduleCommands = this.keywordsService.getModuleCommands(moduleName)
    const basicCommands = this.keywordsService.getModuleCommands('BASIC')
    
    if (!moduleCommands) { return }
    
    const allCommands = [...moduleCommands, ...basicCommands]
    if (allCommands.length === 0) { return }
    
    const pattern = new RegExp('(?:^[ \\t]*|; *)('+allCommands.join('|')+') ', 'i')
    
    editor.backwardsScanInBufferRange(pattern, [[this.moduleRow, 0], bufferPosition], (object) => {
      this.command = object.match[1].toUpperCase()
      object.stop()
    })
  }

  /**
   * Check if we're in a special context (module or command start)
   */
  allowSpecial(editor, bufferPosition) {
    const text = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition])
    const pattern1 = /^ *(\w+)?$/i
    this.commandNow = pattern1.test(text)
    const pattern2 = /^ *[\+-\\$]?prog +/i
    this.moduleNow = pattern2.test(text)
  }

  /**
   * Filter suggestions based on current context
   */
	findMatchingSuggestions(prefix) {
		prefix = prefix.toUpperCase()
		return this.suggestions.filter((suggestion) => {
      const text = suggestion.text.toUpperCase()
      
      if (this.moduleNow) {
        // Suggesting module names
        if (suggestion.type === 'class' && text.startsWith(prefix)) { 
          return true 
        }
      } else if (suggestion.idc && (this.module === suggestion.idc || suggestion.idc === 'BASIC')) {
        if (suggestion.idk) {
          // Suggesting command parameters
          if (this.command === suggestion.idk) {
            if (prefix === ' ') { return true }
            if (text.startsWith(prefix)) { return true }
          }
        } else if (this.commandNow) {
          // Suggesting commands
          if (text.startsWith(prefix)) { return true }
        }
      }
      
      return false
		})
	}
}

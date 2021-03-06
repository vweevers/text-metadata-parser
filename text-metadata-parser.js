var Wizard = require('weak-type-wizard')
  , stream = require('stream')
  , extend = require('extend')
  , Parser = require('./lib/parser')
  , FsStream = require('./lib/fs-stream')

module.exports = Factory()

function Factory(wizard, input, options) {
  
  // If input is given, assume it's a vinyl 
  // file, or wrap it to look like one

  if (input && typeof input.contents !== 'undefined') ;
  else if ( typeof input === 'string' 
    || input instanceof stream.Stream 
    || Buffer.isBuffer(input)) {
    var wrapped = true
    input = { contents: input }
  } else {
    options = input
    input = null
  }
  
  if (!wizard)
    wizard = new Wizard({})

  if (typeof options !== 'undefined')
    wizard = wizard.extend(options || {})

  if (input!==null) {
    var parserStream = new Parser(wizard, input)
    if (wrapped) {
      parserStream.on('error', function(err){
        throw err
      })

      return input
    } else {
      return parserStream;
    }
  }

  var factory = Factory.bind(null, wizard)
  return FsStream.bindToFactory(factory)
}
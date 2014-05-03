var Wizard = require('weak-type-wizard')
  , es = require('event-stream')
  , Transform = require('stream').Transform
  , Decoder = require('string_decoder').StringDecoder
  , isStream = require('isstream')

module.exports = TextMetadataParser()

function TextMetadataParser(wizard, file, options) {
  
  // Assume file is a virtual file object, or wrap 
  // it in one, unless nothing valid was given.
  
  if (file && file.contents) ; 
  else if ( typeof file === 'string' || file instanceof String
        || isStream(file) || file instanceof Buffer) {
    file = { contents: file }
  } else {
    options = file
    file = null
  }
  
  if (!wizard)
    wizard = new Wizard({})
  if (typeof options !== 'undefined')
    wizard = wizard.extend(options || {})


  if (file!==null)
    return new LineParser(wizard, file) // returns file
  else
    return TextMetadataParser.bind(null, wizard)
}

require('util').inherits(LineParser, Transform)

function LineParser(wizard, file) {
  this.file = file
  this.metadata = {}
  this.wizard = wizard
  this.decoder = new Decoder()

  Transform.call(this)

  // Parsing will start with whitespace
  this.state(parseWhitespace.bind(this, true))

  if (isStream(file.contents)) {
    var self = this;

    // Ensure done() is always called
    this.on('end', function() {
      self.done()
      self.push(self.decoder.end())
    })

    file.contents = file.contents
      .pipe(es.split()).pipe(this)
  } else {
    // TODO: properly test buffers
    var isBuffer = Buffer.isBuffer(file.contents)
      , text = isBuffer ? this.decoder.write(file.contents) : file.contents
      , result = []

    this.on('data', result.push.bind(result))
    text.split("\n").forEach(this._transform, this)
    this.done()

    result = result.join("")
    file.contents = isBuffer 
      ? new Buffer(result + this.decoder.end()) 
      : result
  }

  return file
}

LineParser.prototype._transform = function(line, enc, callback) {
  this.parse(this.decoder.write(line))
  if (typeof callback === 'function' ) callback()
}

LineParser.prototype.done = function(line) {
  var first = true;

  this.state(function(line) {
    if (first) first = false
    else line = "\n" + line
    this.push(line)
  }, line)

  this.file.metadata = this.wizard(this.metadata)

  this.done = function() {}
}

/**
 * Set state by overriding the "parse" method
 */
LineParser.prototype.state = function(method, line) {
  if (method==='done') return this.done(line)

  this.parse = method

  if (typeof line !== 'undefined') 
    this.parse(line)
}

function parseWhitespace(leading, line) {
  if (arguments.length===1) {
    line = leading
    leading = false
  }

  if (!line || /^[\s-]*$/.test(line)) ;
  else if (leading)
    this.state(parseMetadata, line)
  else
    this.state('done', line)
}

function parseMetadata(line) {
  var match = /^([^:]+):\s*([^\r\n]+)\s*$/.exec(line)

  if (match) { //&& match.length === 3) {
    var property = match[1].trim().toLowerCase()
    return this.metadata[property] = match[2]
  }

  // Fake loop to check if we already had
  // some metadata. If so, test this line 
  // for whitespace. Else, we're done early.
  for(var _ in this.metadata) {
    return this.state(parseWhitespace, line) 
  }

  this.state('done', line)
}
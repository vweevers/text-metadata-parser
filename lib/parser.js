var es = require('event-stream')
  , stream = require('stream')
  , Transform = stream.Transform
  , Decoder = require('string_decoder').StringDecoder
  , File = require('vinyl')

module.exports = Parser

require('util').inherits(Parser, Transform)

function Parser(wizard, file) {
  this.file = file
  this.metadata = {}
  this.wizard = wizard
  this.decoder = new Decoder()

  // Parsing will start with whitespace
  this.state(parseWhitespace.bind(this, true))

  var self = this;

  // TODO: when done parsing, join rest of lines and push all

  if (file.contents instanceof stream.Stream) {
    Transform.call(this)

    this.pause()
    process.nextTick(this.resume.bind(this))

    // Ensure done() is always called
    this.on('end', function() {
      self.done()
      self.push(self.decoder.end())
    })

    file.contents = file.contents
      .pipe(es.split()).pipe(this)
  } else {
    try {
      var isBuffer = Buffer.isBuffer(file.contents)
        , text = isBuffer ? this.decoder.write(file.contents) : file.contents
        , result = []

      this.push = result.push.bind(result)
      text.split("\n").forEach(function(line){
        self.parse(line)
      })

      this.done();

      if (isBuffer) result.push(this.decoder.end())
      result = result.join('')
    
      file.contents = isBuffer ? new Buffer(result) : result
    } catch(err) {
      process.nextTick(this.emit.bind(this, 'error', err))
      return
    }

    // Re-emit event, because the above is synchronous
    process.nextTick(this.emitMetadata.bind(this));
  }

  // The clone() method must copy metadata
  // TODO: remove when https://github.com/wearefractal/vinyl/pull/16
  if (file.clone) {
    var newClone = file.clone = function() {
      var meta = this.metadata
      var cloned = File.prototype.clone.call(this)
      cloned.metadata = meta
      cloned.clone = newClone
      return cloned
    }
  }
}

Parser.prototype._transform = function(line, enc, callback) {
  this.parse(this.decoder.write(line)) // don't think decoder is necessary
  callback()
}

Parser.prototype.emitMetadata = function() {
  this.emit('metadata', this.file.metadata, this.file)
}

Parser.prototype.done = function(line) {
  var first = true;

  this.state(function(line) {
    if (first) first = false
    else line = "\n" + line
    this.push(line)
  }, line)

  this.file.metadata = this.wizard(this.metadata)
  this.emitMetadata()

  // Noop
  this.done = function() {}
}

// Set state by overriding the "parse" method
Parser.prototype.state = function(method, line) {
  if (method==='done') return this.done(line)
  this.parse = method
  if (typeof line !== 'undefined') this.parse(line)
}

function parseWhitespace(leading, line) {
  if (arguments.length===1) {
    line = leading
    leading = false
  }

  if (line==='' || /^[\s-]*$/.test(line)) ;
  else if (leading) this.state(parseMetadata, line)
  else this.state('done', line)
}

function parseMetadata(line) {
  var match = /^([^:]+):\s*([^\r\n]+)\s*$/.exec(line)

  if (match) {
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
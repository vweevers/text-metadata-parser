var es = require('event-stream')
  , stream = require('stream')
  , Transform = stream.Transform
  , Decoder = require('string_decoder').StringDecoder

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
    var isBuffer = Buffer.isBuffer(file.contents)
      , text = isBuffer ? this.decoder.write(file.contents) : file.contents
      , result = []

    this.push = result.push.bind(result)
    text.split("\n").forEach(function(line){
      self.parse(line);
    })

    this.done();
    if (isBuffer) result.push(this.decoder.end())

    result = result.join('')
    file.contents = isBuffer ? new Buffer(result) : result

    // Re-emit event, because the above is synchronous
    process.nextTick(this.emitReady.bind(this));
  }

  file.ready = this.on.bind(this, 'ready');

  // The clone() method must copy metadata
  if (file.clone) {

    // TODO: extend vinyl file class and do this 
    // stuff in prototype

    var clone = file.clone;
    file.clone = function() {
      var data = file.metadata
      var newFile = clone.call(file)
      newFile.metadata = data
      return newFile
    }
  }

  return file;
}

Parser.prototype._transform = function(line, enc, callback) {
  this.parse(this.decoder.write(line))
  callback()
}

Parser.prototype.emitReady = function() {
  this.emit('ready', this.file.metadata, this.file)
}

Parser.prototype.done = function(line) {
  var first = true;

  this.state(function(line) {
    if (first) first = false
    else line = "\n" + line
    this.push(line)
  }, line)

  this.file.metadata = this.wizard(this.metadata)
  this.emitReady()

  // Noop
  this.done = function() {}
}

/**
 * Set state by overriding the "parse" method
 */
Parser.prototype.state = function(method, line) {
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

  if (line==='' || /^[\s-]*$/.test(line)) ;
  else if (leading)
    this.state(parseMetadata, line)
  else
    this.state('done', line)
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
var es = require('event-stream')
  , extend = require('extend')
  , Transform = require('stream').Transform
  , tap = require('tap-object-stream')

module.exports = FsStream

// TODO: defaultOptions should not override 
// options set in factory

var defaultOptions = 
  { string:  [ 'title', 'author', 'authors' ]
  , date:    [ 'date', 'published', 'modified', 'changed' ]
  , boolean: [ 'public' ]
  , number:  [ 'revision', 'price' ]
  , array:   [ 'tags' ]
  , cast:    {
      array: function(input) {
        // Trim, then split by comma's, 
        // semicolons and pipelines
        return input.replace(/^\s*|\s*$/g,'').split(/\s*[,;|]\s*/)
      }
    }
  }

function FsStream(factory, options) {

  // Deep-merge options with defaults
  options = extend(true, {}, defaultOptions, options);

  // Create parser
  var parse = factory(options)
    , ts = new Transform({ objectMode: true })

  ts._transform = function (file, enc, done) {
    if (file.isNull()){
      this.push(file)
      return done()
    }

    file = file.clone()
    var self = this

    parse(file)
      .on('error', done)
      .on('metadata', function(meta, file) {
        self.emit('metadata', meta, file)
        self.push(file)
        done()
      })
  }

  var current = ts;

  // Shortcut to meta.pipe(tap('metadata', cb)).pipe(..)
  ts.tap = function(cb){
    current = current.pipe(tap('metadata', cb));

    this.pipe = function (dest, options) {
      return current.pipe(dest, options)
    }

    return this
  }
  
  return ts
}

FsStream.bindToFactory = function(factory) {
  factory.fs = FsStream.bind(null, factory)
  factory.tap = tap.bind(null, 'metadata')
  return factory
}
var es = require('event-stream')
  , extend = require('extend')
  , Transform = require('stream').Transform

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
  options = options 
    ? extend (true, defaultOptions, options)
    : defaultOptions;

  // Create parser
  var parse = factory(options)
    , ts = new Transform({ objectMode: true })
    , filters = []

  // Shortcut
  var push = function(file, done) {
    ts.push(file)
    done()
  }

  // TODO: extend Transform, use proto
  ts._transform = function (file, enc, done) {
    if (file.isNull()) return push(file, done)

    file = file.clone()

    try {
      parse(file).ready(this.postProcess.bind(this, done))
    } catch(err) {
      done(err)
    }
  }

  ts.postProcess = function(done, meta, file) {
    var self = this, neg
      , numFilters = neg = filters.length

    if (numFilters === 0) return push(file, done)

    for (var j=0; j<numFilters && neg>0; j++) {
      filters[j](file, function(err, inc){
        if (neg<0) return

        if (!inc || err) {
          neg = -1
          return done(err)
        }

        if (--neg===0) push(file, done)
      })
    }
  }

  ts.map = function(mapper) {
    var fn = mapFilter(false, mapper)
    filters.push(fn)
    return ts
  }

  ts.require = function(props, action, cb) {
    var filter = requirementFilter(false, props, action, cb)
    filters.push(filter)
    return ts
  }

  return ts
}

var mapFilterStream = mapFilter.bind(null, true)
var requirementFilterStream = requirementFilter.bind(null, true)

FsStream.bindToFactory = function(factory) {
  factory.fs = FsStream.bind(null, factory)
  factory.map = mapFilterStream
  factory.require = requirementFilterStream

  return factory
}

function mapFilter(asStream, mapper) {
  var fn = function(file, cb) {
    if (!file.isNull()) {
      file = file.clone()
      mapper(file.metadata, file)
    }

    cb(null, file)
  }

  return asStream ? es.map(fn) : fn;
}

function requirementFilter(asStream, props, action, cb) {
  if (typeof props === 'string')
    props = [props];

  if (typeof action === 'function') {
    cb = action;
    action = 'ignore';
  }

  var fn = function(file, done) {
    if (file.isNull()) return done();

    for (var i = props.length - 1; i >= 0; i--) {
      var prop = props[i], val = file.metadata[prop];
      if (typeof val === 'undefined' || val === null) {
        if (cb) cb(file.metadata, file);
        if (action==='error')
          return done(new Error('Required: '+prop))
        else return done()
      }
    }

    done(null, file)
  }

  return asStream ? es.map(fn) : fn;
}
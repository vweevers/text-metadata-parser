var test = require('tap').test
var es = require('event-stream')
var stream = require('stream')
var gutil = require('gulp-util')

var meta = require('../')({
  number: ['lovers', 'bagels'],
  string: ['title', 'attn'],
  date: ['date'],
  boolean: 'deceased',
  default: { lovers: 5, bagels: 3.5 }
})

var markdown_full =
      "---\n"
    + "title:    Last will and testament\n"
    + "date:     2019-09-13\n"
    + "attn:     Secret Family\n"
    + "lovers:   3\n"
    + "deceased: true\n"
    + "---\n"
    + "I leave everything to Janet.\n"
    + "\n"
    + "Except my boots.  Those are *mine.*"

var markdown_body = 
      "I leave everything to Janet.\n"
    + "\n"
    + "Except my boots.  Those are *mine.*"

function commonTest(t, metadata, text) {
  t.equal(metadata.title, 'Last will and testament', 'parse title')
  t.similar(metadata.date, new Date('2019-09-13'), 'test date') // new Date(string) is local timezone, new Date(y,m,d) is UTC...
  t.equal(metadata.attn, 'Secret Family', 'attn field')
  t.equal(metadata.lovers, 3, 'number of lovers')
  t.equal(metadata.bagels, 3.5, 'default bagels')
  t.equal(metadata.deceased, true, 'boolean value')
  t.equal(text, markdown_body)
  t.type(meta.fs, 'function', 'fs is available')
  t.end()
}

test("string", function test(t) {
  var file = { contents: markdown_full };

  meta(file)
  t.type(file.contents, 'string', 'returns a string');
  commonTest(t, file.metadata, file.contents)
})

test("buffer", function test(t) {
  var buf = new Buffer(markdown_full)
  var file = meta(buf)

  t.ok(Buffer.isBuffer(file.contents), 'returns a buffer');
  commonTest(t, file.metadata, file.contents.toString())
})

test("stream", function test(t) {
  var ts = es.through()
  var file = { contents: ts }
  meta(file)

  t.ok(file.contents instanceof stream.Stream, 'returns a stream')

  file.contents.pipe(es.wait(function(err, text){
    commonTest(t, file.metadata, text)
  }))

  ts.write(markdown_full);
  ts.end();
})

test("stream with event", function test(t) {
  var ts = es.through()
  var file = { contents: ts }

  meta(file).on('metadata', function(metadata, file){
    t.equal(metadata.title, 'Last will and testament', 'emits event')
    t.end()
  })

  ts.write(markdown_full);
  ts.end();
})

test("string with event", function test(t) {
  var file = { contents: markdown_full }

  meta(file).on('metadata', function(metadata, file){
    t.equal(metadata.title, 'Last will and testament', 'emits event')
    t.end()
  })
})

test("let's try moment.js", function test(t) {
  var moment = require('moment')
    , date = '2013-02-08 09:30'  // ISO-8601 string
    , format = 'YYYY-MM-DD HH:mm'
    
  var file = meta('date: '+ date, {
    moment: ['date'],
    cast: { moment: moment }
  }) 

  var formatted = file.metadata.date.format(format);

  t.equal(formatted, date, 'casts date to moment')
  t.end()
})

test("gulp friendly stream", function test(t) {
  var gulpFriendly = meta.fs()

    // returns meta.fs stream
    .tap(function(slug, title, done){
      if (!title) done.exclude()
      else done(title.replace(/ /g, '-').toLowerCase())
    })

    // Chainable
    .tap(function(slug){
      return slug + '-2'
    })

  gulpFriendly
    .pipe(meta.tap(function(extra){
      return 23
    }))
    
    .on('data', function (file) {
      t.equal(file.metadata.title, 'Last will and testament', 'has metadata')
      t.equal(file.metadata.lovers, 3, 'keeps options')
      t.equal(file.metadata.slug, 'last-will-and-testament-2', 'has slug')
      t.equal(file.metadata.extra, 23, 'mapstream ok')
      
      file.contents.pipe(es.wait(function(err, text){
        t.equal(text, markdown_body, 'has content')
        t.end()
      }))
    })

  var ts = es.through()

  gulpFriendly.write(new gutil.File({
    contents: ts
  }))

  gulpFriendly.write(new gutil.File({
    contents: new Buffer('this file is: ignored')
  }))

  ts.end(markdown_full)
})

test("file.clone", function test(t) {
  var stream = meta.fs()

  stream
    .pipe(es.map(function(file, done){
      var cloned = file.clone().clone()
      done(null, cloned)
    }))
    
    .on('data', function (file) {
      t.equal(file.metadata.title, 'Last will and testament', 'has metadata')
      t.end()
    })

  stream.write(new gutil.File({
    contents: new Buffer(markdown_full)
  }))
})

test("default options", function test(t) {
  var gulpFriendly = require('../').fs()

  gulpFriendly    
    .on('data', function (file) {
      t.deepEqual(file.metadata.tags, ['foo', 'bar', 'baz'], 'tags parsed')
      t.end()
    })

  gulpFriendly.write(new gutil.File({
    contents: new Buffer('tags: foo, bar, baz')
  }))
})
var test = require('tap').test
var parse = require('../')
var es = require('event-stream')

var markdown_full =
      "---\n"
    +  "title:    Last will and testament\n"
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

function options() {
  return {
    number: ['lovers', 'bagels'],
    string: ['title', 'attn'],
    date: ['date'],
    boolean: 'deceased',
    default: { lovers: 5, bagels: 3.5 }
  }
}

function commonTest(t, metadata, text) {
  t.equal(metadata.title, 'Last will and testament', 'parse title')
  t.similar(metadata.date, new Date('2019-09-13'), 'test date') // new Date(string) is local timezone, new Date(y,m,d) is UTC...
  t.equal(metadata.attn, 'Secret Family', 'attn field')
  t.equal(metadata.lovers, 3, 'number of lovers')
  t.equal(metadata.bagels, 3.5, 'default bagels')
  t.equal(metadata.deceased, true, 'boolean value')
  t.equal(text, markdown_body)
  t.end()
}

test("buffer", function test(t) {
  var file = parse(new Buffer(markdown_full, 'utf8'), options());
  commonTest(t, file.metadata, file.contents.toString());
})

test("buffer in file", function test(t) {
  var file = {
    contents: new Buffer(markdown_full, 'utf8')
  }

  parse(file, options());
  commonTest(t, file.metadata, file.contents.toString());
})

test("stream", function test(t) {
  var ts = es.through()
  var file = parse(ts, options())

  file.contents.pipe(es.wait(function(err, text){
    commonTest(t, file.metadata, text)
  }))

  ts.write(markdown_full);
  ts.end();
})

test("stream in file", function test(t) {
  var ts = es.through()
  var file = { contents: ts, metadata: {} }

  parse(file, options())

  file.contents.pipe(es.wait(function(err, text){
    commonTest(t, file.metadata, text)
  }))

  ts.end(markdown_full);
})
var test = require('tap').test
var es = require('event-stream')
var isStream = require('isstream')

var parse = require('../')({
  number: ['lovers', 'bagels'],
  string: ['title', 'attn'],
  date: ['date'],
  boolean: 'deceased',
  default: { lovers: 5, bagels: 3.5 }
})

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
  var file = parse(new Buffer(markdown_full, 'utf8'));
  commonTest(t, file.metadata, file.contents.toString());
})

test("stream", function test(t) {
  var ts = es.through()
  var file = parse(ts)

  file.contents.pipe(es.wait(function(err, text){
    commonTest(t, file.metadata, text)
  }))

  ts.write(markdown_full);
  ts.end();
})

test("returns parser if given a virtual file", function test(t) {
  var parseStream = parse({ contents: markdown_full })

  t.ok(isStream(parseStream), 'is a stream')
  
  parseStream.on('metadata', function(metadata, file){
    t.equal(metadata.title, 'Last will and testament', 'emits metadata event')
    t.end()
  })
})
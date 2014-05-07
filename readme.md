# text-metadata-parser

Metadata parser with [type casting](https://github.com/TehShrike/weak-type-wizard) and support for [gulp](http://gulpjs.com), streams, buffers and strings. This fork of [text-metadata-parser](https://github.com/TehShrike/text-metadata-parser) is not yet published on NPM.

<!-- toc -->
* [For gulp](#for-gulp)
  * [require, map](#require-map)
  * [Type casting defaults](#type-casting-defaults)
* [Standalone usage](#standalone-usage)

<!-- toc stop -->
## For gulp

Say you have this text file at `blog/hello.md`:

```
---
title: A blog post
date: 2014-02-08 09:30
---

# Example

The dashes around the metadata block are *optional*. Some more markdown text..
```

And you want to render that to `public/2014/02/08/a-blog-post.html` with a `gulp` task. 

```javascript
var meta = require('text-metadata-parser')
  , moment = require('moment')
  , uslug = require('slug')
  , rename = require('gulp-rename')
  , markdown = require('gulp-markdown')

gulp.src('blog/**/*.md')

  .pipe(
    meta.fs({
      // Cast a "date" property to a moment.js object
      moment: ['date'],
      cast: { moment: moment }
    })

    // Shortcut to the tap-object-stream module
    .tap(function(slug, title, date, done){
      // Require a title and date, generate slug
      if (title && date) done(uslug(title).toLowerCase())
      else done.exclude()
    })

    // It's chainable and returns the original (meta.fs) stream
    .tap(function(someotherproperty){
      return 'foobar'
    })
  )

  // Files are passed downstream as soon as the 
  // metadata is parsed.
  
  .pipe(rename(function(path, file){
    console.log(file.metadata.someotherproperty) // "foobar"!
    path.dirname+= file.metadata.date.format('/YYYY/MM/DD')
    path.basename = file.metadata.slug
  }))

  // Nice.
  
  .pipe(markdown())
  .pipe(gulp.dest('public'))
```

### tap

The tap method is a shortcut to
`stream.pipe(tap('metadata', function(title){ .. }))`

For more examples, see [tap-object-stream](https://github.com/vweevers/tap-object-stream).

### Type casting defaults

meta.fs() sets these default options for convenience. This means:

- properties like `date` and `published` get cast to `Date` objects
- a `tags` property `"gulp, nice, meta"` is cast to `['gulp', 'nice', 'meta']`
- and more.

```javascript
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
```

These can be overridden like so.

```javascript
// I don't want the "public" property to
// be a boolean, but a date.
streamWithCustomTypeCasting = meta.fs({
  date: 'public'
})

// The "array" type is useful
another = meta.fs({
  array: ['tags', 'authors']
})
```

## Standalone usage

Note. The API is too ambiguous. Likely to remove all this.

```javascript
var meta = require('text-metadata-parser')({
  string:  [ 'title', 'author' ],
  date:    [ 'published', 'modified' ]
})

// Buffer or String
var buf = new Buffer('the text')
var file = meta(buf)

// Parsing is synchronous in this case
console.log(file.metadata, file.contents)

// Stream
var ts = require('event-stream').through()
var file = { contents: ts }

meta(file).on('metadata', function(metadata, file){
  console.log(metadata)
})

ts.write('the text')
ts.end()
```

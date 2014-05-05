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
  , slug = require('slug')
  , rename = require('gulp-rename')
  , markdown = require('gulp-markdown')

gulp.src('blog/**/*.md')

  .pipe(
    meta.fs({
      // Cast a "date" property to a moment.js object
      moment: ['date'],
      cast: { moment: moment }
    })
    .require(['title', 'date'])
    .map(function(data) {
      data.slug = slug(data.title).toLowerCase()
    })
  )

  // Files are passed downstream as soon as the 
  // metadata is parsed.
  
  .pipe(rename(function(path, file){
    path.dirname+= file.metadata.date.format('/YYYY/MM/DD')
    path.basename = file.metadata.slug
  }))

  // Nice.
  
  .pipe(markdown())
  .pipe(gulp.dest('public'))
```

### require, map

1) You can also use `require` and `map` as standalone streams. 2) By default, `require` dismisses files that don't have the specified metadata properties. To stop streaming, pass 'error' as an argument.

```javascript
.pipe(meta())
.pipe(meta.require(['title', 'date'], 'error'))
.pipe(meta.map(function(){ /* */ }))
```

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
var file = meta(ts)

file.ready(function(metadata, file){
  // Called when metadata is parsed
  console.log(metadata)
})

ts.write('the text')
ts.end()
```

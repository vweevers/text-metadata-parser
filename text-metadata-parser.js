var Wizard = require('weak-type-wizard')

function parseString(text) {
  var lines = text.split("\n")
    , reading_metadata = false
    , found_metadata = false
    , metadata = {}

  for (var i = 0, l=lines.length; i < l; i++) {
    
    if (!reading_metadata) {
      if (/^[\s-]*$/.test(lines[i])) continue;
      else if(found_metadata) break;
    }

    var match = /^([^:]+):\s*([^\r\n]+)\s*$/.exec(lines[i])
    if (match && match.length === 3) {
      var property = match[1].trim().toLowerCase()
      metadata[property] = match[2]
      reading_metadata = found_metadata = true
    } else if (!found_metadata) {
      return { content: text, metadata: {} }
    } else {
      reading_metadata = false
      i-- // To test same line for whitespace
    }
  }

  return {
    content: lines.slice(i).join("\n"),
    metadata: metadata
  }
}


function parse(wizard, text) {
  var post = parseString(text)
  post.metadata = wizard(post.metadata)
  return post
}

function TextMetadataParser(wizard, text, options) {
  var calledAsAConstructorFunction = typeof text !== 'string'

  if (typeof options === 'undefined' && typeof text !== 'string') {
    options = text
  }

  var currentWizard = typeof options === 'object' ? wizard.extend(options) : wizard

  if (calledAsAConstructorFunction) {
    // Return this function, bound to a wizard
    return TextMetadataParser.bind(null, currentWizard)
  } else {
    return parse(currentWizard, text)
  }
}

module.exports = TextMetadataParser.bind(null, new Wizard({}))
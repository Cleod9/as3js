var fs = require('fs');
var beautify = require('js-beautify').js_beautify;
// Pull in loader library first
global.AS3JS = require('./lib/as3.js');
// Now Pull in the actual AS3JS program
var AS3JS = require('./runtime.js');

// Load the program
var as3js = new AS3JS();

// Execute the program 
var sourceText = as3js.compile({
	srcPaths: ['./src'],
	silent: false,
	verbose: false,
	safeRequire: true,
	entry: 'com.mcleodgaming.as3js.Main',
	entryMode: 'static'
}).compiledSource;

// Output the resulting source code
if (fs.existsSync('runtime-compiled.js'))
{
	fs.unlinkSync('runtime-compiled.js');
}
fs.writeFileSync('runtime-compiled.js', beautify(sourceText, { indent_size: 2, max_preserve_newlines: 2 }), "UTF-8", {flags: 'w+'});
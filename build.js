var fs = require('fs');
var ImportJS = global.ImportJS = require('importjs');
var OOPS = global.OOPS = require('oopsjs');
require('./runtime.js');
ImportJS.compile();
var AS3JS = ImportJS.unpack("com.mcleodgaming.as3js.AS3JS");

var as3js = new AS3JS();
var sourceText = as3js.compile({
	srcPaths: ['./src'],
	silent: false,
	verbose: false
});
if (fs.existsSync('runtime-compiled.js'))
{
	fs.unlinkSync('runtime-compiled.js');
}
fs.writeFileSync('runtime-compiled.js', sourceText, "UTF-8", {flags: 'w+'});
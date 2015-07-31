var fs = require('fs');
var AS3JS = require('./runtime.js');

var as3js = new AS3JS();
var sourceText = as3js.compile({
	srcPaths: ['./src'],
	silent: false,
	verbose: false,
	entry: 'exports:com.mcleodgaming.as3js.AS3JS'
}).compiledSource;

if (fs.existsSync('runtime-compiled.js'))
{
	fs.unlinkSync('runtime-compiled.js');
}
fs.writeFileSync('runtime-compiled.js', sourceText, "UTF-8", {flags: 'w+'});
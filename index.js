var ImportJS = global.ImportJS = require('importjs');
var OOPS = global.OOPS = require('oopsjs');
require('./runtime.js');
ImportJS.compile();
var AS3JS = ImportJS.unpack("com.mcleodgaming.as3js.AS3JS");

module.exports = AS3JS;
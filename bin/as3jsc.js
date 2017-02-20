#!/usr/bin/env node

/**
* This is the global AS3JS compiler for running 'as3js' as a CLI
**/

var pjson = require('../package.json');
var fs = require('fs');
var path = require('path');
global.AS3JS = require(path.resolve(__dirname, '..', 'lib/as3.js'));
var AS3JS = require(path.resolve(__dirname, '..', 'runtime.js'));

var VERSION = pjson.version;

//AS3JS options
var srcPaths = [];
var output = null;
var silent = false;
var verbose = false;
var entry = '';
var dry = false;
var safeRequire = false;
var ignoreFlash = false;

//Command line args
var arg = null;
var option = null;
var command = null;

//Misc options

//Parse arguemnts
for(var i = 0; i < process.argv.length; i++) {
	arg = process.argv[i];
	if(command) {
		//Commands will go here if implemented
		command = null;
	} else if(option) {
		//Options are set here
		if(option == 'o') {
			output = arg; //File output
		} else if(option == 'src') {
			srcPaths = srcPaths.concat(arg.split(",")); //Source path(s) to parse
		} else if(option == 'e') {
			entry = arg;
		}
		option = null;
	} else {
		if(arg == '--verbose') {
			verbose = true;
		} else if(arg == '-d' || arg == '--dry') {
			dry = true;
		} else if(arg == '-s' || arg == '--silent') {
			silent = true;
		} else if(arg == '--safe-require') {
			safeRequire = true;
		} else if(arg == '-o' || arg == '--output') {
			option = 'o'; //File output
		} else if(arg == '-src' || arg == '--sourcepath') {
			option = 'src'; //Source path(s)
		} else if(arg == '-e' || arg == '--entry') {
			option = 'e'; //Entry point
		} else if(arg == '--ignore-flash') {
			ignoreFlash = true;
		} else if(arg == '-h' || arg == '--help') {
			//Help text
			console.log("Options:");
			console.log("\t[-o|--output]\t\tOutput file");
			console.log("\t[-src|-sourcepath]\tSource Path(s) (comma-separated)");
			console.log("\t[-d|--dry]\tDry-run mode");
			console.log("\t[-e|--entry]\t\tEntry point (ex. \"[instance|static]:com.example.MyClass\")");
			console.log("\t[-h|--help]\t\tView Help");
			console.log("\t[-v|--version]\t\tView Version information");
			console.log("\t[--verbose]\t\tVerbose console output");
			console.log("\t[--safe-require]\t\tTry-catch require() statements");
			console.log("\t[--ignore-flash]\t\tIgnore flash.* imports");
			
			return;
		} else if(arg == '-v' || arg == '--version') {
			//Version info
			console.log("AS3JS for Node.js");
			console.log("Created by Greg McLeod (c) 2017");
			console.log("Version: " + VERSION);
			return;
		}
	}
}

if(srcPaths.length <= 0) {
	console.log("Error, must supply source path (-src)");
} else if(!output) {
	console.log("Error, must supply output path (-o)");
} else {
	var as3js = new AS3JS();
	var sourceText = as3js.compile({
		srcPaths: srcPaths,
		silent: silent,
		verbose: verbose,
		entry: entry.split(':')[1],
		entryMode: entry.split(':')[0],
		safeRequire: safeRequire,
		ignoreFlash: ignoreFlash
	}).compiledSource;
	
	//Remove old output file if it exists
	if (output && !dry)
	{
		if (fs.existsSync(output))
		{
			fs.unlinkSync(output);
		}
		fs.writeFileSync(output || 'output.js', sourceText, "UTF-8", {flags: 'w+'});
	}
}

package com.mcleodgaming.as3js
{
	import com.mcleodgaming.as3js.parser.AS3Parser;
	import com.mcleodgaming.as3js.util.AS3JSUtils;
	require "path"
	require "fs"
	
	public class AS3JS 
	{
		
		public static var DEBUG_MODE:Boolean = false;
		public static var SILENT:Boolean = false;
		public static function debug():void
		{
			if (AS3JS.SILENT)
			{
				return;
			}
			if (AS3JS.DEBUG_MODE)
			{
				console.log.apply(console, arguments);
			}
		}
		public static function log():void
		{
			if (AS3JS.SILENT)
			{
				return;
			}
			console.log.apply(console, arguments);
		}
		public static function warn():void
		{
			if (AS3JS.SILENT)
			{
				return;
			}
			console.warn.apply(console, arguments);
		}
		
		public function AS3JS() 
		{
			
		}
		
		public function compile(options:Object = null):String
		{
			var i:*;
			var j:*;
			var k:*;
			var m:*;
			var tmp:String;
			options = options || {};
			var srcPaths:Object = options.srcPaths || {};
			var pkgLists:Object = {};
			for (i in srcPaths)
			{
				pkgLists[srcPaths[i]] = buildPackageList(srcPaths[i]);
			}

			AS3JS.DEBUG_MODE = options.verbose || AS3JS.DEBUG_MODE;
			AS3JS.SILENT = options.silent || AS3JS.SILENT;

			var classes:Object = {};
			var buffer:String = "";
			
			//Begin output with library helpers
			buffer += "var AS3JSUtils = function () {};\n";
			buffer += "\tAS3JSUtils.getDefaultValue = " + AS3JSUtils.getDefaultValue.toString().replace(/\t\t/g, "\t") + ";\n";
			buffer += "\tAS3JSUtils.createArray = " + AS3JSUtils.createArray.toString().replace(/\t\t/g, "\t") + ";\n"; 
			
			//First, parse through the classes and get the basic information
			for (i in pkgLists)
			{
				for (j in pkgLists[i])
				{
					AS3JS.log('Analyzing package: ' + pkgLists[i][j].packageName);
					classes[pkgLists[i][j].packageName] = pkgLists[i][j].parse();
					AS3JS.debug(classes[pkgLists[i][j].packageName]);
				}
			}

			//Resolve all possible package name wildcards
			for (i in classes)
			{
				//For every class
				for (j in classes[i].importWildcards)
				{
					AS3JS.debug('Resolving ' + classes[i].className + '\'s ' + classes[i].importWildcards[j] + ' ...')
					//For every wild card in the class
					for (k in srcPaths)
					{
						//For each possible source path (should hopefully just be 1 most of the time -_-)
						tmp = srcPaths[k] + path.sep + classes[i].importWildcards[j].replace(/\./g, path.sep).replace(path.sep+'*', '');
						tmp = tmp.replace(/\\/g, '/'); 
						tmp = tmp.replace(/[\/]/g, path.sep); 
						if(fs.existsSync(tmp)) {
							AS3JS.debug('Searching path ' + tmp + '...')
							//Path exists, read the files in the directory
							var files = fs.readdirSync(tmp);
							for(m in files) {
								//See if this is an ActionScript file
								if(fs.statSync(tmp + path.sep + files[m]).isFile() && files[m].lastIndexOf('.as') == files[m].length - 3) {
									//See if the class needs the file
									if(classes[i].needsImport(classes[i].importWildcards[j].replace(/\*/g, files[m].substr(0, files[m].length - 3)))) {
										AS3JS.debug('Auto imported ' + files[m].substr(0, files[m].length - 3));
										classes[i].addImport(classes[i].importWildcards[j].replace(/\*/g, files[m].substr(0, files[m].length - 3))); //Pass in package name with wild card replaced
									}
								}
							}
						} else {
							AS3JS.warn('Warning, could not find directory: ' + tmp);
						}
					}
				}
			}
			
			//Add extra imports before registring them (these will not be imported in the output code, but rather will provide insight for AS3JS to determine variable types)
			for (i in classes)
			{
				for (j in classes)
				{
					classes[i].addExtraImport(classes[j].packageName + '.' + classes[j].className);
				}
			}
			
			//Resolve import map
			for (i in classes)
			{
				classes[i].registerImports(classes);
			}

			//Resolve parent imports
			for (i in classes)
			{
				classes[i].findParents(classes);
			}
				
			//Process the function text to comply with JS
			for (i in classes)
			{
				AS3JS.log('Parsing package: ' + classes[i].packageName + "." + classes[i].className);
				classes[i].process(classes);
			}

			//Retrieve output
			for (i in classes)
			{
				buffer += classes[i].toString() + '\n';
			}

			AS3JS.log("Done.");
			return buffer;
		}
		private function readDirectory(location:String, pkgBuffer:String, obj:Object):void
		{
			var files:Array = fs.readdirSync(location);
			for (var i in files)
			{
				var pkg:String = pkgBuffer;
				if (fs.statSync(location + path.sep + files[i]).isDirectory())
				{
					var splitPath:Array = location.split(path.sep);
					if (pkg != '')
					{
						pkg += '.';
					}
					this.readDirectory(location + path.sep + files[i], pkg + files[i], obj)
				} else if (fs.statSync(location + path.sep + files[i]).isFile() && files[i].lastIndexOf('.as') == files[i].length - 3)
				{
					if (pkg != '')
					{
						pkg += '.';
					}
					pkg += files[i].substr(0, files[i].length - 3);
					var f = fs.readFileSync(location + path.sep + files[i]);
					obj[pkg] = new AS3Parser(f.toString(), pkg);
					AS3JS.debug("Loaded file: ", location + path.sep + files[i] + " (package: " + pkg + ")");
				}
			}
		}
		public function buildPackageList(location:String):void
		{
			var obj:Object = {};
			var topLevel:String = location;
			location = location.replace(/\\/g, '/'); 
			location = location.replace(/[\/]/g, path.sep); 
			if (fs.existsSync(location) && fs.statSync(location).isDirectory())
			{
				var splitPath = location.split(path.sep);
				this.readDirectory(location, '', obj);
				return obj;
			} else
			{
				throw new Error("Error could not find directory: " + location);
			}
		}
	}

}
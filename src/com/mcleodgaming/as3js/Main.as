package com.mcleodgaming.as3js
{
	import com.mcleodgaming.as3js.parser.AS3Class;
	import com.mcleodgaming.as3js.parser.AS3Parser;
	require "path"
	require "fs"
	
	public class Main 
	{
		public static var DEBUG_MODE:Boolean = false;
		public static var SILENT:Boolean = false;
		public static function debug():void
		{
			if (Main.SILENT)
			{
				return;
			}
			if (Main.DEBUG_MODE)
			{
				console.log.apply(console, arguments);
			}
		}
		public static function log():void
		{
			if (Main.SILENT)
			{
				return;
			}
			console.log.apply(console, arguments);
		}
		public static function warn():void
		{
			if (Main.SILENT)
			{
				return;
			}
			console.warn.apply(console, arguments);
		}
		
		public function Main() 
		{
			
		}
		
		public function compile(options:Object = null):Object
		{
			var packages:Object = { }; //Will contain the final map of package names to source text
			var i:*;
			var j:*;
			var k:*;
			var m:*;
			var tmp:String;
			options = options || {};
			var srcPaths:Object = options.srcPaths || {};
			var rawPackages:Array = options.rawPackages || [];
			var parserOptions:Object = { safeRequire: options.safeRequire, ignoreFlash: options.ignoreFlash};
			
			//Temp classes for holding raw class info
			var rawClass:AS3Class;
			var rawParser:AS3Parser;
			
			var pkgLists:Object = {};
			for (i in srcPaths)
			{
				pkgLists[srcPaths[i]] = buildPackageList(srcPaths[i]);
			}

			Main.DEBUG_MODE = options.verbose || Main.DEBUG_MODE;
			Main.SILENT = options.silent || Main.SILENT;

			var classes:Object = {};
			var buffer:String = "";
			
			//First, parse through the file-based classes and get the basic information
			for (i in pkgLists)
			{
				for (j in pkgLists[i])
				{
					Main.log('Analyzing class path: ' + pkgLists[i][j].classPath);
					classes[pkgLists[i][j].classPath] = pkgLists[i][j].parse(parserOptions);
					Main.debug(classes[pkgLists[i][j].classPath]);
				}
			}
			
			// Now parse through any raw string classes
			for (i = 0; i < rawPackages.length; i++)
			{
				Main.log('Analyzing class: ' + i);
				rawParser = new AS3Parser(rawPackages[i]);
				rawClass = rawParser.parse(parserOptions);
				classes[rawParser.classPath] = rawClass;
			}

			//Resolve all possible package name wildcards
			for (i in classes)
			{
				//For every class
				for (j in classes[i].importWildcards)
				{
					Main.debug('Resolving ' + classes[i].className + '\'s ' + classes[i].importWildcards[j] + ' ...')
					//For every wild card in the class
					for (k in srcPaths)
					{
						//For each possible source path (should hopefully just be 1 most of the time -_-)
						tmp = srcPaths[k] + path.sep + classes[i].importWildcards[j].replace(/\./g, path.sep).replace(path.sep+'*', '');
						tmp = tmp.replace(/\\/g, '/'); 
						tmp = tmp.replace(/[\/]/g, path.sep); 
						if(fs.existsSync(tmp)) {
							Main.debug('Searching path ' + tmp + '...')
							//Path exists, read the files in the directory
							var files = fs.readdirSync(tmp);
							for(m in files) {
								//See if this is an ActionScript file
								if(fs.statSync(tmp + path.sep + files[m]).isFile() && files[m].lastIndexOf('.as') == files[m].length - 3) {
									//See if the class needs the file
									if(classes[i].needsImport(classes[i].importWildcards[j].replace(/\*/g, files[m].substr(0, files[m].length - 3)))) {
										Main.debug('Auto imported ' + files[m].substr(0, files[m].length - 3));
										classes[i].addImport(classes[i].importWildcards[j].replace(/\*/g, files[m].substr(0, files[m].length - 3))); //Pass in package name with wild card replaced
									}
								}
							}
						} else {
							Main.warn('Warning, could not find directory: ' + tmp);
						}
					}
					// Must do again for classes in case there we
					for (k in classes)
					{
						if(classes[i].needsImport(AS3Parser.fixClassPath(classes[k].packageName + '.' + classes[k].className))) {
							Main.debug('Auto imported ' + AS3Parser.fixClassPath(classes[k].packageName + '.' + classes[k].className));
							classes[i].addImport(AS3Parser.fixClassPath(classes[k].packageName + '.' + classes[k].className)); //Pass in package name with wild card replaced
						}
					}
				}
			}
			
			//Add extra imports before registring them (these will not be imported in the output code, but rather will provide insight for AS3JS to determine variable types)
			for (i in classes)
			{
				for (j in classes)
				{
					classes[i].addExtraImport(AS3Parser.fixClassPath(classes[j].packageName + '.' + classes[j].className));
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
			
			//Walk through the class members that had assignments in the class scope
			for (i in classes)
			{
				classes[i].checkMembersWithAssignments();
			}
				
			//Process the function text to comply with JS
			for (i in classes)
			{
				Main.log('Parsing package: ' + AS3Parser.fixClassPath(classes[i].packageName + "." + classes[i].className));
				classes[i].process(classes);
			}
			// Load stringified versions of snippets/main-snippet.js and snippets/class-snippet.js
			var mainTemplate:String = "(function(){var Program={};{{packages}}if(typeof module !== 'undefined'){module.exports=AS3JS.load({program:Program,entry:\"{{entryPoint}}\",entryMode:\"{{entryMode}}\"});}else if(typeof window!=='undefined'&&typeof AS3JS!=='undefined'){window['{{entryPoint}}']=AS3JS.load({program:Program,entry:\"{{entryPoint}}\",entryMode:\"{{entryMode}}\"});}})();";
			var classTemplate:String = "Program[\"{{module}}\"]=function(module, exports){{{source}}};";
			var packageObjects:Array = [];
			var classObjects:Array = null;
			var currentClass:String = "";
			
			if (options.entry)
			{
				// Entry point should be in the format "mode:path.to.package.Class"
				var currentPackage:String = options.entry;
				var mode:String = options.entryMode || 'instance';
				// Update template with entry points
				mainTemplate = mainTemplate.replace(/\{\{entryPoint\}\}/g, AS3Parser.fixClassPath(classes[currentPackage].packageName + '.' + classes[currentPackage].className));
				mainTemplate = mainTemplate.replace(/\{\{entryMode\}\}/g, mode);
			} else
			{
				mainTemplate = mainTemplate.replace(/\{\{entryPoint\}\}/g, "");
				mainTemplate = mainTemplate.replace(/\{\{entryMode\}\}/g, "");
			}
			
			//Retrieve converted class code
			var groupByPackage:Object = { };
			for (i in classes)
			{
				groupByPackage[classes[i].packageName] = groupByPackage[classes[i].packageName] || [];
				groupByPackage[classes[i].packageName].push(classes[i]);
			}
			for (i in groupByPackage)
			{
				classObjects = [];
				for (j in groupByPackage[i])
				{
					packages[AS3Parser.fixClassPath(i+"."+groupByPackage[i][j].className)] = groupByPackage[i][j].toString();
					currentClass = classTemplate;
					currentClass = currentClass.replace(/\{\{module\}\}/g, AS3Parser.fixClassPath(groupByPackage[i][j].packageName + "." + groupByPackage[i][j].className));
					currentClass = currentClass.replace(/\{\{source\}\}/g, AS3Parser.increaseIndent(packages[AS3Parser.fixClassPath(i+"."+groupByPackage[i][j].className)], "  "));
					classObjects.push(currentClass);
				}
				packageObjects.push(AS3Parser.increaseIndent(classObjects.join(""), "  "));
			}
			
			mainTemplate = mainTemplate.replace(/\{\{packages\}\}/g, packageObjects.join(""));
			
			mainTemplate = mainTemplate.replace(/\t/g, "  ");
			
			buffer += mainTemplate;
			
			Main.log("Done.");
			
			return { compiledSource: buffer, packageSources: packages };
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
					Main.debug("Loaded file: ", location + path.sep + files[i] + " (package: " + pkg + ")");
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
				readDirectory(location, '', obj);
				return obj;
			} else
			{
				throw new Error("Error could not find directory: " + location);
			}
		}
	}

}
(function ( options ) {
  options = options || {};
  var AS3JSUtils = function () {};
  AS3JSUtils.getDefaultValue = function getDefaultValue(value, fallback) {
    return (typeof value != 'undefined') ? value : fallback;
  };
  AS3JSUtils.createArray = function (size, val) {
    var arr = [];
    for (var i = 0; i < size; i++)  {
      arr.push(val); 
    }
    return arr;
  };
  if (typeof Object.create !== 'function') {
    Object.create = function (o) {
      function F() {}
        F.prototype = o;
        return new F();
    }
  };

  var i, j;
  var packages = {
    "com.mcleodgaming.as3js": {
      AS3JS: {
        compiled: false,
        source: function ( module ) {
          var path = require("path");
          var fs = require("fs");
          
          var AS3Parser;
          module.inject = function () {
            AS3Parser = imports('com.mcleodgaming.as3js.parser', 'AS3Parser');
            AS3JS.DEBUG_MODE = false;
            AS3JS.SILENT = false;
          };
          
          var AS3JS = function() {
                
              };
          
          
          
          AS3JS.DEBUG_MODE = false;
          AS3JS.SILENT = false;
          AS3JS.debug = function() {
                if (AS3JS.SILENT)
                {
                  return;
                }
                if (AS3JS.DEBUG_MODE)
                {
                  console.log.apply(console, arguments);
                }
              };
          AS3JS.log = function() {
                if (AS3JS.SILENT)
                {
                  return;
                }
                console.log.apply(console, arguments);
              };
          AS3JS.warn = function() {
                if (AS3JS.SILENT)
                {
                  return;
                }
                console.warn.apply(console, arguments);
              };
          
          
          AS3JS.prototype.compile = function(options) {
                options = AS3JSUtils.getDefaultValue(options, null);
                var packages = { }; //Will contain the final map of package names to source text
                var i;
                var j;
                var k;
                var m;
                var tmp;
                options = options || {};
                var srcPaths = options.srcPaths || {};
                var pkgLists = {};
                for (i in srcPaths)
                {
                  pkgLists[srcPaths[i]] = this.buildPackageList(srcPaths[i]);
                }
          
                AS3JS.DEBUG_MODE = options.verbose || AS3JS.DEBUG_MODE;
                AS3JS.SILENT = options.silent || AS3JS.SILENT;
          
                var classes = {};
                var buffer = "";
                
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
                
                //Walk through the class members that had assignments in the class scope
                for (i in classes)
                {
                  classes[i].checkMembersWithAssignments();
                }
                  
                //Process the function text to comply with JS
                for (i in classes)
                {
                  AS3JS.log('Parsing package: ' + classes[i].packageName + "." + classes[i].className);
                  classes[i].process(classes);
                }
          
                var mainTemplate = fs.readFileSync(path.join(__dirname, 'util', 'main-template.js')).toString();
                var classTemplate = fs.readFileSync(path.join(__dirname, 'util', 'class-template.js')).toString();
                var packageObjects = [];
                var classObjects = null;
                var currentClass = "";
                
                if (options.entry)
                {
                  // Entry point should be in the format "mode:path.to.package.Class"
                  var currentPackage = options.entry.split(":")[1];
                  var mode = "";
                  if (currentPackage) {
                    // Possible modes are "new" and "exports"
                    // In "new" mode, entry point is called via "new" operator
                    // In "exports" mode, entry point is returned as module
                    mode = options.entry.split(":")[0]
                  } else
                  {
                    // Force "new" mode
                    currentPackage = options.entry;
                    mode = "new";
                  }
                  // Update template with entry points
                  mainTemplate = mainTemplate.replace(/\{\{entryPackage\}\}/g, classes[currentPackage].packageName);
                  mainTemplate = mainTemplate.replace(/\{\{entryClass\}\}/g, classes[currentPackage].className);
                  mainTemplate = mainTemplate.replace(/\{\{entryMode\}\}/g, mode);
                } else
                {
                  mainTemplate = mainTemplate.replace(/\{\{entryPackage\}\}/g, "");
                  mainTemplate = mainTemplate.replace(/\{\{entryClass\}\}/g, "");
                  mainTemplate = mainTemplate.replace(/\{\{entryMode\}\}/g, "");
                }
                
                //Retrieve converted class code
                var groupByPackage = { };
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
                    packages[i+"."+groupByPackage[i][j].className] = groupByPackage[i][j].toString();
                    currentClass = classTemplate;
                    currentClass = currentClass.replace(/\{\{className\}\}/g, groupByPackage[i][j].className);
                    currentClass = currentClass.replace(/\{\{source\}\}/g, AS3Parser.increaseIndent(packages[i+"."+groupByPackage[i][j].className], "    "));
                    classObjects.push(currentClass);
                  }
                  packageObjects.push('"' + groupByPackage[i][j].packageName + '": {\n' +  AS3Parser.increaseIndent(classObjects.join(", "), "  ") + "\n}");
                }
                
                mainTemplate = mainTemplate.replace(/\{\{packages\}\}/g, AS3Parser.increaseIndent(packageObjects.join(", "), "    "));
                
                mainTemplate = mainTemplate.replace(/\t/g, "  ");
                
                buffer += mainTemplate;
                
                AS3JS.log("Done.");
                
                return { compiledSource: buffer, packageSources: packages };
              };
          AS3JS.prototype.readDirectory = function(location, pkgBuffer, obj) {
                var files = fs.readdirSync(location);
                for (var i in files)
                {
                  var pkg = pkgBuffer;
                  if (fs.statSync(location + path.sep + files[i]).isDirectory())
                  {
                    var splitPath = location.split(path.sep);
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
              };
          AS3JS.prototype.buildPackageList = function(location) {
                var obj = {};
                var topLevel = location;
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
          
          
          module.exports = AS3JS;
          
        }
      }
    }, "com.mcleodgaming.as3js.enums": {
      AS3Encapsulation: {
        compiled: false,
        source: function ( module ) {
          module.inject = function () {
            AS3Encapsulation.PUBLIC = "public";
            AS3Encapsulation.PRIVATE = "private";
            AS3Encapsulation.PROTECTED = "protected";
          };
          
          var AS3Encapsulation = function AS3Encapsulation() {};
          
          
          AS3Encapsulation.PUBLIC = null;
          AS3Encapsulation.PRIVATE = null;
          AS3Encapsulation.PROTECTED = null;
          
          
          
          module.exports = AS3Encapsulation;
          
        }
      }, AS3MemberType: {
        compiled: false,
        source: function ( module ) {
          module.inject = function () {
            AS3MemberType.VAR = "var";
            AS3MemberType.CONST = "const";
            AS3MemberType.FUNCTION = "function";
          };
          
          var AS3MemberType = function AS3MemberType() {};
          
          
          AS3MemberType.VAR = null;
          AS3MemberType.CONST = null;
          AS3MemberType.FUNCTION = null;
          
          
          
          module.exports = AS3MemberType;
          
        }
      }, AS3ParseState: {
        compiled: false,
        source: function ( module ) {
          module.inject = function () {
            AS3ParseState.START = "start";
            AS3ParseState.PACKAGE_NAME = "packageName";
            AS3ParseState.PACKAGE = "package";
            AS3ParseState.CLASS_NAME = "className";
            AS3ParseState.CLASS = "class";
            AS3ParseState.CLASS_EXTENDS = "classExtends";
            AS3ParseState.CLASS_IMPLEMENTS = "classImplements";
            AS3ParseState.COMMENT_INLINE = "commentInline";
            AS3ParseState.COMMENT_MULTILINE = "commentMultiline";
            AS3ParseState.STRING_SINGLE_QUOTE = "stringSingleQuote";
            AS3ParseState.STRING_DOUBLE_QUOTE = "stringDoubleQuote";
            AS3ParseState.STRING_REGEX = "stringRegex";
            AS3ParseState.MEMBER_VARIABLE = "memberVariable";
            AS3ParseState.MEMBER_FUNCTION = "memberFunction";
            AS3ParseState.LOCAL_VARIABLE = "localVariable";
            AS3ParseState.LOCAL_FUNCTION = "localFunction";
            AS3ParseState.IMPORT_PACKAGE = "importPackage";
            AS3ParseState.REQUIRE_MODULE = "requireModule";
          };
          
          var AS3ParseState = function AS3ParseState() {};
          
          
          AS3ParseState.START = null;
          AS3ParseState.PACKAGE_NAME = null;
          AS3ParseState.PACKAGE = null;
          AS3ParseState.CLASS_NAME = null;
          AS3ParseState.CLASS = null;
          AS3ParseState.CLASS_EXTENDS = null;
          AS3ParseState.CLASS_IMPLEMENTS = null;
          AS3ParseState.COMMENT_INLINE = null;
          AS3ParseState.COMMENT_MULTILINE = null;
          AS3ParseState.STRING_SINGLE_QUOTE = null;
          AS3ParseState.STRING_DOUBLE_QUOTE = null;
          AS3ParseState.STRING_REGEX = null;
          AS3ParseState.MEMBER_VARIABLE = null;
          AS3ParseState.MEMBER_FUNCTION = null;
          AS3ParseState.LOCAL_VARIABLE = null;
          AS3ParseState.LOCAL_FUNCTION = null;
          AS3ParseState.IMPORT_PACKAGE = null;
          AS3ParseState.REQUIRE_MODULE = null;
          
          
          
          module.exports = AS3ParseState;
          
        }
      }, AS3Pattern: {
        compiled: false,
        source: function ( module ) {
          module.inject = function () {
            AS3Pattern.IDENTIFIER = [ /\w/g, /\w/g ];
            AS3Pattern.OBJECT = [ /[\w\.]/g, /[\w(\w(\.\w)+)]/g ];
            AS3Pattern.IMPORT = [ /[0-9a-zA-Z_$.*]/g, /[a-zA-Z_$][0-9a-zA-Z_$]([.][a-zA-Z_$][0-9a-zA-Z_$])*\*?/g ];
            AS3Pattern.REQUIRE = [ /./g, /["'](.*?)['"]/g ];
            AS3Pattern.CURLY_BRACE = [ /[\{|\}]/g, /[\{|\}]/g ];
            AS3Pattern.VARIABLE = [ /[0-9a-zA-Z_$]/g, /[a-zA-Z_$][0-9a-zA-Z_$]*/g ];
            AS3Pattern.VARIABLE_TYPE = [ /[a-zA-Z_$<>.*][0-9a-zA-Z_$<>.]*/g, /[a-zA-Z_$<>.*][0-9a-zA-Z_$<>.]*/g ];
            AS3Pattern.VARIABLE_DECLARATION = [ /[0-9a-zA-Z_$:<>.*]/g, /[a-zA-Z_$][0-9a-zA-Z_$]*\s*:\s*([a-zA-Z_$<>\.\*][0-9a-zA-Z_$<>\.]*)/g ];
            AS3Pattern.ASSIGN_START = [ /[=\r\n]/g, /[=\r\n]/g ];
            AS3Pattern.ASSIGN_UPTO = [ new RegExp("[^;\\r\\n]", "g"), /(.*?)/g ];
            AS3Pattern.VECTOR = [ /new[\s\t]+Vector\.<(.*?)>\((.*?)\)/g, /new[\s\t]+Vector\.<(.*?)>\((.*?)\)/ ];
            AS3Pattern.ARRAY = [ /new[\s\t]+Array\((.*?)\)/g, /new[\s\t]+Array\((.*?)\)/ ];
            AS3Pattern.REST_ARG = [ /\.\.\.[a-zA-Z_$][0-9a-zA-Z_$]*/g, /\.\.\.[a-zA-Z_$][0-9a-zA-Z_$]*/g];
          };
          
          var AS3Pattern = function AS3Pattern() {};
          
          
          AS3Pattern.IDENTIFIER = null;
          AS3Pattern.OBJECT = null;
          AS3Pattern.IMPORT = null;
          AS3Pattern.REQUIRE = null;
          AS3Pattern.CURLY_BRACE = null;
          AS3Pattern.VARIABLE = null;
          AS3Pattern.VARIABLE_TYPE = null;
          AS3Pattern.VARIABLE_DECLARATION = null;
          AS3Pattern.ASSIGN_START = null;
          AS3Pattern.ASSIGN_UPTO = null;
          AS3Pattern.VECTOR = null;
          AS3Pattern.ARRAY = null;
          AS3Pattern.REST_ARG = null;
          
          
          
          module.exports = AS3Pattern;
          
        }
      }
    }, "com.mcleodgaming.as3js.parser": {
      AS3Class: {
        compiled: false,
        source: function ( module ) {
          var AS3JS, AS3Parser, AS3Pattern, AS3Function, AS3Variable;
          module.inject = function () {
            AS3JS = imports('com.mcleodgaming.as3js', 'AS3JS');
            AS3Parser = imports('com.mcleodgaming.as3js.parser', 'AS3Parser');
            AS3Pattern = imports('com.mcleodgaming.as3js.enums', 'AS3Pattern');
            AS3Function = imports('com.mcleodgaming.as3js.types', 'AS3Function');
            AS3Variable = imports('com.mcleodgaming.as3js.types', 'AS3Variable');
            AS3Class.reservedWords = ["as", "class", "delete", "false", "if", "instanceof", "native", "private", "super", "to", "use", "with", "break", "const", "do", "finally", "implements", "new", "protected", "switch", "true", "var", "case", "continue", "else", "for", "import", "internal", "null", "public", "this", "try", "void", "catch", "default", "extends", "function", "in", "is", "package", "return", "throw", "typeof", "while", "each", "get", "set", "namespace", "include", "dynamic", "final", "natiev", "override", "static", "abstract", "char", "export", "long", "throws", "virtual", "boolean", "debugger", "float", "prototype", "to", "volatile", "byte", "double", "goto", "short", "transient", "cast", "enum", "intrinsic", "synchronized", "type"];
            AS3Class.nativeTypes = ["Boolean", "Number", "int", "uint", "String" ];
          };
          
          var AS3Class = function() {
                this.imports = null;
                this.requires = null;
                this.importWildcards = null;
                this.importExtras = null;
                this.interfaces = null;
                this.parentDefinition = null;
                this.members = null;
                this.staticMembers = null;
                this.getters = null;
                this.setters = null;
                this.staticGetters = null;
                this.staticSetters = null;
                this.membersWithAssignments = null;
                this.fieldMap = null;
                this.staticFieldMap = null;
                this.classMap = null;
                this.classMapFiltered = null;
                this.packageMap = null;
                this.packageName = null;
                this.className = null;
                this.imports = [];
                this.requires = [];
                this.importWildcards = [];
                this.importExtras = [];
                this.interfaces = [];
                this.parent = null;
                this.parentDefinition = null;
                this.members = [];
                this.staticMembers = [];
                this.getters = [];
                this.setters = [];
                this.staticGetters = [];
                this.staticSetters = [];
                this.membersWithAssignments = [];
                this.isInterface = false;
                this.fieldMap = {};
                this.staticFieldMap = {};
                this.classMap = { };
                this.classMapFiltered = { };
                this.packageMap = { };
              };
          
          
          
          AS3Class.reservedWords = null;
          AS3Class.nativeTypes = null;
          
          
          AS3Class.prototype.packageName = null;
          AS3Class.prototype.className = null;
          AS3Class.prototype.imports = null;
          AS3Class.prototype.requires = null;
          AS3Class.prototype.importWildcards = null;
          AS3Class.prototype.importExtras = null;
          AS3Class.prototype.interfaces = null;
          AS3Class.prototype.parent = null;
          AS3Class.prototype.parentDefinition = null;
          AS3Class.prototype.members = null;
          AS3Class.prototype.staticMembers = null;
          AS3Class.prototype.getters = null;
          AS3Class.prototype.setters = null;
          AS3Class.prototype.staticGetters = null;
          AS3Class.prototype.staticSetters = null;
          AS3Class.prototype.isInterface = false;
          AS3Class.prototype.membersWithAssignments = null;
          AS3Class.prototype.fieldMap = null;
          AS3Class.prototype.staticFieldMap = null;
          AS3Class.prototype.classMap = null;
          AS3Class.prototype.classMapFiltered = null;
          AS3Class.prototype.packageMap = null;
          AS3Class.prototype.registerImports = function(clsList) {
                var i;
                for (i in this.imports)
                {
                  if (clsList[this.imports[i]])
                  {
                    var lastIndex = this.imports[i].lastIndexOf(".");
                    var shorthand = (lastIndex < 0) ? this.imports[i] : this.imports[i].substr(lastIndex + 1);
                    this.classMap[shorthand] = clsList[this.imports[i]];
                  }
                }
                for (i in this.importExtras)
                {
                  if (clsList[this.importExtras[i]])
                  {
                    var lastIndex = this.importExtras[i].lastIndexOf(".");
                    var shorthand = (lastIndex < 0) ? this.importExtras[i] : this.importExtras[i].substr(lastIndex + 1);
                    this.classMap[shorthand] = clsList[this.importExtras[i]];
                  }
                }
                this.packageMap = clsList;
              };
          AS3Class.prototype.registerField = function(name, value) {
                if (value && value.isStatic)
                {
                  this.staticFieldMap[name] = this.staticFieldMap[name] || value;
                } else
                {
                  this.fieldMap[name] = this.fieldMap[name] || value;
                }
              };
          AS3Class.prototype.retrieveField = function(name, isStatic) {
                if (isStatic)
                {
                  if (this.staticFieldMap[name])
                  {
                    return this.staticFieldMap[name];
                  } else if (this.parentDefinition)
                  {
                    return this.parentDefinition.retrieveField(name, isStatic);
                  } else
                  {
                    return null;
                  }
                } else
                {
                  if (this.fieldMap[name])
                  {
                    return this.fieldMap[name];
                  } else if (this.parentDefinition)
                  {
                    return this.parentDefinition.retrieveField(name, isStatic);
                  } else
                  {
                    return null;
                  }
                }
              };
          AS3Class.prototype.needsImport = function(pkg) {
                var i;
                var j;
                var lastIndex = pkg.lastIndexOf(".");
                var shorthand = (lastIndex < 0) ? pkg : pkg.substr(lastIndex + 1);
                var matches;
          
                if (this.imports.indexOf(pkg) >= 0)
                {
                  return false; //Class was already imported
                }
          
                if (shorthand == this.className && pkg == this.packageName)
                {
                  return true; //Don't need self
                }
                  
                if (shorthand == this.parent)
                {
                  return true; //Parent class is in another package
                }
                
                //Now we must parse through all members one by one, looking at functions and variable types to determine the necessary imports
                  
                for (i in this.members)
                {
                  //See if the function definition or variable assigment have a need for this package
                  if (this.members[i] instanceof AS3Function)
                  {
                    matches = this.members[i].value.match(AS3Pattern.VARIABLE_DECLARATION[1]);
                    for (j in matches)
                    {
                      if(matches[j].split(":")[1] == shorthand)
                        return true;
                    }
                    for (j in this.members[i].argList)
                    {
                      if(typeof this.members[i].argList[j].type == 'string' && this.members[i].argList[j].type == shorthand)
                        return true;
                    }
                  }
                  if (typeof this.members[i].value == 'string' && this.members[i].value.match(new RegExp("([^a-zA-Z_$.])" + shorthand + "([^0-9a-zA-Z_$])", "g")))
                  {
                    return true;
                  } else if (typeof this.members[i].type == 'string' && this.members[i].type == shorthand)
                  {
                    return true;
                  }
                }
                for (i in this.staticMembers)
                {
                  //See if the function definition or variable assigment have a need for this package
                  if (this.staticMembers[i] instanceof AS3Function)
                  {
                    matches = this.staticMembers[i].value.match(AS3Pattern.VARIABLE_DECLARATION[1]);
                    for (j in matches)
                    {
                      if (matches[j].split(":")[1] == shorthand)
                      {
                        return true;
                      }
                    }
                    for (j in this.staticMembers[i].argList) 
                    {
                      if (typeof this.staticMembers[i].argList[j].type == 'string' && this.staticMembers[i].argList[j].type == shorthand)
                      {
                        return true;
                      }
                    }
                  }
                  if (typeof this.staticMembers[i].value == 'string' && this.staticMembers[i].value.match(new RegExp("([^a-zA-Z_$.])" + shorthand + "([^0-9a-zA-Z_$])", "g")))
                  {
                    return true;
                  } else if (typeof this.staticMembers[i].type == 'string' && this.staticMembers[i].type == shorthand)
                  {
                    return true;
                  }
                }
                for (i in this.getters)
                {
                  //See if the function definition or variable assigment have a need for this package
                  matches = this.getters[i].value.match(AS3Pattern.VARIABLE_DECLARATION[1]);
                  for (j in matches)
                  {
                    if (matches[j].split(":")[1] == shorthand)
                    {
                      return true;
                    }
                  }
                  for (j in this.getters[i].argList)
                  {
                    if (typeof this.getters[i].argList[j].type == 'string' && this.getters[i].argList[j].type == shorthand)
                    {
                      return true;
                    }
                  }
                  if (typeof this.getters[i].value == 'string' && this.getters[i].value.match(new RegExp("([^a-zA-Z_$.])" + shorthand + "([^0-9a-zA-Z_$])", "g")))
                  {
                    return true;
                  } else if (typeof this.getters[i].type == 'string' && this.getters[i].type == shorthand)
                  {
                    return true;
                  }
                }
                for (i in this.setters)
                {
                  matches = this.setters[i].value.match(AS3Pattern.VARIABLE_DECLARATION[1]);
                  for (j in matches)
                  {
                    if (matches[j].split(":")[1] == shorthand)
                    {
                      return true;
                    }
                  }
                  //See if the function definition or variable assigment have a need for this package
                  for (j in this.setters[i].argList) 
                  {
                    if (typeof this.setters[i].argList[j].type == 'string' && this.setters[i].argList[j].type == shorthand)
                    {
                      return true;
                    }
                  }
                  if (typeof this.setters[i].value == 'string' && this.setters[i].value.match(new RegExp("([^a-zA-Z_$.])" + shorthand + "([^0-9a-zA-Z_$])", "g")))
                  {
                    return true;
                  } else if (typeof this.setters[i].type == 'string' && this.setters[i].type == shorthand)
                  {
                    return true;
                  }
                }
                for (i in this.staticGetters)
                {
                  matches = this.staticGetters[i].value.match(AS3Pattern.VARIABLE_DECLARATION[1]);
                  for (j in matches)
                  {
                    if (matches[j].split(":")[1] == shorthand)
                    {
                      return true;
                    }
                  }
                  //See if the function definition or variable assigment have a need for this package
                  for (j in this.staticGetters[i].argList)
                  {
                    if (typeof this.staticGetters[i].argList[j].type == 'string' && this.staticGetters[i].argList[j].type == shorthand)
                    {
                      return true;
                    }
                  }
                  if (typeof this.staticGetters[i].value == 'string' && this.staticGetters[i].value.match(new RegExp("([^a-zA-Z_$.])" + shorthand + "([^0-9a-zA-Z_$])", "g")))
                  {
                    return true;
                  } else if (typeof this.staticGetters[i].type == 'string' && this.staticGetters[i].type == shorthand)
                  {
                    return true;
                  }
                }
                for (i in this.staticSetters)
                {
                  matches = this.staticSetters[i].value.match(AS3Pattern.VARIABLE_DECLARATION[1]);
                  for (j in matches)
                  {
                    if (matches[j].split(":")[1] == shorthand)
                    {
                      return true;
                    }
                  }
                  for (j in this.staticSetters[i].argList)
                  {
                    if (typeof this.staticSetters[i].argList[j].type == 'string' && this.staticSetters[i].argList[j].type == shorthand)
                    {
                      return true;
                    }
                  }
                  //See if the function definition or variable assigment have a need for this package
                  if (typeof this.staticSetters[i].value == 'string' && this.staticSetters[i].value.match(new RegExp("([^a-zA-Z_$.])" + shorthand + "([^0-9a-zA-Z_$])", "g")))
                  {
                    return true;
                  } else if (typeof this.staticSetters[i].type == 'string' && this.staticSetters[i].type == shorthand)
                  {
                    return true;
                  }
                }
                
                return false;
              };
          AS3Class.prototype.addImport = function(pkg) {
                if (this.imports.indexOf(pkg) < 0)
                {
                  this.imports.push(pkg);
                }
              };
          AS3Class.prototype.addExtraImport = function(pkg) {
                if (this.importExtras.indexOf(pkg) < 0)
                {
                  this.importExtras.push(pkg);
                }
              };
          AS3Class.prototype.findParents = function(classes) {
                if (!this.parent)
                {
                  return;
                }
                for (var i in classes)
                {
                  //Only gather vars from the parent
                  if (classes[i] != this && this.parent == classes[i].className)
                  {
                    this.parentDefinition = classes[i]; //Found our parent
                    return;
                  }
                }
              };
          AS3Class.prototype.checkMembersWithAssignments = function() {
                var i;
                var j;
                var classMember;
                // If the type of this param is a Class
                for (i = 0; i < this.membersWithAssignments.length; i++)
                {
                  classMember = this.membersWithAssignments[i];
                  // Make a dumb attempt to identify use of the class as assignments here
                  for (j in this.imports)
                  {
                    if (this.packageMap[this.imports[j]] && classMember.value.indexOf(this.packageMap[this.imports[j]].className) >= 0 && this.parentDefinition !== this.packageMap[this.imports[j]])
                    {
                      // If this is a token that matches a class from an import statement, store it in the filtered classMap
                      this.classMapFiltered[this.packageMap[this.imports[j]].className] = this.packageMap[this.imports[j]];
                    }
                  }
                }
              };
          AS3Class.prototype.stringifyFunc = function(fn) {
                var buffer = "";
                if (fn instanceof AS3Function)
                {
                  //Functions need to be handled differently
                  //Prepend sub-type if it exists
                  if (fn.subType)
                  {
                    buffer += fn.subType + '_';
                  }
                  //Print out the rest of the name and start the function definition
                  buffer += fn.name
                  buffer += " = function(";
                  //Concat all of the arguments together
                  tmpArr = [];
                  for (j = 0; j < fn.argList.length; j++)
                  {
                    if (!fn.argList[j].isRestParam)
                    {
                      tmpArr.push(fn.argList[j].name);
                    }
                  }
                  buffer += tmpArr.join(", ") + ") ";
                  //Function definition is finally added
                  buffer += fn.value + ";\n";
                } else if (fn instanceof AS3Variable)
                {
                  //Variables can be added immediately
                  buffer += fn.name;
                  buffer += " = " + fn.value + ";\n";
                }
                return buffer;
              };
          AS3Class.prototype.process = function(classes) {
                var self = this;
                var i;
                var index;
                var currParent = this;
                var allMembers = [];
                var allFuncs = [];
                var allStaticMembers = [];
                var allStaticFuncs = [];
          
                while (currParent)
                {
                  //Parse members of this parent
                  for (i in currParent.setters)
                  {
                    allMembers.push(currParent.setters[i]);
                  }
                  for (i in currParent.staticSetters)
                  {
                    allStaticMembers.push(currParent.staticSetters[i]);
                  }
                  for (i in currParent.getters)
                  {
                    allMembers.push(currParent.getters[i]);
                  }
                  for (i in currParent.staticGetters)
                  {
                    allStaticMembers.push(currParent.staticGetters[i]);
                  }
                  for (i in currParent.members)
                  {
                    allMembers.push(currParent.members[i]);
                  }
                  for (i in currParent.staticMembers)
                  {
                    allStaticMembers.push(currParent.staticMembers[i]);
                  }
                    
                  //Go to the next parent
                  currParent = currParent.parentDefinition;
                }
                
                //Add copies of the setters and getters to the "all" arrays (for convenience)
                for (i in this.setters)
                {
                  if (this.setters[i] instanceof AS3Function)
                  {
                    allFuncs.push(this.setters[i]);
                  }
                }
                for (i in this.staticSetters)
                {
                  if (this.staticSetters[i] instanceof AS3Function)
                  {
                    allStaticFuncs.push(this.staticSetters[i]);
                  }
                }
                for (i in this.getters)
                {
                  if (this.getters[i] instanceof AS3Function)
                  {
                    allFuncs.push(this.getters[i]);
                  }
                }
                for (i in this.staticGetters)
                {
                  if (this.staticGetters[i] instanceof AS3Function)
                  {
                    allStaticFuncs.push(this.staticGetters[i]);
                  }
                }
                for (i in this.members)
                {
                  if (this.members[i] instanceof AS3Function)
                  {
                    allFuncs.push(this.members[i]);
                  }
                }
                for (i in this.staticMembers)
                {
                  if (this.staticMembers[i] instanceof AS3Function)
                  {
                    allStaticFuncs.push(this.staticMembers[i]);
                  }
                }
          
                
                for (i in allFuncs)
                {
                  AS3JS.debug("Now parsing function: " + this.className + ":" + allFuncs[i].name);
                  allFuncs[i].value = AS3Parser.parseFunc(this, allFuncs[i].value, allFuncs[i].buildLocalVariableStack(), allFuncs[i].isStatic)[0];
                  allFuncs[i].value = AS3Parser.checkArguments(allFuncs[i]);
                  if (allFuncs[i].name === this.className)
                  {
                    //Inject instantiations here
                    allFuncs[i].value = AS3Parser.injectInstantiations(this, allFuncs[i]);
                  }
                  allFuncs[i].value = AS3Parser.cleanup(allFuncs[i].value);
                  //Fix supers
                  allFuncs[i].value = allFuncs[i].value.replace(/super\.(.*?)\(/g, this.parent + '.prototype.$1.call(this, ').replace(/\.call\(this,\s*\)/g, ".call(this)");
                  allFuncs[i].value = allFuncs[i].value.replace(/super\(/g, this.parent + '.call(this, ').replace(/\.call\(this,\s*\)/g, ".call(this)");
                  allFuncs[i].value = allFuncs[i].value.replace(new RegExp("this[.]" + this.parent, "g"), this.parent); //Fix extra 'this' on the parent
                }
                for (i in allStaticFuncs)
                {
                  AS3JS.debug("Now parsing static function: " + this.className + ":" + allStaticFuncs[i].name);
                  allStaticFuncs[i].value = AS3Parser.parseFunc(this, allStaticFuncs[i].value, allStaticFuncs[i].buildLocalVariableStack(), allStaticFuncs[i].isStatic)[0];
                  allStaticFuncs[i].value = AS3Parser.checkArguments(allStaticFuncs[i]);
                  allStaticFuncs[i].value = AS3Parser.cleanup(allStaticFuncs[i].value);
                }
              };
          AS3Class.prototype.toString = function() {
                //Outputs the class inside a JS function
                var i;
                var j;
                var buffer = "";
          
                if (this.requires.length > 0)
                {
                  for (var i in this.requires)
                  {
                    buffer += 'var ' + this.requires[i].substring(1, this.requires[i].length-1) + ' = require(' + this.requires[i] + ');\n';
                  }
                  buffer += "\n";
                }
              
                var tmpArr = null;
          
                //Parent class must be imported if it exists
                if (this.parentDefinition)
                {
                  buffer += "var " + this.parentDefinition.className + " = imports('" + this.parentDefinition.packageName + "', '" + this.parentDefinition.className + "');\n";
                }
          
                //Create refs for all the other classes
                if (this.imports.length > 0)
                {
                  tmpArr = [];
                  for (i in this.imports)
                  {
                    if (this.imports[i].indexOf('flash.') < 0 && this.parent != this.imports[i].substr(this.imports[i].lastIndexOf('.') + 1) && this.packageName + '.' + this.className != this.imports[i]) //Ignore flash imports
                    {
                      // Must be in the filtered map, otherwise no point in writing
                      if (this.classMapFiltered[this.packageMap[this.imports[i]].className])
                      {
                        tmpArr.push(this.imports[i].substr(this.imports[i].lastIndexOf('.') + 1)); //<-This will return characters after the final '.', or the entire String if no '.'
                      }
                    }
                  }
                  //Join up separated by commas
                  if (tmpArr.length > 0)
                  {
                    buffer += 'var ';
                    buffer += tmpArr.join(", ") + ";\n";
                  }
                }
                //Check for injection function code
                var injectedText = "";
                for (i in this.imports)
                {
                  if (this.imports[i].indexOf('flash.') < 0 && this.packageName + '.' + this.className != this.imports[i] && !(this.parentDefinition && this.parentDefinition.packageName + '.' + this.parentDefinition.className == this.imports[i])) //Ignore flash imports and parent for injections
                  {
                    // Must be in the filtered map, otherwise no point in writing
                    if (this.classMapFiltered[this.packageMap[this.imports[i]].className])
                    {
                      injectedText += "\t" + this.imports[i].substr(this.imports[i].lastIndexOf('.') + 1) + " = imports('" + this.packageMap[this.imports[i]].packageName + "', '" + this.packageMap[this.imports[i]].className + "');\n";
                    }
                  }
                }
                //Set the non-native statics vars now
                for (i in this.staticMembers)
                {
                  if (!(this.staticMembers[i] instanceof AS3Function))
                  {
                    injectedText += "\t" + AS3Parser.cleanup( this.className + '.' + this.staticMembers[i].name + ' = ' + this.staticMembers[i].value + ";\n");
                  }
                }
                
                if (injectedText.length > 0)
                {
                  buffer += "module.inject = function () {\n";
                  buffer += injectedText;
                  buffer += "};\n";
                }
          
                buffer += '\n';
                
                buffer += (this.fieldMap[this.className]) ? "var " + this.stringifyFunc(this.fieldMap[this.className]) : "var " + this.className + " = function " + this.className + "() {};";
                
                buffer += '\n';
                
                if (this.parent)
                {
                  //Extend parent if necessary
                  buffer += this.className + ".prototype = Object.create(" + this.parent + ".prototype);";
                }
                
                buffer += '\n\n';
                
                if (this.staticMembers.length > 0)
                {
                  //Place the static members first (skip the ones that aren't native types, we will import later
                  for (i in this.staticMembers)
                  {
                    if (this.staticMembers[i] instanceof AS3Function)
                    {
                      buffer += this.className + "." + this.stringifyFunc(this.staticMembers[i]);
                    } else if (this.staticMembers[i].type === "Number" || this.staticMembers[i].type === "int" || this.staticMembers[i].type === "uint")
                    {
                      if (isNaN(parseInt(this.staticMembers[i].value)))
                      {
                        buffer += this.className + "." + this.staticMembers[i].name + ' = 0;\n';
                      } else
                      {
                        buffer += this.className + "." + this.stringifyFunc(this.staticMembers[i]);
                      }
                    } else if (this.staticMembers[i].type === "Boolean")
                    {
                      buffer += this.className + "." + this.staticMembers[i].name + ' = false;\n';
                    } else
                    {
                      buffer += this.className + "." +  this.staticMembers[i].name + ' = null;\n';
                    }
                  }
                  for (i in this.staticGetters)
                  {
                    buffer += this.className + "." + this.stringifyFunc(this.staticGetters[i]);
                  }
                  for (i in this.staticSetters)
                  {
                    buffer += this.className + "." + this.stringifyFunc(this.staticSetters[i]);
                  }
                  buffer += '\n';
                }    
                buffer += "\n";
                
                for (i in this.getters)
                {
                  buffer += this.className + ".prototype." + this.stringifyFunc(this.getters[i]);
                }
                for (i in this.setters)
                {
                  buffer += this.className + ".prototype." + this.stringifyFunc(this.setters[i]);
                }
                for (i in this.members)
                {
                  if (this.members[i].name === this.className)
                  {
                    continue;
                  }
                  if (this.members[i] instanceof AS3Function || (AS3Class.nativeTypes.indexOf(this.members[i].type) >= 0 && this.members[i].value))
                  {
                    buffer += this.className + ".prototype." + this.stringifyFunc(this.members[i]); //Print functions immediately
                  } else if (this.members[i].type === "Number" || this.members[i].type === "int" || this.members[i].type === "uint")
                  {
                    if (isNaN(parseInt(this.members[i].value)))
                    {
                      buffer += this.className + ".prototype." + this.members[i].name + ' = 0;\n';
                    } else
                    {
                      buffer += this.className + ".prototype." + this.stringifyFunc(this.members[i]);
                    }
                  } else if (this.members[i].type === "Boolean")
                  {
                    buffer += this.className + ".prototype." + this.members[i].name + ' = false;\n';
                  } else
                  {
                    buffer += this.className + ".prototype." + this.members[i].name + ' = null;\n';
                  }
                }
          
                buffer = buffer.substr(0, buffer.length - 2) + "\n"; //Strips the final comma out of the string
          
                buffer += "\n\n";
                buffer += "module.exports = " + this.className + ";\n";
          
                //Remaining fixes
                buffer = buffer.replace(/(this\.)+/g, "this.");
          
                return buffer;
              }
          
          
          module.exports = AS3Class;
          
        }
      }, AS3Parser: {
        compiled: false,
        source: function ( module ) {
          var path = require("path");
          var fs = require("fs");
          
          var AS3JS, AS3Class, AS3Token, AS3Encapsulation, AS3MemberType, AS3ParseState, AS3Pattern, AS3Argument, AS3Function, AS3Member, AS3Variable;
          module.inject = function () {
            AS3JS = imports('com.mcleodgaming.as3js', 'AS3JS');
            AS3Class = imports('com.mcleodgaming.as3js.parser', 'AS3Class');
            AS3Token = imports('com.mcleodgaming.as3js.parser', 'AS3Token');
            AS3Encapsulation = imports('com.mcleodgaming.as3js.enums', 'AS3Encapsulation');
            AS3MemberType = imports('com.mcleodgaming.as3js.enums', 'AS3MemberType');
            AS3ParseState = imports('com.mcleodgaming.as3js.enums', 'AS3ParseState');
            AS3Pattern = imports('com.mcleodgaming.as3js.enums', 'AS3Pattern');
            AS3Argument = imports('com.mcleodgaming.as3js.types', 'AS3Argument');
            AS3Function = imports('com.mcleodgaming.as3js.types', 'AS3Function');
            AS3Member = imports('com.mcleodgaming.as3js.types', 'AS3Member');
            AS3Variable = imports('com.mcleodgaming.as3js.types', 'AS3Variable');
            AS3Parser.PREVIOUS_BLOCK = null;
          };
          
          var AS3Parser = function(src, pkg) {
                this.stack = null;
                //index = 0;
                this.stack = [];
                this.src = src;
                this.packageName = pkg || null;
              };
          
          
          
          AS3Parser.PREVIOUS_BLOCK = null;
          AS3Parser.increaseIndent = function(str, indent) {
                return (indent + str).replace(/\n/g, "\n" + indent);
              };
          AS3Parser.parseArguments = function(str) {
                var args = [];
                var tmpToken;
                var tmpArr = AS3Parser.extractBlock(str, 0, '(', ')');
                var tmpExtractArr = null;
                var index = tmpArr[1] - 1; //Ending index of parsed block
                var tmpStr = tmpArr[0].trim(); //Parsed block
                tmpStr = tmpStr.substr(1, tmpStr.length - 2); //Remove outer parentheses
                tmpArr = null; //Trash this
                tmpArr = tmpStr.split(','); //Split args by commas
                //Don't bother if there are no arguments
                if (tmpArr.length > 0 && tmpArr[0] != '')
                {
                  //Truncate spaces and assign values to arguments as needed
                  for (var i = 0; i < tmpArr.length; i++)
                  {
                    tmpStr = tmpArr[i].trim();
                    args.push(new AS3Argument());
                    if (tmpStr.indexOf('...') === 0)
                    {
                      //This is a ...rest argument, stop here
                      args[args.length-1].name = tmpStr.substr(3);
                      args[args.length-1].isRestParam = true;
                      AS3JS.debug('----->Parsed a ...rest param: ' + args[args.length-1].name);
                      break;
                    } else
                    {
                      //Grab the function name
                      tmpToken = AS3Parser.nextWord(tmpStr, 0, AS3Pattern.VARIABLE[0], AS3Pattern.VARIABLE[1]); //Parse out the function name
                      args[args.length-1].name = tmpToken.token; //Set the argument name
                      AS3JS.debug('----->Sub-Function argument found: ' + tmpToken.token);
                      //If a colon was next, we'll assume it was typed and grab it
                      if (tmpToken.index < tmpStr.length && tmpStr.charAt(tmpToken.index) == ':')
                      {
                        tmpToken = AS3Parser.nextWord(tmpStr, tmpToken.index, AS3Pattern.VARIABLE_TYPE[0], AS3Pattern.VARIABLE_TYPE[1]); //Parse out the argument type
                        args[args.length-1].type = tmpToken.token; //Set the argument type
                        AS3JS.debug('----->Sub-Function argument typed to: ' + tmpToken.token);
                      }
                      tmpToken = AS3Parser.nextWord(tmpStr, tmpToken.index, AS3Pattern.ASSIGN_START[0], AS3Pattern.ASSIGN_START[1]);
                      if (tmpToken.token == "=")
                      {
                        //Use all characters after self symbol to set value
                        tmpExtractArr = AS3Parser.extractUpTo(tmpStr, tmpToken.index, /[;\r\n]/g);
                        //Store value
                        args[args.length-1].value =  tmpExtractArr[0].trim();
                        //Store value
                        AS3JS.debug('----->Sub-Function argument defaulted to: ' + tmpExtractArr[0].trim());
                      }
                    }
                  }
                }
                return args;
              };
          AS3Parser.checkForCommentOpen = function(str) {
                return (str == "//") ? AS3ParseState.COMMENT_INLINE : (str == "/*") ? AS3ParseState.COMMENT_MULTILINE : null;
              };
          AS3Parser.checkForCommentClose = function(state, str) {
                return (state == AS3ParseState.COMMENT_INLINE && (str.charAt(0) == '\n' || str.charAt(0) == '\r' || str.charAt(0) == '')) ? true : (state == AS3ParseState.COMMENT_MULTILINE && str == "*/") ? true : false; 
              };
          AS3Parser.checkForStringOpen = function(str) {
                return (str == '"') ? AS3ParseState.STRING_DOUBLE_QUOTE : (str == "'") ? AS3ParseState.STRING_SINGLE_QUOTE : null;
              };
          AS3Parser.checkForStringClose = function(state, str) {
                return (state == AS3ParseState.STRING_DOUBLE_QUOTE && str == '"') ? true : (state == AS3ParseState.STRING_SINGLE_QUOTE && str == "'") ? true : false; 
              };
          AS3Parser.nextWord = function(src, index, characters, pattern) {
                characters = characters || AS3Pattern.IDENTIFIER[0];
                pattern = pattern || AS3Pattern.IDENTIFIER[1];
                var tokenBuffer = null;
                var extraBuffer = ''; //Contains characters that were missed
                var escapeToggle = false;
                var innerState = null;
                for (; index < src.length; index++)
                {
                  var c = src.charAt(index);
                  if (c.match(characters))
                  {
                    tokenBuffer = (tokenBuffer) ? tokenBuffer + c : c; //Create new token buffer if needed, otherwise append
                  } else if (!innerState && AS3Parser.checkForCommentOpen(src.substr(index, 2)) && !tokenBuffer)
                  {
                    tokenBuffer = null;
                    AS3JS.debug("Entering comment...");
                    innerState = AS3Parser.checkForCommentOpen(src.substr(index, 2));
                    extraBuffer += src.substr(index, 2);
                    index += 2; //Skip next index
                    //Loop until we break out of comment
                    for (; index < src.length; index++)
                    {
                      if (AS3Parser.checkForCommentClose(innerState, src.substr(index, 2)))
                      {
                        if (innerState == AS3ParseState.COMMENT_MULTILINE)
                        {
                          extraBuffer += src.substr(index, 2);
                          index++; //Skip next token
                        } else
                        {
                          extraBuffer += src.charAt(index);
                        }
                        innerState = null; //Return to previous state
                        AS3JS.debug("Exiting comment...");
                        break;
                      } else
                      {
                        extraBuffer += src.charAt(index);
                      }
                    }
                  }  else if (!innerState && AS3Parser.checkForStringOpen(src.charAt(index)) && !tokenBuffer)
                  {
                    tokenBuffer = null;
                    AS3JS.debug("Entering string...");
                    innerState = AS3Parser.checkForStringOpen(src.charAt(index));
                    extraBuffer += src.substr(index, 1);
                    index++; //Skip to next index
                    //Loop until we break out of string
                    for (; index < src.length; index++)
                    {
                      extraBuffer += src.charAt(index);
                      if (!escapeToggle && src.charAt(index) == '\\')
                      {
                        escapeToggle = true;
                        continue;
                      }
                      escapeToggle = false;
                      if (AS3Parser.checkForStringClose(innerState, src.charAt(index)))
                      {
                        innerState = null; //Return to previous state
                        AS3JS.debug("Exiting string...");
                        break;
                      }
                    }
                  } else if (tokenBuffer && tokenBuffer.match(pattern))
                  {
                    return new AS3Token(tokenBuffer, index, extraBuffer); //[Token, Index]
                  } else
                  {
                    if (tokenBuffer)
                    {
                      extraBuffer += tokenBuffer + c;
                    } else 
                    {
                      extraBuffer += c;
                    }
                    tokenBuffer = null;
                  }
                }
                return new AS3Token(tokenBuffer || null, index, extraBuffer); //[Token, Index]
              };
          AS3Parser.extractBlock = function(text, start, opening, closing) {
                start = AS3JSUtils.getDefaultValue(start, 0);
                opening = AS3JSUtils.getDefaultValue(opening, "{");
                closing = AS3JSUtils.getDefaultValue(closing, "}");
                var buffer = "";
                var i = start;
                var count = 0;
                var started = false;
                var insideString = null;
                var insideComment = null;
                var escapingChar = false;
                while (!(count == 0 && started) && i < text.length)
                {
                  if (insideComment)
                  {
                    //Inside of a comment, wait until we get out
                    if (insideComment == '//' && (text.charAt(i) == '\n' || text.charAt(i) == '\r'))
                    {
                      insideComment = null; //End inline comment
                      AS3JS.debug("Exited comment");
                    } else if (insideComment == '/*' && text.charAt(i) == '*' && i + 1 < text.length && text.charAt(i + 1) == '/')
                    {
                      insideComment = null; //End multiline comment
                      AS3JS.debug("Exited comment");
                    }
                  } else if (insideString)
                  {
                    //Inside of a string, wait until we get out
                    if (!escapingChar && text.charAt(i) == "\\")
                    {
                      escapingChar = true; //Start escape sequence
                    } else if (!escapingChar && text.charAt(i) == insideString)
                    {
                      insideString = null; //Found closing quote
                    } else
                    {
                      escapingChar = false; //Forget escape sequence
                    }
                  } else if (text.charAt(i) == opening)
                  {
                    started = true;
                    count++; //Found opening
                  } else if (text.charAt(i) == closing)
                  {
                    count--; //Found closing
                  } else if ((text.charAt(i) == '\"' || text.charAt(i) == '\''))
                  {
                    insideString = text.charAt(i); //Now inside of a string
                  } else if (text.charAt(i) == '/' && i + 1 < text.length && text.charAt(i + 1) == '/')
                  {
                    AS3JS.debug("Entering comment... " + "(//)");
                    insideComment = '//';
                  } else if (text.charAt(i) == '/' && i + 1 < text.length && text.charAt(i + 1) == '*')
                  {
                    AS3JS.debug("Entering comment..." + "(/*)");
                    insideComment = '/*';
                  }
                  if (started)
                  {
                    buffer += text.charAt(i);
                  }
                  i++;
                }
                if (!started)
                {
                  throw new Error("Error, no starting '" + opening  + "' found for method body while parsing " + AS3Parser.PREVIOUS_BLOCK);
                } else if (count > 0)
                {
                  throw new Error("Error, no closing '" + closing  + "' found for method body while parsing " + AS3Parser.PREVIOUS_BLOCK);
                } else if (count < 0)
                {
                  throw new Error("Error, malformed enclosing '" + opening + closing + " body while parsing " + AS3Parser.PREVIOUS_BLOCK);
                }
                return [buffer, i];
              };
          AS3Parser.extractUpTo = function(text, start, target) {
                var buffer = "";
                var i = start;
                var insideString = null;
                var insideComment = null;
                var escapingChar = false;
                var pattern = new RegExp(target);
                while (i < text.length)
                {
                  if (insideComment)
                  {
                    //Inside of a comment, wait until we get out
                    if (insideComment == '//' && (text.charAt(i) == '\n' || text.charAt(i) == '\r'))
                    {
                      insideComment = null; //End inline comment
                      AS3JS.debug("Exited comment");
                    } else if (insideComment == '/*' && text.charAt(i) == '*' && i + 1 < text.length && text.charAt(i + 1) == '/')
                    {
                      insideComment = null; //End multiline comment
                      AS3JS.debug("Exited comment");
                    }
                  } else if (insideString)
                  {
                    //Inside of a string, wait until we get out
                    if (!escapingChar && text.charAt(i) == "\\")
                    {
                      escapingChar = true; //Start escape sequence
                    } else if (!escapingChar && text.charAt(i) == insideString)
                    {
                      insideString = null; //Found closing quote
                    } else
                    {
                      escapingChar = false; //Forget escape sequence
                    }
                  } else if ((text.charAt(i) == '\"' || text.charAt(i) == '\''))
                  {
                    insideString = text.charAt(i); //Now inside of a string
                  } else if (text.charAt(i) == '/' && i + 1 < text.length && text.charAt(i + 1) == '/')
                  {
                    AS3JS.debug("Entering comment... " + "(//)");
                    insideComment = '//';
                  } else if (text.charAt(i) == '/' && i + 1 < text.length && text.charAt(i + 1) == '*')
                  {
                    AS3JS.debug("Entering comment..." + "(/*)");
                    insideComment = '/*';
                  } else if (text.charAt(i).match(pattern))
                  {
                    break; //Done
                  }
                  buffer += text.charAt(i);
                  i++;
                }
                return [buffer, i];
              };
          AS3Parser.checkArguments = function(fn) {
                if (fn.argList.length <= 0)
                {
                  return fn.value;
                }
                var start = fn.value.indexOf('{');
                var args = "";
                for (var i = 0; i < fn.argList.length; i++)
                {
                  //We will inject arguments into the top of the method definition
                  if (fn.argList[i].isRestParam)
                  {
                    args += "\n\t\t\tvar " + fn.argList[i].name + " = Array.prototype.slice.call(arguments).splice(" + i + ");";
                  } else if (fn.argList[i].value)
                  {
                    args += "\n\t\t\t" + fn.argList[i].name + " = AS3JSUtils.getDefaultValue(" + fn.argList[i].name + ", " + fn.argList[i].value + ");";
                  }
                }
                return fn.value.substr(0, start + 1) + args + fn.value.substr(start + 1);
              };
          AS3Parser.injectInstantiations = function(cls, fn) {
                var start = fn.value.indexOf('{');
                var text = "";
                for (var i = 0; i < cls.members.length; i++)
                {
                  //We will inject instantiated vars into the top of the method definition
                  if (cls.members[i] instanceof AS3Variable && AS3Class.nativeTypes.indexOf(cls.members[i].type) < 0)
                  {
                    text += "\n\t\t\tthis." + cls.members[i].name + " = " + cls.members[i].value + ";";
                  }
                }
                return fn.value.substr(0, start + 1) + text + fn.value.substr(start + 1);
              };
          AS3Parser.checkStack = function(stack, name) {
                if (!name)
                {
                  return null;
                }
                for (var i = stack.length - 1; i >= 0; i--)
                {
                  if (stack[i].name == name)
                  {
                    return stack[i];
                  }
                }
                return null;
              };
          AS3Parser.lookAhead = function(str, index) {
                //Look ahead in the function for assignments
                var originalIndex = index;
                var startIndex = -1;
                var endIndex = -1;
                var semicolonIndex = -1;
                var token = "";
                var extracted = "";
                //Not a setter if there is a dot operator immediately after
                if (str.charAt(index) == '.')
                {
                  return { token: null, extracted: '', startIndex: startIndex, endIndex: endIndex };
                }
                for (; index < str.length; index++)
                {
                  if(str.charAt(index).match(/[+-\/=*]/g))
                  {
                    //Append to the assignment instruction
                    token += str.charAt(index);
                    startIndex = index;
                  } else if (startIndex < 0 && str.charAt(index).match(/[\t\s]/g)) //Skip these characters
                  {
                    continue;
                  } else
                  {
                    break; //Exits when token has already been started and no more regexes pass
                  }
                }
                
                //Only allow these patterns
                if (!(token == "=" || token == "++" || token == "--" || token == "+=" || token == "-=" || token == "*=" || token == "/="))
                {
                  token = null;
                }
                  
                if (token)
                {
                  //Pick whatever is closer, new line or semicolon
                  endIndex = str.indexOf('\n', startIndex);
                  if (endIndex < 0)
                  {
                    endIndex = str.length - 1;
                  }
                  //Windows fix
                  if (str.charAt(endIndex - 1) == '\r')
                  {
                    endIndex--;
                  }
                  //We want to place closing parens before semicolon if it exists
                  semicolonIndex = str.indexOf(";", startIndex);
                  if (semicolonIndex < endIndex)
                  {
                    endIndex = semicolonIndex;
                  }
                  extracted = str.substring(startIndex + token.length, endIndex);
                }
                
                return { token: token, extracted: extracted, startIndex: startIndex, endIndex: endIndex };
              };
          AS3Parser.parseFunc = function(cls, fnText, stack, statFlag) {
                statFlag = AS3JSUtils.getDefaultValue(statFlag, false);
                var i;
                var j;
                var index = 0;
                var result = '';
                var tmpStr = '';
                var tmpArgs;
                var tmpMember;
                var tmpClass;
                var tmpField;
                var prevToken;
                var currToken;
                var tmpParse;
                var tmpStatic = false;
                var tmpPeek;
                var objBuffer = ''; //Tracks the current object that is being "pathed" (e.g. "object.field1" or "object.field1[index + 1]", etc)
                var justCreatedVar = false; //Keeps track if we just started a var statement (to help test if we're setting a type))
                for (index = 0; index < fnText.length; index++)
                {
                  objBuffer = '';
                  prevToken = currToken;
                  currToken = AS3Parser.nextWord(fnText, index, AS3Pattern.VARIABLE[0], AS3Pattern.VARIABLE[1]);
                  result += currToken.extra; //<-Puts all other non-identifier characters into the buffer first
                  tmpMember = AS3Parser.checkStack(stack, currToken.token); //<-Check the stack for a member with this identifier already
                  index = currToken.index;
                  if (currToken.token)
                  {
                    if (currToken.token == 'function')
                    {
                      var t1 = AS3Parser.nextWord(fnText, index, AS3Pattern.VARIABLE[0], AS3Pattern.VARIABLE[1]);
                      var t2 = fnText.indexOf('(', index);
                      //If the parenthesis si less than the last index of the next parsed variable name
                      result += (t2 < t1.index) ? 'function' : 'function ' + t1.token;
                      tmpParse = AS3Parser.extractBlock(fnText, index, '(', ')'); //Parse out argument block
                      index = tmpParse[1]; //Update index
                      tmpArgs = AS3Parser.parseArguments(tmpParse[0]); //Extract arg types
                      //Join the args together without types
                      result += '(' + (function(args) {
                        var arr = [];
                        for (var i = 0; i < args.length; i++)
                        {
                          if (args[i] === '...rest')
                          {
                            break;
                          }
                          arr.push(args[i].name);
                        }
                        var str = arr.join(', ');
                        return str;
                      })(tmpArgs) + ')';
                      tmpParse = AS3Parser.extractBlock(fnText, index, '{', '}'); //Extract function block
                      index = tmpParse[1] - 1; //Update index
                      tmpParse = AS3Parser.parseFunc(cls, tmpParse[0], stack.concat(tmpArgs), statFlag); //Recurse into function
                      result += ' ' + tmpParse[0];
                    } else
                    {
                      if (currToken.token == 'this')
                      {
                        //No need to perform any extra checks on the subsequent token
                        tmpStatic = false;
                        tmpClass = cls;
                        objBuffer += currToken.token;
                        result += currToken.token;
                      } else
                      {
                        if (cls.classMap[currToken.token] && cls.parentDefinition !== cls.classMap[currToken.token] && !(justCreatedVar && currToken.extra.match(/:\s*/g)))
                        {
                          // If this is a token that matches a class from a potential import statement, store it in the filtered classMap
                          cls.classMapFiltered[currToken.token] = cls.classMap[currToken.token];
                        }
                        tmpStatic = (cls.className == currToken.token || cls.retrieveField(currToken.token, true) !== null);
                        
                        //Find field in class, then make sure we didn't already have a local member defined with this name, and skip next block if static since the definition is the class itself
                        //Note: tmpMember needs to be checked, if something is in there it means we have a variable with the same name in local scope
                        if (cls.retrieveField(currToken.token, tmpStatic) && cls.className != currToken.token && !tmpMember && !(prevToken && prevToken.token === "var"))
                        {
                          tmpMember = cls.retrieveField(currToken.token, tmpStatic); //<-Reconciles the type of the current variable
                          if (tmpMember && (tmpMember.subType == 'get' || tmpMember.subType == 'set'))
                          {
                            tmpPeek = AS3Parser.lookAhead(fnText, index);
                            if (tmpPeek.token)
                            {
                              //Handle differently if we are assigning a setter
                              
                              //Prepend the correct term
                              if (tmpStatic)
                              {
                                objBuffer += (cls.retrieveField(currToken.token, tmpStatic)) ? cls.className + '.' : currToken.token + '.';
                                result += (cls.retrieveField(currToken.token, tmpStatic)) ? cls.className + '.' : currToken.token + '.';
                              } else
                              {
                                objBuffer += 'this.';
                                result += 'this.';
                              }
                              objBuffer += 'get_' + currToken.token + '()';
                              result += 'set_' + currToken.token + '(';
                              index = tmpPeek.endIndex;
                              if (tmpPeek.token == '++')
                              {
                                result += objBuffer + ' + 1';
                              } else if (tmpPeek.token == '--')
                              {
                                result += objBuffer + ' - 1';
                              } else
                              {
                                tmpParse = AS3Parser.parseFunc(cls, tmpPeek.extracted, stack); //Recurse into the assignment to parse vars
                                if (tmpPeek.token == '=')
                                {
                                  result +=  tmpParse[0].trim();
                                } else 
                                {
                                  result += objBuffer + ' ' + tmpPeek.token.charAt(0) + ' (' + tmpParse[0] + ')';
                                }
                              }
                              result += ')';
                            } else
                            {
                              //Getters are easy
                              if (tmpStatic)
                              {
                                objBuffer += (cls.retrieveField(currToken.token, true)) ? cls.className + '.get_' + currToken.token + '()' : 'this.get_' + currToken.token + '()';
                                result += (cls.retrieveField(currToken.token, true)) ? cls.className + '.get_' + currToken.token + '()' : 'this.get_' + currToken.token + '()';
                              } else
                              {
                                objBuffer += 'this.get_' + currToken.token + '()';
                                result += 'this.get_' + currToken.token + '()';
                              }
                            }
                          } else
                          {
                            if (tmpStatic)
                            {
                              objBuffer += (cls.className == currToken.token) ? currToken.token : cls.className + '.' + currToken.token;
                              result += (cls.className == currToken.token) ? currToken.token : cls.className + '.' + currToken.token;
                            } else
                            {
                              objBuffer += (cls.retrieveField(currToken.token, false) && !statFlag && !(prevToken && prevToken.token === 'new' && cls.retrieveField(currToken.token, false).type !== "Class")) ? 'this.' + currToken.token : currToken.token;
                              result += (cls.retrieveField(currToken.token, false) && !statFlag && !(prevToken && prevToken.token === 'new' && cls.retrieveField(currToken.token, false).type !== "Class")) ? 'this.' + currToken.token : currToken.token;
                            }
                          }
                        } else
                        {
                          //Likely a local variable, argument, or static reference
                          if (tmpStatic)
                          {
                            objBuffer += currToken.token;
                            result += currToken.token;
                          } else
                          {
                            objBuffer += (cls.retrieveField(currToken.token, false) && !tmpMember && !(prevToken && prevToken.token === "var")) ? 'this.' + currToken.token : currToken.token;
                            result += (cls.retrieveField(currToken.token, false) && !tmpMember && !(prevToken && prevToken.token === "var")) ? 'this.' + currToken.token : currToken.token;
                          }
                        }
                        if (tmpStatic)
                        {
                          //Just use the class itself, we will reference fields from it. If parser injected the static prefix manually, we'll try to determome the type of var instead
                          tmpClass = (cls.className == currToken.token) ? cls : (tmpMember) ? cls.classMap[tmpMember.type] || null : null; 
                        } else
                        {
                          //Use the member's type to determine the class it's mapped to
                          tmpClass = (tmpMember && tmpMember.type && tmpMember.type != '*') ? cls.classMap[tmpMember.type] : null; 
                          //If no mapping was found, this may be a static reference
                          if (!tmpClass && cls.classMap[currToken.token])
                          {
                            tmpClass = cls.classMap[currToken.token];
                            tmpStatic = true;
                          }
                        }
                        //If tmpClass is null, it's possible we were trying to retrieve a Vector type. Let's fix this:
                        if (!tmpClass && tmpMember && tmpMember.type && tmpMember.type.replace(/Vector\.<(.*?)>/g, "$1") != tmpMember.type)
                        {
                          //Extract Vector type if necessary by testing regex
                          tmpClass = cls.classMap[tmpMember.type.replace(/Vector\.<(.*?)>/g, "$1")] || null;
                        }
                      }
                      //Note: At this point, tmpMember is no longer used, it was only needed to remember the type of the first token. objBuffer will be building out the token
                      
                      //If this had a variable declaration before it, we will add it to the local var stack and move on to the next token
                      if (prevToken && prevToken.token === "var")
                      {
                        justCreatedVar = true;
                        if (cls.retrieveField(currToken.token, tmpStatic))
                        {
                          //Appends current character index to the result, add dummy var to stack, and move on
                          result += fnText.charAt(index);
                          var localVar = new AS3Member();
                          localVar.name = currToken.token;
                          stack.push(localVar); //<-Ensures we don't add "this." or anything in front of this variable anymore
                          continue;
                        }
                      } else
                      {
                        justCreatedVar = false;
                      }
                      
                      //We have parsed the current token, and the index sits at the next level down in the object
                      for (; index < fnText.length; index++)
                      {
                        //Loop until we stop parsing a variable declaration
                        if (fnText.charAt(index) == '.')
                        {
                          var parsingVector =  (prevToken && prevToken.token === 'new' && currToken.token === 'Vector');
                          prevToken = currToken;
                          if (parsingVector)
                          {
                            //We need to allow asterix
                            currToken = AS3Parser.nextWord(fnText, index, AS3Pattern.VARIABLE_TYPE[0], AS3Pattern.VARIABLE_TYPE[1]);
                          } else
                          {
                            currToken = AS3Parser.nextWord(fnText, index, AS3Pattern.VARIABLE[0], AS3Pattern.VARIABLE[1]);
                          }
                          result += currToken.extra; //<-Puts all other non-identifier characters into the buffer first
                          index = currToken.index;
                          if (tmpClass)
                          {
                            //This means we are coming from a typed variable
                            tmpField = tmpClass.retrieveField(currToken.token, tmpStatic);
                            if (tmpField)
                            {
                              //console.log("parsing: " + tmpField.name + ":" + tmpField.type)
                              //We found a field that matched this value within the class
                              if (tmpField instanceof AS3Function)
                              {
                                if (tmpField.subType == 'get' || tmpField.subType == 'set')
                                {
                                  tmpPeek = AS3Parser.lookAhead(fnText, index);
                                  if (tmpPeek.token)
                                  {
                                    //Handle differently if we are assigning a setter
                                    objBuffer += '.get_' + currToken.token + '()';
                                    result += 'set_' + currToken.token + '(';
                                    index = tmpPeek.endIndex;
                                    if (tmpPeek.token == '++')
                                    {
                                      result += objBuffer + ' + 1';
                                    } else if (tmpPeek.token == '--')
                                    {
                                      result += objBuffer + ' - 1';
                                    } else
                                    {
                                      tmpParse = AS3Parser.parseFunc(cls, tmpPeek.extracted, stack); //Recurse into the assignment to parse vars
                                      if (tmpPeek.token == '=')
                                      {
                                        result += tmpParse[0].trim();
                                      } else
                                      {
                                        result += objBuffer + ' ' + tmpPeek.token.charAt(0) + ' (' + tmpParse[0] + ')';
                                      }
                                    }
                                    result += ')';
                                  } else
                                  {
                                    objBuffer += '.get_' + currToken.token + '()';
                                    result += 'get_' + currToken.token + "()";
                                  }
                                  //console.log("set get flag: " + currToken.token);
                                } else
                                {
                                  objBuffer += '.' + currToken.token;
                                  result += currToken.token;
                                }
                              } else
                              {
                                objBuffer += '.' + currToken.token;
                                result += currToken.token;
                              }
                            } else
                            {
                              objBuffer += '.' + currToken.token;
                              result += currToken.token;
                              //console.log("appened typed: " + currToken.token);
                            }
                            //Update the type if this is not a static prop
                            if (tmpClass && tmpField && tmpField.type && tmpField.type != '*')
                            {
                              //Extract Vector type if necessary by testing regex
                              tmpClass = (tmpField.type.replace(/Vector\.<(.*?)>/g, "$1") != tmpField.type) ? tmpClass.classMap[tmpField.type.replace(/Vector\.<(.*?)>/g, "$1")] || null : tmpClass.classMap[tmpField.type] || null;
                            } else
                            {
                              tmpClass = null;
                            }
                          } else
                          {
                            //console.log("appened untyped: " + currToken.token);
                            objBuffer += '.' + currToken.token;
                            result += currToken.token;
                          }
                        } else if (fnText.charAt(index) == '[')
                        {
                          //We now have to recursively parse the inside of this open bracket
                          tmpParse = AS3Parser.extractBlock(fnText, index, '[', ']');
                          index = tmpParse[1];
                          tmpParse = AS3Parser.parseFunc(cls, tmpParse[0], stack); //Recurse into the portion that was extracted
                          //console.log("recursed into: " + tmpParse[0]);
                          objBuffer += tmpParse[0]; //Append this text to the object buffer string so we can remember the variable we have accessed
                          result += tmpParse[0];
                        }
                        tmpStatic = false; //Static can no longer be possible after the second field
                        if (!fnText.charAt(index).match(/[.\[]/g)) 
                        {
                          objBuffer = ''; //Clear out the current object buffer
                          index--;
                          break;
                        }
                        index--;
                      }
                    }
                  } else
                  {
                    index = currToken.index - 1;
                  }
                }
                return [result, index];
              };
          AS3Parser.cleanup = function(text) {
                var i;
                var type;
                var params;
                var val;
                var matches = text.match(AS3Pattern.VECTOR[0]);
                //For each Vector.<>() found in the text
                for (i in matches)
                {
                  //Strip the type and provided params
                  type = matches[i].replace(AS3Pattern.VECTOR[0], '$1').trim();
                  params = matches[i].replace(AS3Pattern.VECTOR[0], '$2').split(',');
                  //Set the default based on var type
                  if (type == 'int' || type == 'uint' || type == 'Number')
                  {
                    val = "0";
                  } else if (type == 'Boolean')
                  {
                    val = "false";
                  } else
                  {
                    val = "null";
                  }
                  //Replace accordingly
                  if (params.length > 0 && params[0].trim() != '')
                  {
                    text = text.replace(AS3Pattern.VECTOR[1], "AS3JSUtils.createArray(" + params[0] + ", " + val + ")");
                  } else
                  {
                    text = text.replace(AS3Pattern.VECTOR[1], "[]");
                  }
                }
                matches = text.match(AS3Pattern.ARRAY[0]);
                //For each Array() found in the text
                for (i in matches)
                {
                  //Strip the provided params
                  params = matches[i].replace(AS3Pattern.ARRAY[0], '$1').trim();
                  //Replace accordingly
                  if (params.length > 0 && params[0].trim() != '')
                  {
                    text = text.replace(AS3Pattern.ARRAY[1], "AS3JSUtils.createArray(" + params[0] + ", null)");
                  } else
                  {
                    text = text.replace(AS3Pattern.ARRAY[1], "[]");
                  }
                }
                //Take care of function binding
                
                //Now cleanup variable types
                text = text.replace(/([^0-9a-zA-Z_$.])var(\s*[a-zA-Z_$*][0-9a-zA-Z_$.<>]*)\s*:\s*([a-zA-Z_$*][0-9a-zA-Z_$.<>]*)/g, "$1var$2");
                
                return text;
              };
          
          
          AS3Parser.prototype.stack = null;
          AS3Parser.prototype.src = null;
          AS3Parser.prototype.packageName = null;
          AS3Parser.prototype.getState = function() {
                return (this.stack.length > 0) ? this.stack[this.stack.length - 1] : null;
              };
          AS3Parser.prototype.parseHelper = function(cls, src) {
                var i;
                var j;
                var c;
                var currToken = null;
                var tmpToken = null;
                var tmpStr = null;
                var tmpArr = null;
                var currMember = null;
                var index;
                for (index = 0; index < src.length; index++)
                {
                  c = src.charAt(index);
                  if (this.getState() == AS3ParseState.START)
                  {
                    //String together letters only until we reach a non-letter
                    currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
                    index = currToken.index - 1; //Update to the new position
                    if (currToken.token == 'package')
                    {
                      this.stack.push(AS3ParseState.PACKAGE_NAME);
                    }
                  } else if (this.getState() == AS3ParseState.PACKAGE_NAME)
                  {
                    currToken = AS3Parser.nextWord(src, index, AS3Pattern.OBJECT[0], AS3Pattern.OBJECT[1]); //Package name
                    tmpToken = AS3Parser.nextWord(src, index, AS3Pattern.CURLY_BRACE[0], AS3Pattern.CURLY_BRACE[1]); //Upcoming curly brace
                    index = currToken.index - 1;
                    if (!currToken.token || !tmpToken.token)
                    {
                      throw new Error("Error parsing package name.");
                    } else
                    {
                      if (tmpToken.index < currToken.index)
                      {
                        cls.packageName = ''; //Curly brace came before next token
                      } else
                      {
                        cls.packageName = currToken.token; //Just grab the package name
                      }
                      AS3JS.debug('Found package: ' + cls.packageName);
                      cls.importWildcards.push(cls.packageName + '.*'); //Add wild card for its own folder
                      this.stack.push(AS3ParseState.PACKAGE);
                      AS3JS.debug('Attempting to parse package...');
                    }
                  } else if (this.getState() == AS3ParseState.PACKAGE)
                  {
                    currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
                    index = currToken.index - 1;
                    if (currToken.token == 'class' || currToken.token == 'interface')
                    {
                      if(currToken.token == 'interface')
                        cls.isInterface = true;
                      this.stack.push(AS3ParseState.CLASS_NAME);
                      AS3JS.debug('Found class keyword...');
                    } else if (currToken.token == 'import')
                    {
                      this.stack.push(AS3ParseState.IMPORT_PACKAGE);
                      AS3JS.debug('Found import keyword...');
                    } else if (currToken.token == 'require')
                    {
                      this.stack.push(AS3ParseState.REQUIRE_MODULE);
                      AS3JS.debug('Found require keyword...');
                    }
                  } else if (this.getState() == AS3ParseState.CLASS_NAME)
                  {
                    currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
                    tmpToken = AS3Parser.nextWord(src, index, AS3Pattern.CURLY_BRACE[0], AS3Pattern.CURLY_BRACE[1]);
                    index = currToken.index;
                    if (!currToken.token || !tmpToken.token)
                    {
                      throw new Error("Error parsing class name.");
                    } else if (tmpToken.index < currToken.index)
                    {
                      throw new Error("Error, no class name found before curly brace.");
                    } else
                    {
                      //Set the class name
                      cls.className = currToken.token;
                      cls.classMap[cls.className] = cls; //Register self into the import map (used for static detection)
                      //Now we will check for parent class and any interfaces
                      currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
                      if (currToken.token == 'extends' && currToken.index < tmpToken.index)
                      {
                        index = currToken.index;
                        currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
                        index = currToken.index;
                        //The token following 'extends' must be the parent class
                        /* NOTE: Commenting this out, used to be hard-coding to prevent flash packages from importing  */
                        if ([/*'MovieClip', 'Sprite', 'DisplayObject', 'DisplayObjectContainer'*/].indexOf(currToken.token) < 0)
                        {
                          cls.parent = currToken.token;
                        }
                        //Prep the next token
                        currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
                        AS3JS.debug("Found parent: " + cls.parent);
                      }
                      if (currToken.token == 'implements' && currToken.index < tmpToken.index)
                      {
                        index = currToken.index;
                        currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
                        index = currToken.index;
                        //The token following 'implements' must be an interface
                        cls.interfaces.push(currToken.token);
                        AS3JS.debug("Found interface: " + currToken.token);
                        currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
                        //While we are at a token before the next curly brace
                        while (currToken.index < tmpToken.index && currToken.index < src.length)
                        {
                          //Consider self token another interface being implemented
                          index = currToken.index;
                          AS3JS.debug("Found interface: " + currToken.token);
                          cls.interfaces.push(currToken.token);
                          currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
                          index = currToken.index;
                        }
                      }
                      AS3JS.debug('Parsed class name: ' + cls.className);
                      //Now parsing inside of the class
                      this.stack.push(AS3ParseState.CLASS);
                      AS3JS.debug('Attempting to parse class...');
                      
                      //Extract out the next method block
                      AS3Parser.PREVIOUS_BLOCK = cls.className + ":Class";
                      tmpStr = AS3Parser.extractBlock(src, index)[0];
                      index += tmpStr.length - 1;
                      
                      //Recursively call parseHelper again under this new state (Once returned, package will be exited)
                      this.parseHelper(cls, tmpStr);
                    }
                  } else if (this.getState() == AS3ParseState.CLASS)
                  {
                    currMember = currMember || new AS3Member(); //Declare a new member to work with if it doesn't exist yet
                    currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
                    index = currToken.index - 1;
                    if (currToken.token == AS3Encapsulation.PUBLIC || currToken.token == AS3Encapsulation.PRIVATE || currToken.token == AS3Encapsulation.PROTECTED)
                    {
                      currMember.encapsulation = currToken.token;
                      AS3JS.debug('->Member encapsulation set to ' + currMember.encapsulation);
                    } else if (currToken.token == 'static')
                    {
                      currMember.isStatic = true;
                      AS3JS.debug('-->Static flag set');
                    } else if (currToken.token == AS3MemberType.VAR || currToken.token == AS3MemberType.CONST)
                    {
                      AS3JS.debug('--->Member type "variable" set.');
                      currMember = currMember.createVariable(); //Transform the member into a variable
                      this.stack.push(AS3ParseState.MEMBER_VARIABLE);
                    } else if (currToken.token == AS3MemberType.FUNCTION)
                    {
                      currToken = AS3Parser.nextWord(src, index + 1, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
                      //Check for getter/setter
                      if ((currToken.token == 'get' || currToken.token == 'set') && src[index + 1 + currToken.token.length + 1] != '(')
                      {
                        AS3JS.debug('--->Member sub-type "' + currToken.token + '" set.');
                        currMember.subType = currToken.token;
                        index = currToken.index - 1;
                      }
                      currMember = currMember.createFunction(); //Transform the member into a function
                      this.stack.push(AS3ParseState.MEMBER_FUNCTION);
                      AS3JS.debug('---->Member type "function" set.');
                    }
                  } else if (this.getState() == AS3ParseState.MEMBER_VARIABLE)
                  {
                    currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
                    currMember.name = currToken.token; //Set the member name
                    AS3JS.debug('---->Variable name declared: ' + currToken.token);
                    index = currToken.index;
                    if (src.charAt(index) == ":")
                    {
                      currToken = AS3Parser.nextWord(src, index, AS3Pattern.VARIABLE_TYPE[0], AS3Pattern.VARIABLE_TYPE[1]);
                      index = currToken.index;
                      currMember.type = currToken.token;//Set the value type name
                      AS3JS.debug('---->Variable type for ' + currMember.name + ' declared as: ' + currToken.token);
                    }
                    currToken = AS3Parser.nextWord(src, index, AS3Pattern.ASSIGN_START[0], AS3Pattern.ASSIGN_START[1]);
                    if (currToken.token == "=")
                    {
                      //Use all characters after self symbol to set value
                      index = currToken.index;
                      tmpArr = AS3Parser.extractUpTo(src, index, /[;\r\n]/g);
                      //Store value
                      currMember.value = tmpArr[0].trim();
                      index =  tmpArr[1];
                      
                      cls.membersWithAssignments.push(currMember);
                    }
          
                    //Store and delete current member and exit
                    if (currMember.isStatic)
                    {
                      cls.staticMembers.push(currMember);
                    } else
                    {
                      cls.members.push(currMember);
                    }
                    cls.registerField(currMember.name, currMember);
                    currMember = null;
                    this.stack.pop();
                  } else if (this.getState() == AS3ParseState.MEMBER_FUNCTION)
                  {
                    //Parse the arguments
                    currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
                    index = currToken.index;
                    currMember.name = currToken.token; //Set the member name
                    AS3JS.debug('****>Function name declared: ' + currToken.token);
                    
                    AS3Parser.PREVIOUS_BLOCK = currMember.name + ":Function";
                    tmpArr = AS3Parser.extractBlock(src, index, '(', ')');
                    index = tmpArr[1] - 1; //Ending index of parsed block
                    tmpStr = tmpArr[0].trim(); //Parsed block
                    tmpStr = tmpStr.substr(1, tmpStr.length - 2); //Remove outer parentheses
                    tmpArr = null; //Trash this
                    tmpArr = tmpStr.split(','); //Split args by commas
                    //Don't bother if there are no arguments
                    if (tmpArr.length > 0 && tmpArr[0] != '')
                    {
                      //Truncate spaces and assign values to arguments as needed
                      for (i = 0; i < tmpArr.length; i++)
                      {
                        tmpStr = tmpArr[i];
                        //Grab the function name
                        tmpToken = AS3Parser.nextWord(tmpStr, 0, AS3Pattern.VARIABLE[0], AS3Pattern.VARIABLE[1]); //Parse out the function name
                        currMember.argList.push(new AS3Argument());
                        if (tmpStr.indexOf('...') === 0)
                        {
                          //This is a ...rest argument, stop here
                          currMember.argList[currMember.argList.length-1].name = tmpStr.substr(3);
                          currMember.argList[currMember.argList.length-1].isRestParam = true;
                          AS3JS.debug('----->Parsed a ...rest param: ' + currMember.argList[currMember.argList.length-1].name);
                          break;
                        } else
                        {
                          currMember.argList[currMember.argList.length-1].name = tmpToken.token; //Set the argument name
                          AS3JS.debug('----->Function argument found: ' + tmpToken.token);
                          //If a colon was next, we'll assume it was typed and grab it
                          if (tmpToken.index < tmpStr.length && tmpStr.charAt(tmpToken.index) == ':')
                          {
                            tmpToken = AS3Parser.nextWord(tmpStr, tmpToken.index, AS3Pattern.VARIABLE_TYPE[0], AS3Pattern.VARIABLE_TYPE[1]); //Parse out the argument type
                            currMember.argList[currMember.argList.length-1].type = tmpToken.token; //Set the argument type
                            AS3JS.debug('----->Function argument typed to: ' + tmpToken.token);
                          }
                          tmpToken = AS3Parser.nextWord(tmpStr, tmpToken.index, AS3Pattern.ASSIGN_START[0], AS3Pattern.ASSIGN_START[1]);
                          if (tmpToken.token == "=")
                          {
                            //Use all characters after self symbol to set value
                            tmpToken = AS3Parser.nextWord(tmpStr, tmpToken.index, AS3Pattern.ASSIGN_UPTO[0], AS3Pattern.ASSIGN_UPTO[1]);
                            if (!tmpToken)
                            {
                              throw new Error("Error during variable assignment in arg" + currMember.argList[currMember.argList.length - 1].name);
                            }
                            //Store value
                            currMember.argList[currMember.argList.length-1].value = tmpToken.token.trim();
                            AS3JS.debug('----->Function argument defaulted to: ' + tmpToken.token.trim());
                          }
                        }
                      }
                    }
                    AS3JS.debug('------>Completed paring args: ', currMember.argList);
                    //Type the function if needed
                    if (src.charAt(index + 1) == ":")
                    {
                      tmpToken = AS3Parser.nextWord(src, index + 1, AS3Pattern.VARIABLE_TYPE[0], AS3Pattern.VARIABLE_TYPE[1]); //Parse out the function type if needed
                      index = tmpToken.index;
                      currMember.type = tmpToken.token;
                      AS3JS.debug('------>Typed the function to: ', currMember.type);
                    }
          
                    
                    if (cls.isInterface)
                    {
                      //Store and delete current member and exit
                      currMember.value = '{}';
                      if (currMember.subType == 'get')
                      {
                        (currMember.isStatic) ? cls.staticGetters.push(currMember) : cls.getters.push(currMember);
                      } else if (currMember.subType == 'set')
                      {
                        (currMember.isStatic) ? cls.staticSetters.push(currMember) : cls.setters.push(currMember);
                      } else if (currMember.isStatic)
                      {
                        cls.staticMembers.push(currMember);
                      } else
                      {
                        cls.members.push(currMember);
                      }
                      cls.registerField(currMember.name, currMember);
                      //Done parsing function
                      currMember = null;
                      this.stack.pop();
                    } else
                    {
                      //Save the function body
                      AS3Parser.PREVIOUS_BLOCK = currMember.name + ":Function";
                      tmpArr = AS3Parser.extractBlock(src, index);
                      index = tmpArr[1];
                      currMember.value = tmpArr[0].trim();
          
                      //Store and delete current member and exit
                      if (currMember.subType == 'get')
                      {
                        (currMember.isStatic) ? cls.staticGetters.push(currMember) : cls.getters.push(currMember);
                      } else if (currMember.subType == 'set')
                      {
                        (currMember.isStatic) ? cls.staticSetters.push(currMember) : cls.setters.push(currMember);
                      } else if (currMember.isStatic)
                      {
                        cls.staticMembers.push(currMember);
                      } else
                      {
                        cls.members.push(currMember);
                      }
                      cls.registerField(currMember.name, currMember);
          
                      currMember = null;
                      this.stack.pop();
                    }
                  } else if (this.getState() == AS3ParseState.LOCAL_VARIABLE)
                  {
          
                  } else if (this.getState() == AS3ParseState.LOCAL_FUNCTION)
                  {
          
                  } else if (this.getState() == AS3ParseState.IMPORT_PACKAGE)
                  {
                    //The current token is a class import
                    currToken = AS3Parser.nextWord(src, index, AS3Pattern.IMPORT[0], AS3Pattern.IMPORT[1]);
                    index = currToken.index - 1;
                    if (!currToken.token)
                    {
                      throw new Error("Error parsing import.");
                    } else
                    {
                      AS3JS.debug("Parsed import name: " + currToken.token);
                      if (currToken.token.indexOf("*") >= 0)
                      {
                        cls.importWildcards.push(currToken.token); //To be resolved later
                      }
                      else
                      {
                        cls.imports.push(currToken.token); //No need to resolve
                      }
                      this.stack.push(AS3ParseState.PACKAGE);
                    }
                  } else if (this.getState() == AS3ParseState.REQUIRE_MODULE)
                  {
                    //The current token is a module requirement
                    currToken = AS3Parser.nextWord(src, index, AS3Pattern.REQUIRE[0], AS3Pattern.REQUIRE[1]);
                    index = currToken.index - 1;
                    if(!currToken.token)
                      throw new Error("Error parsing require.");
                    else {
                      AS3JS.debug("Parsed require name: " + currToken.token);
                      cls.requires.push(currToken.token.trim());
                      this.stack.push(AS3ParseState.PACKAGE);
                    }
                  }
                }
              };
          AS3Parser.prototype.parse = function() {
                var classDefinition = new AS3Class();
                this.stack.splice(0, this.stack.length);
                this.stack.push(AS3ParseState.START);
                
                this.parseHelper(classDefinition, this.src);
                
                if (!classDefinition.className)
                {
                  throw new Error("Error, no class provided for package: " + this.packageName);
                }
                return classDefinition;
              }
          
          
          module.exports = AS3Parser;
          
        }
      }, AS3Token: {
        compiled: false,
        source: function ( module ) {
          
          var AS3Token = function(token, index, extra) {
                this.token = token;
                this.index = index;
                this.extra = extra;
              };
          
          
          
          
          AS3Token.prototype.token = null;
          AS3Token.prototype.index = 0;
          AS3Token.prototype.extra = null
          
          
          module.exports = AS3Token;
          
        }
      }
    }, "com.mcleodgaming.as3js.types": {
      AS3Argument: {
        compiled: false,
        source: function ( module ) {
          var AS3Variable = imports('com.mcleodgaming.as3js.types', 'AS3Variable');
          
          var AS3Argument = function() {
                
              };
          
          AS3Argument.prototype = Object.create(AS3Variable.prototype);
          
          
          AS3Argument.prototype.isRestParam = false
          
          
          module.exports = AS3Argument;
          
        }
      }, AS3Function: {
        compiled: false,
        source: function ( module ) {
          var AS3Member = imports('com.mcleodgaming.as3js.types', 'AS3Member');
          var AS3Variable;
          module.inject = function () {
            AS3Variable = imports('com.mcleodgaming.as3js.types', 'AS3Variable');
          };
          
          var AS3Function = function() {
                this.argList = null;
                this.argList = [];
              };
          
          AS3Function.prototype = Object.create(AS3Member.prototype);
          
          
          AS3Function.prototype.argList = null;
          AS3Function.prototype.hasArgument = function() {
                for(var i = 0; i < this.argList.length; i++)
                  if(this.argList[i].name == this.name)
                    return true;
                return false;
              };
          AS3Function.prototype.buildLocalVariableStack = function() {
                var i;
                var text = this.value || '';
                var matches = text.match(/(var|,)(.*?)([a-zA-Z_$][0-9a-zA-Z_$]*):([a-zA-Z_$][0-9a-zA-Z_$]*)/g);
                var locals = [];
                if(this.argList) {
                  for(i in this.argList) {
                    locals.push(this.argList[i]);
                  }
                }
                for(i in matches) {
                  var tmpVar = new AS3Variable();
                  tmpVar.name = matches[i].replace(/(var|,)(.*?)([a-zA-Z_$][0-9a-zA-Z_$]*):([a-zA-Z_$][0-9a-zA-Z_$]*)/g, "$3");
                  tmpVar.type = matches[i].replace(/(var|,)(.*?)([a-zA-Z_$][0-9a-zA-Z_$]*):([a-zA-Z_$][0-9a-zA-Z_$]*)/g, "$4");
                  locals.push(tmpVar);
                }
                
                return locals;
              }
          
          
          module.exports = AS3Function;
          
        }
      }, AS3Member: {
        compiled: false,
        source: function ( module ) {
          var AS3Function, AS3Variable;
          module.inject = function () {
            AS3Function = imports('com.mcleodgaming.as3js.types', 'AS3Function');
            AS3Variable = imports('com.mcleodgaming.as3js.types', 'AS3Variable');
          };
          
          var AS3Member = function() {
                this.name = null;
                this.type = '*';
                this.subType = null,
                this.value = null;
                this.encapsulation = "public";
                this.isStatic = false;
              };
          
          
          
          
          AS3Member.prototype.name = null;
          AS3Member.prototype.type = null;
          AS3Member.prototype.subType = null;
          AS3Member.prototype.value = null;
          AS3Member.prototype.encapsulation = null;
          AS3Member.prototype.isStatic = false;
          AS3Member.prototype.createVariable = function() {
                var obj = new AS3Variable();
                obj.name = this.name;
                obj.type = this.type;
                obj.subType = this.subType,
                obj.value = this.value;
                obj.encapsulation = this.encapsulation;
                obj.isStatic = this.isStatic;
                return obj;
              };
          AS3Member.prototype.createFunction = function() {
                var obj = new AS3Function();
                obj.name = this.name;
                obj.type = this.type;
                obj.subType = this.subType,
                obj.value = this.value;
                obj.encapsulation = this.encapsulation;
                obj.isStatic = this.isStatic;
                return obj;
              }
          
          
          module.exports = AS3Member;
          
        }
      }, AS3Variable: {
        compiled: false,
        source: function ( module ) {
          var AS3Member = imports('com.mcleodgaming.as3js.types', 'AS3Member');
          
          var AS3Variable = function() {
                
              };
          
          AS3Variable.prototype = Object.create(AS3Member.prototype);
          
          
          
          module.exports = AS3Variable;
          
        }
      }
    }
  };

  var imports = function ( packageName, className ) {
    if (!packages[packageName][className].compiled) {
      packages[packageName][className].compiled = true;
      packages[packageName][className].module = { exports: null, inject: null };
      packages[packageName][className].source(packages[packageName][className].module);
    }
    return packages[packageName][className].module.exports;
  };

  for (i in packages) {
    for (j in packages[i]) {
      imports(i, j);
    }
  }
  for (i in packages) {
    // Execute the injection functions
    for (j in packages[i]) {
      if (typeof packages[i][j].module.inject === 'function') {
        packages[i][j].module.inject();
      }
    }
  }

  if (options.entryPackage && options.entryClass) {
    var entryPoint = imports(options.entryPackage, options.entryClass);
    if (options.entryMode === "new") {
      new entryPoint();
    } else if (options.entryMode === "exports" && typeof module !== 'undefined') {
      module.exports = entryPoint;
    }
  }
})({ entryPackage: "com.mcleodgaming.as3js", entryClass: "AS3JS", entryMode: "exports" });
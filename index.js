var fs = require('fs');
var path = require('path');
var OOPS = require('oopsjs');

//Types
var AS3ParseState = OOPS.extend({
	_statics_: {
		START: "start",
		PACKAGE_NAME: "packageName",
		PACKAGE: "package",
		CLASS_NAME: "className",
		CLASS: "class",
		CLASS_EXTENDS: "classExtends",
		CLASS_IMPLEMENTS: "classImplements",
		COMMENT_INLINE: "commentInline",
		COMMENT_MULTILINE: "commentMultiline",
		STRING_SINGLE_QUOTE: "stringSingleQuote",
		STRING_DOUBLE_QUOTE: "stringDoubleQuote",
		STRING_REGEX: "stringRegex",
		MEMBER_VARIABLE: "memberVariable",
		MEMBER_FUNCTION: "memberFunction",
		LOCAL_VARIABLE: "localVariable",
		LOCAL_FUNCTION: "localFunction",
		IMPORT_PACKAGE: "importPackage"
	}
});
var AS3MemberType = OOPS.extend({
	_statics_: {
		VAR: "var",
		CONST: "const",
		FUNCTION: "function"
	}
});
var AS3Class = OOPS.extend({
	_statics_: {
		reservedWords: ["as","class","delete","false","if","instanceof","native","private","super","to","use","with","break","const","do","finally","implements","new","protected","switch","true","var","case","continue","else","for","import","internal","null","public","this","try","void","catch","default","extends","function","in","is","package","return","throw","typeof","while","each","get","set","namespace","include","dynamic","final","natiev","override","static","abstract","char","export","long","throws","virtual","boolean","debugger","float","prototype","to","volatile","byte","double","goto","short","transient","cast","enum","intrinsic","synchronized","type"],
		nativeTypes: ["Boolean", "Number", "int", "uint", "String" ]
	},
	package: null,
	className: null,
	imports: null,
	importWildcards: null,
	importExtras: null,
	interfaces: null,
	parent: null,
	parentDefinition: null,
	members: null,
	staticMembers: null,
	getters: null,
	setters: null,
	staticGetters: null,
	staticSetters: null,
	isInterface: false,
	fieldMap: null,
	staticFieldMap: null,
	importMap: null,
	_constructor_: function() {
		this.package = null;
		this.className = null;
		this.imports = [];
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
		this.isInterface = false;
		this.fieldMap = {};
		this.staticFieldMap = {};
		this.importMap = {};
	},
	registerImports: function(clsList) {
		var i;
		for(i in this.imports) {
			if(clsList[this.imports[i]]) {
				var lastIndex = this.imports[i].lastIndexOf(".");
				var shorthand = (lastIndex < 0) ? this.imports[i] : this.imports[i].substr(lastIndex + 1);
				this.importMap[shorthand] = clsList[this.imports[i]];
			}
		}
		for(i in this.importExtras) {
			if(clsList[this.importExtras[i]]) {
				var lastIndex = this.importExtras[i].lastIndexOf(".");
				var shorthand = (lastIndex < 0) ? this.importExtras[i] : this.importExtras[i].substr(lastIndex + 1);
				this.importMap[shorthand] = clsList[this.importExtras[i]];
			}
		}
	},
	registerField: function(name, value) {
		if(value && value.isStatic)
			this.staticFieldMap[name] = this.staticFieldMap[name] || value;
		else
			this.fieldMap[name] = this.fieldMap[name] || value;
	},
	retrieveField: function(name, isStatic) {
		if(isStatic) {
			if(this.staticFieldMap[name])
				return this.staticFieldMap[name];
			else if(this.parentDefinition)
				return this.parentDefinition.retrieveField(name, isStatic);
			else
				return null;
		} else {
			if(this.fieldMap[name])
				return this.fieldMap[name];
			else if(this.parentDefinition)
				return this.parentDefinition.retrieveField(name, isStatic);
			else
				return null;
		}
	},
	needsImport: function(pkg) {
		var i, j;
		var lastIndex = pkg.lastIndexOf(".");
		var shorthand = (lastIndex < 0) ? pkg : pkg.substr(lastIndex + 1);
		var matches;

		if(this.imports.indexOf(pkg) >= 0)
			return false; //Class was already imported

		if(shorthand == this.className && pkg == this.package)
			return true; //Don't need self
			
		if(shorthand == this.parent)
			return true; //Parent class is in another package
		
		//Now we must parse through all members one by one, looking at functions and variable types to determine the necessary imports
			
		for(i in this.members) {
			//See if the function definition or variable assigment have a need for this package
			if(this.members[i] instanceof AS3Function) {
				matches = this.members[i].value.match(AS3Pattern.VARIABLE_DECLARATION[1]);
				for(j in matches) {
					if(matches[j].split(":")[1] == shorthand)
						return true;
				}
				for(j in this.members[i].arguments) {
					if(typeof this.members[i].arguments[j].type == 'string' && this.members[i].arguments[j].type == shorthand)
						return true;
				}
			}
			if(typeof this.members[i].value == 'string' && this.members[i].value.match(new RegExp("([^a-zA-Z_$.])" + shorthand + "([^0-9a-zA-Z_$])", "g"))) {
				return true;
			} else if(typeof this.members[i].type == 'string' && this.members[i].type == shorthand) {
				return true;
			}
		}
		for(i in this.staticMembers) {
			//See if the function definition or variable assigment have a need for this package
			if(this.staticMembers[i] instanceof AS3Function) {
				matches = this.staticMembers[i].value.match(AS3Pattern.VARIABLE_DECLARATION[1]);
				for(j in matches) {
					if(matches[j].split(":")[1] == shorthand)
						return true;
				}
				for(j in this.staticMembers[i].arguments) {
					if(typeof this.staticMembers[i].arguments[j].type == 'string' && this.staticMembers[i].arguments[j].type == shorthand)
						return true;
				}
			}
			if(typeof this.staticMembers[i].value == 'string' && this.staticMembers[i].value.match(new RegExp("([^a-zA-Z_$.])" + shorthand + "([^0-9a-zA-Z_$])", "g"))) {
				return true;
			} else if(typeof this.staticMembers[i].type == 'string' && this.staticMembers[i].type == shorthand) {
				return true;
			}
		}
		for(i in this.getters) {
			//See if the function definition or variable assigment have a need for this package
			matches = this.getters[i].value.match(AS3Pattern.VARIABLE_DECLARATION[1]);
			for(j in matches) {
				if(matches[j].split(":")[1] == shorthand)
					return true;
			}
			for(j in this.getters[i].arguments) {
				if(typeof this.getters[i].arguments[j].type == 'string' && this.getters[i].arguments[j].type == shorthand)
					return true;
			}
			if(typeof this.getters[i].value == 'string' && this.getters[i].value.match(new RegExp("([^a-zA-Z_$.])" + shorthand + "([^0-9a-zA-Z_$])", "g"))) {
				return true;
			} else if(typeof this.getters[i].type == 'string' && this.getters[i].type == shorthand) {
				return true;
			}
		}
		for(i in this.setters) {
			matches = this.setters[i].value.match(AS3Pattern.VARIABLE_DECLARATION[1]);
			for(j in matches) {
				if(matches[j].split(":")[1] == shorthand)
					return true;
			}
			//See if the function definition or variable assigment have a need for this package
			for(j in this.setters[i].arguments) {
				if(typeof this.setters[i].arguments[j].type == 'string' && this.setters[i].arguments[j].type == shorthand)
					return true;
			}
			if(typeof this.setters[i].value == 'string' && this.setters[i].value.match(new RegExp("([^a-zA-Z_$.])" + shorthand + "([^0-9a-zA-Z_$])", "g"))) {
				return true;
			} else if(typeof this.setters[i].type == 'string' && this.setters[i].type == shorthand) {
				return true;
			}
		}
		for(i in this.staticGetters) {
			matches = this.staticGetters[i].value.match(AS3Pattern.VARIABLE_DECLARATION[1]);
			for(j in matches) {
				if(matches[j].split(":")[1] == shorthand)
					return true;
			}
			//See if the function definition or variable assigment have a need for this package
			for(j in this.staticGetters[i].arguments) {
				if(typeof this.staticGetters[i].arguments[j].type == 'string' && this.staticGetters[i].arguments[j].type == shorthand)
					return true;
			}
			if(typeof this.staticGetters[i].value == 'string' && this.staticGetters[i].value.match(new RegExp("([^a-zA-Z_$.])" + shorthand + "([^0-9a-zA-Z_$])", "g"))) {
				return true;
			} else if(typeof this.staticGetters[i].type == 'string' && this.staticGetters[i].type == shorthand) {
				return true;
			}
		}
		for(i in this.staticSetters) {
			matches = this.staticSetters[i].value.match(AS3Pattern.VARIABLE_DECLARATION[1]);
			for(j in matches) {
				if(matches[j].split(":")[1] == shorthand)
					return true;
			}
			for(j in this.staticSetters[i].arguments) {
				if(typeof this.staticSetters[i].arguments[j].type == 'string' && this.staticSetters[i].arguments[j].type == shorthand)
					return true;
			}
			//See if the function definition or variable assigment have a need for this package
			if(typeof this.staticSetters[i].value == 'string' && this.staticSetters[i].value.match(new RegExp("([^a-zA-Z_$.])" + shorthand + "([^0-9a-zA-Z_$])", "g"))) {
				return true;
			} else if(typeof this.staticSetters[i].type == 'string' && this.staticSetters[i].type == shorthand) {
				return true;
			}
		}
		
		return false;
	},
	addImport: function(pkg) {
		if(this.imports.indexOf(pkg) < 0)
			this.imports.push(pkg);
	},
	addExtraImport: function(pkg) {
		if(this.importExtras.indexOf(pkg) < 0)
			this.importExtras.push(pkg);
	},
	findParents: function(classes) {
		if(!this.parent)
			return;
		for(var i in classes) {
			//Only gather vars from the parent
			if(classes[i] != this && this.parent == classes[i].className) {
				this.parentDefinition = classes[i]; //Found our parent
				return;
			}
		}
	},
	stringifyFunc: function(fn) {
		var buffer = "";
		if(fn instanceof AS3Function) {
			//Functions need to be handled differently
			buffer += "\t\t";
			//Prepend sub-type if it exists
			if(fn.subType)
				buffer += fn.subType + '_';
			//Print out the rest of the name and start the function definition
			buffer += (fn.name == this.className) ? "_constructor_" : fn.name
			buffer += ": function(";
			//Concat all of the arguments together
			tmpArr = [];
			for(j = 0; j < fn.arguments.length; j++) {
				if (!fn.arguments[j].isRestParam)
					tmpArr.push(fn.arguments[j].name);
			}
			buffer += tmpArr.join(", ") + ") ";
			//Function definition is finally added
			buffer += fn.value + ",\n";
		} else if(fn instanceof AS3Variable) {
			buffer += "\t\t";
			//Variables can be added immediately
			buffer += fn.name;
			buffer += ": " + fn.value + ",\n";
		}
		return buffer;
	},
	cleanup: function (text) {
		var i, type, params, val;
		var matches = text.match(AS3Pattern.VECTOR[0]);
		//For each Vector.<>() found in the text
		for(i in matches) {
			//Strip the type and provided params
			type = matches[i].replace(AS3Pattern.VECTOR[0], '$1').trim();
			params = matches[i].replace(AS3Pattern.VECTOR[0], '$2').split(',');
			//Set the default based on var type
			if(type == 'int' || type == 'uint' || type == 'Number')
				val = "0";
			else if(type == 'Boolean')
				val = "false";
			else
				val = "null";
			//Replace accordingly
			if(params.length > 0 && params[0].trim() != '')
				text = text.replace(AS3Pattern.VECTOR[1], "AS3JS.createArray(" + params[0] + ", " + val + ")");
			else
				text = text.replace(AS3Pattern.VECTOR[1], "[]");
		}
		matches = text.match(AS3Pattern.ARRAY[0]);
		//For each Array() found in the text
		for(i in matches) {
			//Strip the provided params
			params = matches[i].replace(AS3Pattern.ARRAY[0], '$1').trim();
			//Replace accordingly
			if(params.length > 0 && params[0].trim() != '')
				text = text.replace(AS3Pattern.ARRAY[1], "AS3JS.createArray(" + params[0] + ", null)");
			else
				text = text.replace(AS3Pattern.ARRAY[1], "[]");
		}
		//Take care of function binding
		
		//Now cleanup variable types
		text = text.replace(/([^0-9a-zA-Z_$.])var(.*?)\s*:\s*([a-zA-Z_$*][0-9a-zA-Z_$.<>]*)/g, "$1var$2");
		
		//Clenaup mistaken 'this'
		text = text.replace(/"this\.(.*?)"/g, "\"$1\"");
		text = text.replace(/'this\.(.*?)'/g, "'$1'");
		
		return text;
	},
	process: function(classes) {
		var self = this;
		var i, j, index, tmpMatch;
		var currParent = this;
		var allMembers = [];
		var allFuncs = [];
		var allStaticMembers = [];
		var allStaticFuncs = [];
		var allOtherSetters = [];
		var allOtherGetters = [];

		while(currParent) {
			//Parse members of this parent
			for(i in currParent.setters)
				allMembers.push(currParent.setters[i]);
			for(i in currParent.staticSetters)
				allStaticMembers.push(currParent.staticSetters[i]);
			for(i in currParent.getters)
				allMembers.push(currParent.getters[i]);
			for(i in currParent.staticGetters)
				allStaticMembers.push(currParent.staticGetters[i]);
			for(i in currParent.members)
				allMembers.push(currParent.members[i]);
			for(i in currParent.staticMembers)
				allStaticMembers.push(currParent.staticMembers[i]);
				
			//Go to the next parent
			currParent = currParent.parentDefinition;
		}
		for(i in this.setters)
			if(this.setters[i] instanceof AS3Function)
				allFuncs.push(this.setters[i]);
		for(i in this.staticSetters)
			if(this.staticSetters[i] instanceof AS3Function)
				allStaticFuncs.push(this.staticSetters[i]);
		for(i in this.getters)
			if(this.getters[i] instanceof AS3Function)
				allFuncs.push(this.getters[i]);
		for(i in this.staticGetters)
			if(this.staticGetters[i] instanceof AS3Function)
				allStaticFuncs.push(this.staticGetters[i]);
		for(i in this.members)
			if(this.members[i] instanceof AS3Function)
				allFuncs.push(this.members[i]);
		for(i in this.staticMembers)
			if(this.staticMembers[i] instanceof AS3Function)
				allStaticFuncs.push(this.staticMembers[i]);

		function checkArguments(fn) {
			if(fn.arguments.length <= 0)
				return fn.value;
			var start = fn.value.indexOf('{');
			var args = "";
			for(var i = 0; i < fn.arguments.length; i++) {
				//We will inject arguments into the top of the method definition
				if (fn.arguments[i].isRestParam) {
					args += "\n\t\t\tvar " + fn.arguments[i].name + " = Array.prototype.slice.call(arguments).splice(" + i + ");";
				} else if(fn.arguments[i].value) {
					args += "\n\t\t\t" + fn.arguments[i].name + " = AS3JS.getDefaultValue(" + fn.arguments[i].name + ", " + fn.arguments[i].value + ");";
				}
			}
			return fn.value.substr(0, start + 1) + args + fn.value.substr(start + 1);
		}
		function injectInstantiations(fn) {
			var start = fn.value.indexOf('{');
			var text = "";
			for(var i = 0; i < self.members.length; i++) {
				//We will inject instantiated vars into the top of the method definition
				if (self.members[i] instanceof AS3Variable && AS3Class.nativeTypes.indexOf(self.members[i].type) < 0)
					text += "\n\t\t\tthis." + self.members[i].name + " = " + self.members[i].value + ";";
			}
			return fn.value.substr(0, start + 1) + text + fn.value.substr(start + 1);
		}
		
		if(true)
		{
			function checkStack(stack, name) {
				if(!name)
					return null;
				for(var i = stack.length - 1; i >= 0; i--) {
					if(stack[i].name == name)
						return stack[i];
				}
				return null;
			}
			function parseFunc(cls, fnText, stack, statFlag) {
				statFlag = (typeof statFlag == 'undefined') ? false : statFlag;
				var c;
				var obj;
				var index = 0;
				var result = '';
				var tmpStr = '';
				var tmpArgs = '';
				var tmpMember = null;
				var tmpClass = null;
				var tmpField = null;
				var prevToken = null;
				var currToken = null;
				var tmpParse = null;
				var tmpStatic = false;
				var tmpPeek = null;
				var objBuffer = ''; //Tracks the current object that is being "pathed" (e.g. "object.field1" or "object.field1[index + 1]", etc)
				var lookAhead = function(str, index) {
					//Look ahead in the function for assignments
					var originalIndex = index;
					var startIndex = -1;
					var endIndex = -1;
					var semicolonIndex = -1;
					var token = "";
					var extracted = "";
					//Not a setter if there is a dot operator immediately after
					if(str.charAt(index) == '.')
						return { token: null, extracted: '', startIndex: startIndex, endIndex: endIndex}
					for(; index < str.length; index++) {
						if(str.charAt(index).match(/[+-/*=]/g)) {
							//Append to the assignment instruction
							token += str.charAt(index);
							startIndex = index;
						} else if(startIndex < 0 && str.charAt(index).match(/[\t\s]/g)) //Skip these characters
							continue;
						else {
							break; //Exits when token has already been started and no more regexes pass
						}
					}
					
					//Only allow these patterns
					if(!(token == "=" || token == "++" || token == "--" || token == "+=" || token == "-=" || token == "*=" || token == "/="))
						token = null;
						
					if(token) {
						//console.log("Found a setter with " + token);
						//Pick whatever is closer, new line or semicolon
						endIndex = str.indexOf('\n', startIndex);
						if(endIndex < 0)
							endIndex = str.length - 1;
						//Windows fix
						if(str.charAt(endIndex-1) == '\r')
							endIndex--;
						//We want to place closing parens before semicolon if it exists
						semicolonIndex = str.indexOf(";", startIndex);
						if(semicolonIndex < endIndex)
							endIndex = semicolonIndex;
						extracted = str.substring(startIndex + token.length, endIndex);
						//endIndex--; //Back up one since this will be considered outside of the inner assignment
					}
					
					return { token: token, extracted: extracted, startIndex: startIndex, endIndex: endIndex};
				}
				for(index = 0; index < fnText.length; index++) {
					objBuffer = '';
					prevToken = currToken;
					currToken = AS3Parser.nextWord(fnText, index, AS3Pattern.VARIABLE[0], AS3Pattern.VARIABLE[1]);
					result += currToken.extra; //<-Puts all other non-identifier characters into the buffer first
					tmpMember = checkStack(stack, currToken.token); //<-Check the stack for a member with this identifier already
					index = currToken.index;
					if(currToken.token) {
						if(currToken.token == 'function') {
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
								for(var i = 0; i < args.length; i++) {
									if (args[i] === '...rest') {
										break;
									}
									arr.push(args[i].name);
								}
								var str = arr.join(', ');
								return str;
							})(tmpArgs) + ')';
							tmpParse = AS3Parser.extractBlock(fnText, index, '{', '}'); //Extract function block
							index = tmpParse[1] - 1; //Update index
							tmpParse = parseFunc(cls, tmpParse[0], stack.concat(tmpArgs), statFlag); //Recurse into function
							result += ' ' + tmpParse[0];
						} else {
							if(currToken.token == 'this') {
								tmpStatic = false;
								tmpClass = cls;
								objBuffer += currToken.token;
								result += currToken.token;
							} else {
								tmpStatic = (cls.className == currToken.token || cls.retrieveField(currToken.token, true));
								//Find field in class, then make sure we didn't already have a local member defined with this name, and skip next block if static since the definition is the class itself
								//Note: tmpMember needs to be checked, if something is in there it means we have a variable with the same name in local scope
								if(cls.retrieveField(currToken.token, tmpStatic) && cls.className != currToken.token && !tmpMember) {
									tmpMember = cls.retrieveField(currToken.token, tmpStatic); //<-Reconciles the type of the current variable
									if(tmpMember && (tmpMember.subType == 'get' || tmpMember.subType == 'set')) {
										tmpPeek = lookAhead(fnText, index);
										if(tmpPeek.token) {
											//Handle differently if we are assigning a setter
											
											//Prepend the correct term
											if(tmpStatic) {
												objBuffer += (cls.retrieveField(currToken.token, tmpStatic)) ? cls.className + '.' : currToken.token + '.';
												result += (cls.retrieveField(currToken.token, tmpStatic)) ? cls.className + '.' : currToken.token + '.';
											} else {
												objBuffer += 'this.';
												result += 'this.';
											}
											objBuffer += 'get_' + currToken.token + '()';
											result += 'set_' + currToken.token + '(';
											index = tmpPeek.endIndex;
											if(tmpPeek.token == '++')
												result += objBuffer + ' + 1';
											else if(tmpPeek.token == '--')
												result += objBuffer + ' - 1';
											else {
												tmpParse = parseFunc(cls, tmpPeek.extracted, stack); //Recurse into the assignment to parse vars
												if(tmpPeek.token == '=')
													result +=  tmpParse[0].trim();
												else
													result += objBuffer + ' ' + tmpPeek.token.charAt(0) + ' (' + tmpParse[0] + ')';
											}
											result += ')';
											//console.log("portion: " + fnText.substr(index, 8));
										} else {
											//Getters are easy
											if(tmpStatic) {
												objBuffer += (cls.retrieveField(currToken.token, true)) ? cls.className + '.get_' + currToken.token + '()' : 'this.get_' + currToken.token + '()';
												result += (cls.retrieveField(currToken.token, true)) ? cls.className + '.get_' + currToken.token + '()' : 'this.get_' + currToken.token + '()';
											} else {
												objBuffer += 'this.get_' + currToken.token + '()';
												result += 'this.get_' + currToken.token + '()';
											}
										}
									} else {
										if(tmpStatic) {
											objBuffer += (cls.className == currToken.token) ? currToken.token : cls.className + '.' + currToken.token;
											result += (cls.className == currToken.token) ? currToken.token : cls.className + '.' + currToken.token;
										} else {
											objBuffer += (cls.retrieveField(currToken.token, false) && !(prevToken && prevToken.token === 'new' && cls.retrieveField(currToken.token, false).type !== "Class")) ? 'this.' + currToken.token : currToken.token;
											result += (cls.retrieveField(currToken.token, false) && !(prevToken && prevToken.token === 'new' && cls.retrieveField(currToken.token, false).type !== "Class")) ? 'this.' + currToken.token : currToken.token;
										}
									}
									//console.log("started: this." + tmpMember.name + ":" + tmpMember.type);
								} else {
									//Likely a local variable, argument, or static reference
									if(tmpStatic) {
										objBuffer += currToken.token;
										result += currToken.token;
									} else {
										objBuffer += (cls.retrieveField(currToken.token, false) && !tmpMember) ? 'this.' + currToken.token : currToken.token;
										result += (cls.retrieveField(currToken.token, false) && !tmpMember) ? 'this.' + currToken.token : currToken.token;
									}
									//Member should be set to previous value first, otherwise set to class if the token is the class name, or token's type as last option
									//tmpMember = (tmpMember) ? tmpMember : null;
									//console.log("started (local): " + currToken.token);
								}
								if(tmpStatic) {
									//Just use the class itself, we will reference fields from it. If parser injected the static prefix manually, we'll try to determome the type of var instead
									tmpClass = (cls.className == currToken.token) ? cls : (tmpMember) ? cls.importMap[tmpMember.type] || null : null; 
								} else {
									//Use the member's type to determine the class it's mapped to
									tmpClass = (tmpMember && tmpMember.type && tmpMember.type != '*') ? cls.importMap[tmpMember.type] : null; 
									//If no mapping was found, this may be a static reference
									if(!tmpClass && cls.importMap[currToken.token]) {
										tmpClass = cls.importMap[currToken.token];
										tmpStatic = true;
									}
								}
								//If tmpClass is null, it's possible we were trying to retrieve a Vector type. Let's fix this:
								if(!tmpClass && tmpMember && tmpMember.type && tmpMember.type.replace(/Vector\.<(.*?)>/g, "$1") != tmpMember.type) {
									//Extract Vector type if necessary by testing regex
									tmpClass = cls.importMap[tmpMember.type.replace(/Vector\.<(.*?)>/g, "$1")] || null;
								}
								//if(tmpClass && tmpMember && tmpMember.type && tmpMember.type != '*') {
									//Extract Vector type if necessary by testing regex
									//tmpClass = (tmpMember.type.replace(/Vector\.<(.*?)>/g, "$1") != tmpMember.type) ? tmpClass.importMap[tmpMember.type.replace(/Vector\.<(.*?)>/g, "$1")] || null : tmpClass.importMap[tmpMember.type] || null;
								//}
							}
							//Note: At this point, tmpMember is no longer used, it was only needed to remember the type of the first token. objBuffer will be building out the token
							
							//if(tmpClass)
								//console.log("class: " + tmpClass.className + '(' + tmpStatic + ')');
							//else
								//console.log('null class');
							//We have parsed the current token, and the index sits at the next level down in the object
							for(; index < fnText.length; index++) {
								//Loop until we stop parsing a variable declaration
								if(fnText.charAt(index) == '.') {
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
									if(tmpClass) {
										//This means we are coming from a typed variable
										tmpField = tmpClass.retrieveField(currToken.token, tmpStatic);
										if(tmpField) {
											//console.log("parsing: " + tmpField.name + ":" + tmpField.type)
											//We found a field that matched this value within the class
											if(tmpField instanceof AS3Function) {
												if(tmpField.subType == 'get' || tmpField.subType == 'set') {
													tmpPeek = lookAhead(fnText, index);
													if(tmpPeek.token) {
														//Handle differently if we are assigning a setter
														objBuffer += '.get_' + currToken.token + '()';
														result += 'set_' + currToken.token + '(';
														index = tmpPeek.endIndex;
														if(tmpPeek.token == '++')
															result += objBuffer + ' + 1';
														else if(tmpPeek.token == '--')
															result += objBuffer + ' - 1';
														else {
															tmpParse = parseFunc(cls, tmpPeek.extracted, stack); //Recurse into the assignment to parse vars
															if(tmpPeek.token == '=')
																result += tmpParse[0].trim();
															else
																result += objBuffer + ' ' + tmpPeek.token.charAt(0) + ' (' + tmpParse[0] + ')';
														}
														result += ')';
													} else {
														objBuffer += '.get_' + currToken.token + '()';
														result += 'get_' + currToken.token + "()";
													}
													//console.log("set get flag: " + currToken.token);
												} else {
													objBuffer += '.' + currToken.token;
													result += currToken.token;
												}
											} else {
												objBuffer += '.' + currToken.token;
												result += currToken.token;
											}
										} else {
											objBuffer += '.' + currToken.token;
											result += currToken.token;
											//console.log("appened typed: " + currToken.token);
										}
										//Update the type if this is not a static prop
										if(tmpClass && tmpField && tmpField.type && tmpField.type != '*') {
											//Extract Vector type if necessary by testing regex
											tmpClass = (tmpField.type.replace(/Vector\.<(.*?)>/g, "$1") != tmpField.type) ? tmpClass.importMap[tmpField.type.replace(/Vector\.<(.*?)>/g, "$1")] || null : tmpClass.importMap[tmpField.type] || null;
										} else {
											tmpClass = null;
										}
									} else {
										//console.log("appened untyped: " + currToken.token);
										objBuffer += '.' + currToken.token;
										result += currToken.token;
									}
								} else if(fnText.charAt(index) == '[') {
									//We now have to recursively parse the inside of this open bracket
									tmpParse = AS3Parser.extractBlock(fnText, index, '[', ']');
									index = tmpParse[1];
									tmpParse = parseFunc(cls, tmpParse[0], stack); //Recurse into the portion that was extracted
									//console.log("recursed into: " + tmpParse[0]);
									objBuffer += tmpParse[0]; //Append this text to the object buffer string so we can remember the variable we have accessed
									result += tmpParse[0];
								}
								tmpStatic = false; //Static can no longer be possible after the second field
								if(!fnText.charAt(index).match(/[.\[]/g)) {
									//if(objBuffer != '' && objBuffer.indexOf('.') >= 0 && objBuffer.lastIndexOf('.') != objBuffer.length - 1)
										//console.log('deep parsed: ' + objBuffer);
									objBuffer = ''; //Clear out the current object buffer
									index--;
									break;
								}
								index--;
							}
						}
					} else {
						index = currToken.index - 1;
					}
				}
				return [result, index];
			}
			for(i in allFuncs) {
				allFuncs[i].value = parseFunc(this, allFuncs[i].value, allFuncs[i].buildLocalVariableStack(), allFuncs[i].isStatic)[0];
				allFuncs[i].value = checkArguments(allFuncs[i]);
				if (allFuncs[i].name === this.className) {
					//Inject instantiations here
					allFuncs[i].value = injectInstantiations(allFuncs[i]);
				}
				allFuncs[i].value = self.cleanup(allFuncs[i].value);
				//Fix supers
				allFuncs[i].value = allFuncs[i].value.replace(/super\.(.*?)\(/g, this.parent + '.prototype.$1.call(this, ');
				allFuncs[i].value = allFuncs[i].value.replace(/super\(/g, this.parent + '.prototype._constructor_.call(this, ');
				allFuncs[i].value = allFuncs[i].value.replace(new RegExp("this[.]" + this.parent, "g"), this.parent); //Fix extra 'this' on the parent
				//Fixed messed up '.call(this, )'
				allFuncs[i].value = allFuncs[i].value.replace(/.call\(this,\s+\)/g, '.call(this)');
			}
			for(i in allStaticFuncs) {
				allStaticFuncs[i].value = parseFunc(this, allStaticFuncs[i].value, allStaticFuncs[i].buildLocalVariableStack(), allStaticFuncs[i].isStatic)[0];
				allStaticFuncs[i].value = checkArguments(allStaticFuncs[i]);
				allStaticFuncs[i].value = self.cleanup(allStaticFuncs[i].value);
			}
		} else
		{
			for(i in classes) {
				if(classes[i] && this.imports.indexOf(classes[i].package + "." + classes[i].className) >= 0) {
					//Pull out all the setters and getters
					for(j in classes[i].setters)
						allOtherSetters.push(classes[i].setters[j]);
					for(j in classes[i].staticSetters)
						allOtherSetters.push(classes[i].staticSetters[j]);
					for(j in classes[i].getters)
						allOtherGetters.push(classes[i].getters[j]);
					for(j in classes[i].staticGetters)
						allOtherGetters.push(classes[i].staticGetters[j]);
				}
			}

			function checkSetters(text, vname, id) {
				id = (function(v, d) { return (v) ? v : d; })(id, 'this');
				//Take care of setter incrementors, decremeters, =, +=, -=, *=, /=
				text = text.replace(new RegExp("([^0-9a-zA-Z_$.])" + vname + "\\+\\+([^0-9a-zA-Z_$])", "g"), "$1" + id + ".set" + vname + "(this.get" + vname + "() + 1)$2");
				text = text.replace(new RegExp("([^0-9a-zA-Z_$.])" + vname + "\\-\\-([^0-9a-zA-Z_$])", "g"), "$1" + id + ".set" + vname + "(this.get" + vname + "() - 1)$2");
				text = text.replace(new RegExp("([^0-9a-zA-Z_$.])" + vname + "([\\s\\t]*\\+=[\\s\\t]*)(.*?)(;|\n)+", "g"), "$1" + id + ".set" + vname + "(" + id + ".get" + vname + "() + $3);\n");
				text = text.replace(new RegExp("([^0-9a-zA-Z_$.])" + vname + "([\\s\\t]*\\-=[\\s\\t]*)(.*?)(;|\n)+", "g"), "$1" + id + ".set" + vname + "(" + id + ".get" + vname + "() - $3);\n");
				text = text.replace(new RegExp("([^0-9a-zA-Z_$.])" + vname + "([\\s\\t]*\\*=[\\s\\t]*)(.*?)(;|\n)+", "g"), "$1" + id + ".set" + vname + "(" + id + ".get" + vname + "() * $3);\n");
				text = text.replace(new RegExp("([^0-9a-zA-Z_$.])" + vname + "([\\s\\t]*\\/=[\\s\\t]*)(.*?)(;|\n)+", "g"), "$1" + id + ".set" + vname + "(" + id + ".get" + vname + "() / $3);\n");
				text = text.replace(new RegExp("([^0-9a-zA-Z_$.])" + vname + "([\\s\\t]*=[^=][\\s\\t]*)(.*?)(;|\n)+", "g"), "$1" + id + ".set" + vname + "($3);\n");
				return text;
			}
			function checkGetters(text, vname, id) {
				id = (function(v, d) { return (v) ? v : d; })(id, 'this');
				return text.replace(new RegExp("([^0-9a-zA-Z_$.])" + vname + "([^0-9a-zA-Z_$])", "g"), "$1" + id + ".get" + vname + "()$2");
			}
			function checkOtherSetters(text, vname, id) {
				id = (function(v, d) { return (v) ? v : d; })(id, 'this');
				//Take care of setter incrementors, decremeters, =, +=, -=, *=, /=
				text = text.replace(new RegExp("((?:[0-9a-zA-Z_$.])[.])+" + vname + "\\+\\+([^0-9a-zA-Z_$])", "g"), "$1set" + vname + "($1get" + vname + "() + 1)$2");
				text = text.replace(new RegExp("((?:[0-9a-zA-Z_$.])[.])+" + vname + "\\-\\-([^0-9a-zA-Z_$])", "g"), "$1set" + vname + "($1get" + vname + "() - 1)$2");
				text = text.replace(new RegExp("((?:[0-9a-zA-Z_$.])[.])+" + vname + "([\\s\\t]*\\+=[\\s\\t]*)(.*?)(;|\n)+", "g"), "$1set" + vname + "($1get" + vname + "() + $3);\n");
				text = text.replace(new RegExp("((?:[0-9a-zA-Z_$.])[.])+" + vname + "([\\s\\t]*\\-=[\\s\\t]*)(.*?)(;|\n)+", "g"), "$1set" + vname + "($1get" + vname + "() - $3);\n");
				text = text.replace(new RegExp("((?:[0-9a-zA-Z_$.])[.])+" + vname + "([\\s\\t]*\\*=[\\s\\t]*)(.*?)(;|\n)+", "g"), "$1set" + vname + "($1get" + vname + "() * $3);\n");
				text = text.replace(new RegExp("((?:[0-9a-zA-Z_$.])[.])+" + vname + "([\\s\\t]*\\/=[\\s\\t]*)(.*?)(;|\n)+", "g"), "$1set" + vname + "($1get" + vname + "() / $3);\n");
				text = text.replace(new RegExp("((?:[0-9a-zA-Z_$.])[.])+" + vname + "([\\s\\t]*=[^=][\\s\\t]*)(.*?)(;|\n)+", "g"), "$1set" + vname + "($3);\n");
				return text;
			}
			function checkOtherGetters(text, vname) {
				return text.replace(new RegExp("((?:[0-9a-zA-Z_$.])[.])+" + vname + "([^0-9a-zA-Z_$])", "g"), "$1get" + vname + "()$2");
			}
			function checkMembers(text, vname, id) {
				if(vname == self.className)
					return text;
				id = (function(v, d) { return (v) ? v : d; })(id, 'this');
				//Need to RegExp replace twice for some reason??? (TODO: possibly look into this)
				return text.replace(new RegExp("([^0-9a-zA-Z_$.])" + vname+ "([^0-9a-zA-Z_$])", "g"), "$1" + id + "." + vname + "$2").replace(new RegExp("([^0-9a-zA-Z_$.])" + vname+ "([^0-9a-zA-Z_$])", "g"), "$1" + id + "." + vname + "$2");

			}

			//Update all of our functions to use 'this' in front of all of our members as needed
			for(i in allFuncs) {
				//Run through all of our instance functions adding non-static refs
				for(j in allMembers) {
					//Just do an normal replacement
					if(allMembers[j].subType == 'set' && !allFuncs[i].hasArgument(allMembers[j].name)) //<-If an argument has a matching name, we can assume "this" was prefixed already
						allFuncs[i].value = checkSetters(allFuncs[i].value, allMembers[j].name);
					else if(allMembers[j].subType == 'get' && !allFuncs[i].hasArgument(allMembers[j].name))
						allFuncs[i].value = checkGetters(allFuncs[i].value, allMembers[j].name);
					else if(!allFuncs[i].hasArgument(allMembers[j].name))
						allFuncs[i].value = checkMembers(allFuncs[i].value, allMembers[j].name);
					//Fix supers
					allFuncs[i].value = allFuncs[i].value.replace(/super\.(.*?)\(/g, this.parent + '.prototype.$1.call(this, ');
					allFuncs[i].value = allFuncs[i].value.replace(/super\(/g, this.parent + '.prototype._constructor_.call(this, ');
					allFuncs[i].value = allFuncs[i].value.replace(new RegExp("this[.]" + this.parent, "g"), this.parent); //Fix extra 'this' on the parent
					//Fixed messed up '.call(this, )'
					allFuncs[i].value = allFuncs[i].value.replace(/.call\(this,\s+\)/g, '.call(this)');
				}
				//Run through all of our instance functions adding static refs
				for(j in allStaticMembers) {
					//Just do an normal replacement
					if(allStaticMembers[j].subType == 'set' && !allFuncs[i].hasArgument(allStaticMembers[j].name))
						allFuncs[i].value = checkSetters(allFuncs[i].value, allStaticMembers[j].name, this.className);
					else if(allStaticMembers[j].subType == 'get' && !allFuncs[i].hasArgument(allStaticMembers[j].name))
						allFuncs[i].value = checkGetters(allFuncs[i].value, allStaticMembers[j].name, this.className);
					else if(!allFuncs[i].hasArgument(allStaticMembers[j].name))
						allFuncs[i].value = checkMembers(allFuncs[i].value, allStaticMembers[j].name, this.className);
				}
				//Run through the getters and setters from other classes and see if we missed any
				for(j in allOtherSetters) {
					if(!allFuncs[i].hasArgument(allOtherSetters[j].name))
						allFuncs[i].value = checkOtherSetters(allFuncs[i].value, allOtherSetters[j].name, this.className);
				}
				for(j in allOtherGetters) {
					allFuncs[i].value = checkOtherGetters(allFuncs[i].value, allOtherGetters[j].name, this.className);
				}
				allFuncs[i].value = checkArguments(allFuncs[i]);
				allFuncs[i].value = self.cleanup(allFuncs[i].value);
			}
			for(i in allStaticFuncs) {
				//Run through all of our static functions adding static refs
				for(j in allStaticMembers) {
					//Just do an normal replacement
					if(allStaticMembers[j].subType == 'set' && !allStaticFuncs[i].hasArgument(allStaticMembers[j].name))
						allStaticFuncs[i].value = checkSetters(allStaticFuncs[i].value, allStaticMembers[j].name, this.className);
					else if(allStaticMembers[j].subType == 'get' && !allStaticFuncs[i].hasArgument(allStaticMembers[j].name))
						allStaticFuncs[i].value = checkGetters(allStaticFuncs[i].value, allStaticMembers[j].name, this.className);
					else if(!allStaticFuncs[i].hasArgument(allStaticMembers[j].name))
						allStaticFuncs[i].value = checkMembers(allStaticFuncs[i].value, allStaticMembers[j].name, this.className);
				}
				for(j in allOtherSetters) {
					//allStaticFuncs[i].value = checkOtherSetters(allStaticFuncs[i].value, allOtherSetters[j].name, this.className);
				}
				for(j in allOtherGetters) {
					//allStaticFuncs[i].value = checkOtherGetters(allStaticFuncs[i].value, allOtherGetters[j].name, this.className);
				}
				allStaticFuncs[i].value = checkArguments(allStaticFuncs[i]);
				allStaticFuncs[i].value = self.cleanup(allStaticFuncs[i].value);
			}
		}
	},
	toString: function() {
		//Outputs the class in JS format
		var i, j, first;
		var buffer = "ImportJS.pack('" + this.package + '.' + this.className + "', function(module, exports) {\n";
		var tmpArr = null;

		//Parent class must be imported if it exists
		if(this.parentDefinition)
			buffer += "\tvar " + this.parentDefinition.className + " = this.import('" + this.parentDefinition.package + "." + this.parentDefinition.className + "');\n";

		//Create refs for all the other classes
		if(this.imports.length > 0) {
			tmpArr = [];
			for(i in this.imports) {
				if(this.imports[i].indexOf('flash.') < 0 && this.parent != this.imports[i].substr(this.imports[i].lastIndexOf('.') + 1) && this.package + '.' + this.className != this.imports[i]) //Ignore flash imports
					tmpArr.push(this.imports[i].substr(this.imports[i].lastIndexOf('.') + 1)); //<-This will return characters after the final '.', or the entire tring
			}
			//Join up separated by commas
			if(tmpArr.length > 0) {
				buffer += '\tvar ';
				buffer += tmpArr.join(", ") + ";\n";
			}
		}
		buffer += "\tthis.inject(function () {\n";
		for(i in this.imports) {
			if(this.imports[i].indexOf('flash.') < 0 && this.package + '.' + this.className != this.imports[i]) //Ignore flash imports
				buffer += "\t\t" + this.imports[i].substr(this.imports[i].lastIndexOf('.') + 1) + " = this.import('" + this.imports[i] + "');\n";
		}
		//Set the non-native statics vars now
		for(i in this.staticMembers) {
			if (!(this.staticMembers[i] instanceof AS3Function)) {
				buffer += this.cleanup('\t\t' + this.className + '.' + this.staticMembers[i].name + ' = ' + this.staticMembers[i].value + ";\n");
			}
		}
		buffer += "\t});\n";

		buffer += '\n';
		
		buffer += "\tvar " + this.className + " = ";
		buffer += (this.parent) ? this.parent : "OOPS";
		buffer += ".extend({\n";

		if(this.staticMembers.length > 0) {
			//Place the static members first (skip the ones that aren't native types, we will import later
			buffer += "\t\t_statics_: {\n\t";
			for(i in this.staticMembers) {
				if (this.staticMembers[i] instanceof AS3Function) {
					buffer += AS3Parser.increaseIndent(this.stringifyFunc(this.staticMembers[i]), 1, 0);
				} else if (this.staticMembers[i].type === "Number" || this.staticMembers[i].type === "int" || this.staticMembers[i].type === "uint") {
					if (isNaN(parseInt(this.staticMembers[i].value))) {
						buffer += AS3Parser.increaseIndent('\t\t' + this.staticMembers[i].name + ': 0,\n', 1, 0);
					} else {
						buffer += AS3Parser.increaseIndent(this.stringifyFunc(this.staticMembers[i]), 1, 0);
					}
				} else if (this.staticMembers[i].type === "Boolean") {
					buffer += AS3Parser.increaseIndent('\t\t' + this.staticMembers[i].name + ': false,\n', 1, 0);
				} else {
					buffer += AS3Parser.increaseIndent('\t\t' + this.staticMembers[i].name + ': null,\n', 1, 0);
				}
			}
			for(i in this.staticGetters)
				buffer += AS3Parser.increaseIndent(this.stringifyFunc(this.staticGetters[i]), 1, 0);
			for(i in this.staticSetters)
				buffer += AS3Parser.increaseIndent(this.stringifyFunc(this.staticSetters[i]), 1, 0);
			buffer = buffer.substr(0, buffer.lastIndexOf(',')) + '\n\t';
			buffer += "\t},\n";
		}		
		for(i in this.getters)
			buffer += this.stringifyFunc(this.getters[i]);
		for(i in this.setters)
			buffer += this.stringifyFunc(this.setters[i]);
		for(i in this.members) {
			if (this.members[i] instanceof AS3Function || (AS3Class.nativeTypes.indexOf(this.members[i].type) >= 0 && this.members[i].value)) {
				buffer += this.stringifyFunc(this.members[i]); //Print functions immediately
			} else if (this.members[i].type === "Number" || this.members[i].type === "int" || this.members[i].type === "uint") {
				if (isNaN(parseInt(this.members[i].value))) {
					buffer += AS3Parser.increaseIndent('\t\t' + this.members[i].name + ': 0,\n', 1, 0);
				} else {
					buffer += this.stringifyFunc(this.members[i]);
				}
			} else if (this.members[i].type === "Boolean") {
				buffer += AS3Parser.increaseIndent('\t\t' + this.members[i].name + ': false,\n', 1, 0);
			} else {
				buffer += AS3Parser.increaseIndent('\t\t' + this.members[i].name + ': null,\n', 1, 0);
			}
		}

		buffer = buffer.substr(0, buffer.length - 2) + "\n"; //Strips the final comma out of the string

		buffer += "\t});\n"
		buffer += "\n";
		buffer += "\tmodule.exports = " + this.className + ";\n";
		buffer += "});";

		//Remaining fixes
		buffer = buffer.replace(/(this\.)+/g, "this.");

		return buffer;
	}
});
var AS3Pattern = OOPS.extend({
	_statics_: {
		IDENTIFIER: [
			/\w/g,
			/\w/g,
		],
		OBJECT: [
			/[\w\.]/g,
			/[\w(\w(\.\w)+)]/g
		],
		IMPORT: [
			/[0-9a-zA-Z_$.*]/g,
			/[a-zA-Z_$][0-9a-zA-Z_$]([.][a-zA-Z_$][0-9a-zA-Z_$])*\*?/g
		],
		CURLY_BRACE: [
			/[\{|\}]/g,
			/[\{|\}]/g
		],
		VARIABLE: [
			/[0-9a-zA-Z_$]/g,
			/[a-zA-Z_$][0-9a-zA-Z_$]*/g
		],
		VARIABLE_TYPE: [
			/[a-zA-Z_$<>.*][0-9a-zA-Z_$<>.]*/g,
			/[a-zA-Z_$<>.*][0-9a-zA-Z_$<>.]*/g
		],
		VARIABLE_DECLARATION: [
			/[0-9a-zA-Z_$:<>.*]/g,
			/[a-zA-Z_$][0-9a-zA-Z_$]*\s*:\s*([a-zA-Z_$<>\.\*][0-9a-zA-Z_$<>\.]*)/g
		],
		ASSIGN_START: [
			/[=\r\n]/g,
			/[=\r\n]/g
		],
		ASSIGN_UPTO: [
			/[^;\r\n]/g,
			/(.*?)/g
		],
		VECTOR: [
			/new[\s\t]+Vector\.<(.*?)>\((.*?)\)/g,
			/new[\s\t]+Vector\.<(.*?)>\((.*?)\)/
		],
		ARRAY: [
			/new[\s\t]+Array\((.*?)\)/g,
			/new[\s\t]+Array\((.*?)\)/
		],
		REST_ARG: [
			/\.\.\.[a-zA-Z_$][0-9a-zA-Z_$]*/g,
			/\.\.\.[a-zA-Z_$][0-9a-zA-Z_$]*/g
		]
	}
});
var AS3Token = OOPS.extend({
	token: null,
	index: null,
	extra: null,
	_constructor_: function(token, index, extra) {
		this.token = token;
		this.index = index;
		this.extra = extra;
	}
});
var AS3Encapsulation = OOPS.extend({
	_statics_: {
		PUBLIC: "public",
		PRIVATE: "private",
		PROTECTED: "protected"
	}
});
var AS3Member = OOPS.extend({
	name: null,
	type: null,
	subType: null,
	value: null,
	encapsulation: null,
	isStatic: false,
	_constructor_: function() {
		this.name = null;
		this.type = '*';
		this.subType = null,
		this.value = null;
		this.encapsulation = "public";
		this.isStatic = false;
	}, createVariable: function() {
		var obj = new AS3Variable();
		obj.name = this.name;
		obj.type = this.type;
		obj.subType = this.subType,
		obj.value = this.value;
		obj.encapsulation = this.encapsulation;
		obj.isStatic = this.isStatic;
		return obj;
	}, createFunction: function() {
		var obj = new AS3Function();
		obj.name = this.name;
		obj.type = this.type;
		obj.subType = this.subType,
		obj.value = this.value;
		obj.encapsulation = this.encapsulation;
		obj.isStatic = this.isStatic;
		return obj;
	}
});
var AS3Variable = AS3Member.extend({
	_constructor_: function() {
	}
});
var AS3Argument = AS3Variable.extend({
	isRestParam: false,
	_constructor_: function() {
	}
});
var AS3Function = AS3Member.extend({
	arguments: null,
	_constructor_: function() {
		this.arguments = [];
	},
	hasArgument: function(name) {
		for(var i = 0; i < this.arguments.length; i++)
			if(this.arguments[i].name == name)
				return true;
		return false;
	},
	buildLocalVariableStack: function() {
		var i;
		var text = this.value || '';
		var matches = text.match(/(var|,)(.*?)([a-zA-Z_$][0-9a-zA-Z_$]*):([a-zA-Z_$][0-9a-zA-Z_$]*)/g);
		var locals = [];
		if(this.arguments) {
			for(i in this.arguments) {
				locals.push(this.arguments[i]);
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
});
var AS3Parser = OOPS.extend({
	_statics_: {
		increaseIndent: function(str, amount, from) {
			return str;
		},
		parseArguments: function(str) {
			var args = [];
			var tmpToken;
			var tmpArr = AS3Parser.extractBlock(str, 0, '(', ')');
			var index = tmpArr[1] - 1; //Ending index of parsed block
			var tmpStr = tmpArr[0].trim(); //Parsed block
			tmpStr = tmpStr.substr(1, tmpStr.length - 2); //Remove outer parentheses
			tmpArr = null; //Trash this
			tmpArr = tmpStr.split(','); //Split args by commas
			//Don't bother if there are no arguments
			if(tmpArr.length > 0 && tmpArr[0] != '') {
				//Truncate spaces and assign values to arguments as needed
				for(var i = 0; i < tmpArr.length; i++) {
					tmpStr = tmpArr[i].trim();
					args.push(new AS3Argument());
					if (tmpStr.indexOf('...') === 0) {
						//This is a ...rest argument, stop here
						args[args.length-1].name = tmpStr.substr(3);
						args[args.length-1].isRestParam = true;
						AS3JS.debug('----->Parsed a ...rest param: ' + args[args.length-1].name);
						break;
					} else {
						//Grab the function name
						tmpToken = AS3Parser.nextWord(tmpStr, 0, AS3Pattern.VARIABLE[0], AS3Pattern.VARIABLE[1]); //Parse out the function name
						args[args.length-1].name = tmpToken.token; //Set the argument name
						AS3JS.debug('----->Sub-Function argument found: ' + tmpToken.token);
						//If a colon was next, we'll assume it was typed and grab it
						if(tmpToken.index < tmpStr.length && tmpStr.charAt(tmpToken.index) == ':') {
							tmpToken = AS3Parser.nextWord(tmpStr, tmpToken.index, AS3Pattern.VARIABLE_TYPE[0], AS3Pattern.VARIABLE_TYPE[1]); //Parse out the argument type
							args[args.length-1].type = tmpToken.token; //Set the argument type
							AS3JS.debug('----->Sub-Function argument typed to: ' + tmpToken.token);
						}
						tmpToken = AS3Parser.nextWord(tmpStr, tmpToken.index, AS3Pattern.ASSIGN_START[0], AS3Pattern.ASSIGN_START[1]);
						if(tmpToken.token == "=") {
							//Use all characters after self symbol to set value
							tmpToken = AS3Parser.nextWord(tmpStr, tmpToken.index, AS3Pattern.ASSIGN_UPTO[0], AS3Pattern.ASSIGN_UPTO[1]);
							if(!tmpToken)
								throw new Error("Error during variable assignment in arg" + args[args.length-1].name);
							//Store value
							args.arguments[args.length-1].value = tmpToken.token.trim();
							AS3JS.debug('----->Sub-Function argument defaulted to: ' + tmpToken.token.trim());
						}
					}
				}
			}
			return args;
		},
		checkForCommentOpen: function(str) {
			return (str == "//") ? AS3ParseState.COMMENT_INLINE : (str == "/*") ? AS3ParseState.COMMENT_MULTILINE : null;
		},
		checkForCommentClose: function(state, str) {
			return (state == AS3ParseState.COMMENT_INLINE && (str.charAt(0) == '\n' || str.charAt(0) == '\r' || str.charAt(0) == '')) ? true : (state == AS3ParseState.COMMENT_MULTILINE && str == "*/") ? true : false; 
		},
		checkForStringOpen: function(str) {
			return (str == '"') ? AS3ParseState.STRING_DOUBLE_QUOTE : (str == "'") ? AS3ParseState.STRING_SINGLE_QUOTE : null;
		},
		checkForStringClose: function(state, str) {
			return (state == AS3ParseState.STRING_DOUBLE_QUOTE && str == '"') ? true : (state == AS3ParseState.STRING_SINGLE_QUOTE && str == "'") ? true : false; 
		},
		nextWord: function(src, index, characters, pattern) {
			characters = characters || AS3Pattern.IDENTIFIER[0];
			pattern = pattern || AS3Pattern.IDENTIFIER[1];
			var tokenBuffer = null;
			var extraBuffer = ''; //Contains characters that were missed
			var escapeToggle = false;
			var innerState = null;
			for(; index < src.length; index++) {
				var c = src.charAt(index);
				if(c.match(characters)) {
					tokenBuffer = (tokenBuffer) ? tokenBuffer + c : c; //Create new token buffer if needed, otherwise append
				} else if(!innerState && AS3Parser.checkForCommentOpen(src.substr(index, 2)) && !tokenBuffer) {
					tokenBuffer = null;
					AS3JS.debug("Entering comment...");
					innerState = AS3Parser.checkForCommentOpen(src.substr(index, 2));
					extraBuffer += src.substr(index, 2);
					index += 2; //Skip next index
					//Loop until we break out of comment
					for(; index < src.length; index++) {
						if(AS3Parser.checkForCommentClose(innerState, src.substr(index, 2))) {
							if(innerState == AS3ParseState.COMMENT_MULTILINE) {
								extraBuffer += src.substr(index, 2);
								index++; //Skip next token
							} else {
								extraBuffer += src.charAt(index);
							}
							innerState = null; //Return to previous state
							AS3JS.debug("Exiting comment...");
							break;
						} else {
							extraBuffer += src.charAt(index);
						}
					}
				}  else if(!innerState && AS3Parser.checkForStringOpen(src.charAt(index)) && !tokenBuffer) {
					tokenBuffer = null;
					AS3JS.debug("Entering string...");
					innerState = AS3Parser.checkForStringOpen(src.charAt(index));
					extraBuffer += src.substr(index, 1);
					index++; //Skip to next index
					//Loop until we break out of string
					for(; index < src.length; index++) {
						extraBuffer += src.charAt(index);
						if(!escapeToggle && src.charAt(index) == '\\') {
							escapeToggle = true;
							continue;
						}
						escapeToggle = false;
						if(AS3Parser.checkForStringClose(innerState, src.charAt(index))) {
							innerState = null; //Return to previous state
							AS3JS.debug("Exiting string...");
							break;
						}
					}
				} else if(tokenBuffer && tokenBuffer.match(pattern)) {
					return new AS3Token(tokenBuffer, index, extraBuffer); //[Token, Index]
				} else {
					if(tokenBuffer)
						extraBuffer += tokenBuffer + c;
					else 
						extraBuffer += c;
					tokenBuffer = null;
				}
			}
			return new AS3Token(tokenBuffer || null, index, extraBuffer); //[Token, Index]
		},
		extractBlock: function(text, start, opening, closing) {
			opening = (function(v, d) { return (v) ? v : d; })(opening, '{');
			closing = (function(v, d) { return (v) ? v : d; })(closing, '}');
			var buffer = "";
			var i = start;
			var count = 0;
			var started = false;
			var insideString = null;
			var insideComment = null;
			var escapingChar = false;
			while(!(count == 0 && started) && i < text.length) {
				if(insideComment) {
					//Inside of a comment, wait until we get out
					if(insideComment == '//' && (text.charAt(i) == '\n' || text.charAt(i) == '\r')) {
						insideComment = null; //End inline comment
						AS3JS.debug("Exited comment");
					} else if(insideComment == '/*' && text.charAt(i) == '*' && i + 1 < text.length && text.charAt(i + 1) == '/') {
						insideComment = null; //End multiline comment
						AS3JS.debug("Exited comment");
					}
				} else if(insideString) {
					//Inside of a string, wait until we get out
					if(!escapingChar && text.charAt(i) == "\\") {
						escapingChar = true; //Start escape sequence
					} else if(!escapingChar && text.charAt(i) == insideString) {
						insideString = null; //Found closing quote
					} else {
						escapingChar = false; //Forget escape sequence
					}
				} else if(text.charAt(i) == opening) {
					started = true;
					count++; //Found opening
				} else if(text.charAt(i) == closing) {
					count--; //Found closing
				} else if((text.charAt(i) == '\"' || text.charAt(i) == '\'')) {
					insideString = text.charAt(i); //Now inside of a string
				} else if(text.charAt(i) == '/' && i + 1 < text.length && text.charAt(i + 1) == '/') {
					AS3JS.debug("Entering comment... " + "(//)");
					insideComment = '//';
				} else if(text.charAt(i) == '/' && i + 1 < text.length && text.charAt(i + 1) == '*') {
					AS3JS.debug("Entering comment..." + "(/*)");
					insideComment = '/*';
				}
				if(started)
					buffer += text.charAt(i);
				i++;
			}
			if(!started)
				throw new Error("Error, no starting '" + opening  + "' found for method");
			else if(count > 0)
				throw new Error("Error, no closing '" + closing  + "' found for method");
			else if(count < 0)
				throw new Error("Error, malformed enclosing '" + opening + closing);
			return [buffer, i];
		}
	},
	index: 0,
	stack: null,
	src: null,
	package: null,
	_constructor_: function(src, package) {
		this.index = 0;
		this.stack = [];
		this.src = src;
		this.package = package || null;
	},
	getState: function() {
		return (this.stack.length > 0) ? this.stack[this.stack.length - 1] : null;
	},
	parse: function() {
		var i, j, c;
		var self = this;
		var classDefinition = new AS3Class();
		var currToken = null;
		var tmpToken = null;
		var tmpStr = null;
		var tmpArr = null;
		var currMember = null;
		this.stack.splice(0, this.stack.length);
		this.stack.push(AS3ParseState.START);
		AS3JS.debug('Began parsing ' + this.package + '...');
		
		function parseHelper(src) {
			var index;
			for(index = 0; index < src.length; index++) {
				c = src.charAt(index);
				if(self.getState() == AS3ParseState.START) {
					//String together letters only until we reach a non-letter
					currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);

					index = currToken.index - 1; //Update to the new position
					if(currToken.token == 'package') {
						self.stack.push(AS3ParseState.PACKAGE_NAME);
					}
				} else if(self.getState() == AS3ParseState.PACKAGE_NAME) {
					currToken = AS3Parser.nextWord(src, index, AS3Pattern.OBJECT[0], AS3Pattern.OBJECT[1]); //Package name
					tmpToken = AS3Parser.nextWord(src, index, AS3Pattern.CURLY_BRACE[0], AS3Pattern.CURLY_BRACE[1]); //Upcoming curly brace
					index = currToken.index - 1;
					if(!currToken.token || !tmpToken.token)
						throw new Error("Error parsing package name.");
					else {
						if(tmpToken.index < currToken.index)
							classDefinition.package = ''; //Curly brace came before next token
						else
							classDefinition.package = currToken.token; //Just grab the package name
						AS3JS.debug('Found package: ' + classDefinition.package);
						classDefinition.importWildcards.push(classDefinition.package + '.*'); //Add wild card for its own folder
						self.stack.push(AS3ParseState.PACKAGE);
						AS3JS.debug('Attempting to parse package...');
					}
				} else if(self.getState() == AS3ParseState.PACKAGE) {
					currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
					index = currToken.index - 1;
					if(currToken.token == 'class' || currToken.token == 'interface') {
						if(currToken.token == 'interface')
							classDefinition.isInterface = true;
						self.stack.push(AS3ParseState.CLASS_NAME);
						AS3JS.debug('Found class keyword...');
					} else if(currToken.token == 'import') {
						self.stack.push(AS3ParseState.IMPORT_PACKAGE);
						AS3JS.debug('Found import keyword...');
					}
				} else if(self.getState() == AS3ParseState.CLASS_NAME) {
					currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
					tmpToken = AS3Parser.nextWord(src, index, AS3Pattern.CURLY_BRACE[0], AS3Pattern.CURLY_BRACE[1]);
					index = currToken.index;
					if(!currToken.token || !tmpToken.token)
						throw new Error("Error parsing class name.");
					else if(tmpToken.index < currToken.index)
						throw new Error("Error, no class name found before curly brace.");
					else {
						//Set the class name
						classDefinition.className = currToken.token;
						classDefinition.importMap[classDefinition.className] = classDefinition; //Register self into the import map (used for static detection)
						//Now we will check for parent class and any interfaces
						currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
						if(currToken.token == 'extends' && currToken.index < tmpToken.index) {
							index = currToken.index;
							currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
							index = currToken.index;
							//The token following 'extends' must be the parent class
							/* NOTE: Commenting this out, used to be hard-coding to prevent flash packages from importing  */
							if([/*'MovieClip', 'Sprite', 'DisplayObject', 'DisplayObjectContainer'*/].indexOf(currToken.token) < 0)
								classDefinition.parent = currToken.token;
							//Prep the next token
							currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
							AS3JS.debug("Found parent: " + classDefinition.parent);
						}
						if(currToken.token == 'implements' && currToken.index < tmpToken.index) {
							index = currToken.index;
							currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
							index = currToken.index;
							//The token following 'implements' must be an interface
							classDefinition.interfaces.push(currToken.token);
							AS3JS.debug("Found interface: " + currToken.token);
							currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
							//While we are at a token before the next curly brace
							while(currToken.index < tmpToken.index && currToken.index < src.length) {
								//Consider self token another interface being implemented
								index = currToken.index;
								AS3JS.debug("Found interface: " + currToken.token);
								classDefinition.interfaces.push(currToken.token);
								currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
								index = currToken.index;
							}
						}
						AS3JS.debug('Parsed class name: ' + classDefinition.className);
						//Now parsing inside of the class
						self.stack.push(AS3ParseState.CLASS);
						AS3JS.debug('Attempting to parse class...');
						
						//Extract out the next method block
						tmpStr = AS3Parser.extractBlock(src, index)[0];
						index += tmpStr.length - 1;
						
						//Recursively call parseHelper again under this new state (Once returned, package will be exited)
						parseHelper(tmpStr);
					}
				} else if(self.getState() == AS3ParseState.CLASS) {
					currMember = currMember || new AS3Member(); //Declare a new member to work with if it doesn't exist yet
					currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
					index = currToken.index - 1;
					if(currToken.token == AS3Encapsulation.PUBLIC || currToken.token == AS3Encapsulation.PRIVATE || currToken.token == AS3Encapsulation.PROTECTED) {
						currMember.encapsulation = currToken.token;
						AS3JS.debug('->Member encapsulation set to ' + currMember.encapsulation);
					} else if (currToken.token == 'static') {
						currMember.isStatic = true;
						AS3JS.debug('-->Static flag set');
					} else if(currToken.token == AS3MemberType.VAR || currToken.token == AS3MemberType.CONST) {
						AS3JS.debug('--->Member type "variable" set.');
						currMember = currMember.createVariable(); //Transform the member into a variable
						self.stack.push(AS3ParseState.MEMBER_VARIABLE);
					} else if(currToken.token == AS3MemberType.FUNCTION) {
						currToken = AS3Parser.nextWord(src, index + 1, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
						//Check for getter/setter
						if ((currToken.token == 'get' || currToken.token == 'set') && src[index + 1 + currToken.token.length + 1] != '(') {
							AS3JS.debug('--->Member sub-type "' + currToken.token + '" set.');
							currMember.subType = currToken.token;
							index = currToken.index - 1;
						}
						currMember = currMember.createFunction(); //Transform the member into a function
						self.stack.push(AS3ParseState.MEMBER_FUNCTION);
						AS3JS.debug('---->Member type "function" set.');
					}
				} else if(self.getState() == AS3ParseState.MEMBER_VARIABLE) {
					currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
					currMember.name = currToken.token; //Set the member name
					AS3JS.debug('---->Variable name declared: ' + currToken.token);
					index = currToken.index;
					if(src.charAt(index) == ":") {
						currToken = AS3Parser.nextWord(src, index, AS3Pattern.VARIABLE_TYPE[0], AS3Pattern.VARIABLE_TYPE[1]);
						index = currToken.index;
						currMember.type = currToken.token;//Set the value type name
						AS3JS.debug('---->Variable type for ' + currMember.name + ' declared as: ' + currToken.token);
					}
					currToken = AS3Parser.nextWord(src, index, AS3Pattern.ASSIGN_START[0], AS3Pattern.ASSIGN_START[1]);
					if(currToken.token == "=") {
						//Use all characters after self symbol to set value
						index = currToken.index;
						currToken = AS3Parser.nextWord(src, index, AS3Pattern.ASSIGN_UPTO[0], AS3Pattern.ASSIGN_UPTO[1]);
						if(!currToken.token)
							throw new Error("Error during variable assignment in " + currMember.name);
						//Store value
						currMember.value = currToken.token.trim();
						index = currToken.index - 1;
					}

					//Store and delete current member and exit
					if(currMember.isStatic)
						classDefinition.staticMembers.push(currMember);
					else
						classDefinition.members.push(currMember);
					classDefinition.registerField(currMember.name, currMember);
					currMember = null;
					self.stack.pop();
				} else if(self.getState() == AS3ParseState.MEMBER_FUNCTION) {
					//Parse the arguments
					currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
					index = currToken.index;
					currMember.name = currToken.token; //Set the member name
					AS3JS.debug('****>Function name declared: ' + currToken.token);

					tmpArr = AS3Parser.extractBlock(src, index, '(', ')');
					index = tmpArr[1] - 1; //Ending index of parsed block
					tmpStr = tmpArr[0].trim(); //Parsed block
					tmpStr = tmpStr.substr(1, tmpStr.length - 2); //Remove outer parentheses
					tmpArr = null; //Trash this
					tmpArr = tmpStr.split(','); //Split args by commas
					//Don't bother if there are no arguments
					if(tmpArr.length > 0 && tmpArr[0] != '') {
						//Truncate spaces and assign values to arguments as needed
						for(i = 0; i < tmpArr.length; i++) {
							tmpStr = tmpArr[i];
							//Grab the function name
							tmpToken = AS3Parser.nextWord(tmpStr, 0, AS3Pattern.VARIABLE[0], AS3Pattern.VARIABLE[1]); //Parse out the function name
							currMember.arguments.push(new AS3Argument());
							if (tmpStr.indexOf('...') === 0) {
								//This is a ...rest argument, stop here
								currMember.arguments[currMember.arguments.length-1].name = tmpStr.substr(3);
								currMember.arguments[currMember.arguments.length-1].isRestParam = true;
								AS3JS.debug('----->Parsed a ...rest param: ' + currMember.arguments[currMember.arguments.length-1].name);
								break;
							} else {
								currMember.arguments[currMember.arguments.length-1].name = tmpToken.token; //Set the argument name
								AS3JS.debug('----->Function argument found: ' + tmpToken.token);
								//If a colon was next, we'll assume it was typed and grab it
								if(tmpToken.index < tmpStr.length && tmpStr.charAt(tmpToken.index) == ':') {
									tmpToken = AS3Parser.nextWord(tmpStr, tmpToken.index, AS3Pattern.VARIABLE_TYPE[0], AS3Pattern.VARIABLE_TYPE[1]); //Parse out the argument type
									currMember.arguments[currMember.arguments.length-1].type = tmpToken.token; //Set the argument type
									AS3JS.debug('----->Function argument typed to: ' + tmpToken.token);
								}
								tmpToken = AS3Parser.nextWord(tmpStr, tmpToken.index, AS3Pattern.ASSIGN_START[0], AS3Pattern.ASSIGN_START[1]);
								if(tmpToken.token == "=") {
									//Use all characters after self symbol to set value
									tmpToken = AS3Parser.nextWord(tmpStr, tmpToken.index, AS3Pattern.ASSIGN_UPTO[0], AS3Pattern.ASSIGN_UPTO[1]);
									if(!tmpToken)
										throw new Error("Error during variable assignment in arg" + currMember.arguments[currMember.arguments.length-1].name);
									//Store value
									currMember.arguments[currMember.arguments.length-1].value = tmpToken.token.trim();
									AS3JS.debug('----->Function argument defaulted to: ' + tmpToken.token.trim());
								}
							}
						}
					}
					AS3JS.debug('------>Completed paring args: ', currMember.arguments);
					//Type the function if needed
					if(src.charAt(index + 1) == ":") {
						tmpToken = AS3Parser.nextWord(src, index + 1, AS3Pattern.VARIABLE_TYPE[0], AS3Pattern.VARIABLE_TYPE[1]); //Parse out the function type if needed
						index = tmpToken.index;
						currMember.type = tmpToken.token;
						AS3JS.debug('------>Typed the function to: ', currMember.type);
					}

					
					if(classDefinition.isInterface) {
						//Store and delete current member and exit
						currMember.value = '{}';
						if(currMember.subType == 'get')
							(currMember.isStatic) ? classDefinition.staticGetters.push(currMember) : classDefinition.getters.push(currMember);
						else if(currMember.subType == 'set')
							(currMember.isStatic) ? classDefinition.staticSetters.push(currMember) : classDefinition.setters.push(currMember);
						else if(currMember.isStatic)
							classDefinition.staticMembers.push(currMember);
						else
							classDefinition.members.push(currMember);
						classDefinition.registerField(currMember.name, currMember);
						//Done parsing function
						currMember = null;
						self.stack.pop();
					} else {
						//Save the function body
						tmpArr = AS3Parser.extractBlock(src, index);
						index = tmpArr[1];
						currMember.value = tmpArr[0].trim();

						//Store and delete current member and exit
						if(currMember.subType == 'get')
							(currMember.isStatic) ? classDefinition.staticGetters.push(currMember) : classDefinition.getters.push(currMember);
						else if(currMember.subType == 'set')
							(currMember.isStatic) ? classDefinition.staticSetters.push(currMember) : classDefinition.setters.push(currMember);
						else if(currMember.isStatic)
							classDefinition.staticMembers.push(currMember);
						else
							classDefinition.members.push(currMember);
						classDefinition.registerField(currMember.name, currMember);

						currMember = null;
						self.stack.pop();
					}
				} else if(self.getState() == AS3ParseState.LOCAL_VARIABLE) {

				} else if(self.getState() == AS3ParseState.LOCAL_FUNCTION) {

				} else if(self.getState() == AS3ParseState.IMPORT_PACKAGE) {
					//The current token is a class import
					currToken = AS3Parser.nextWord(src, index, AS3Pattern.IMPORT[0], AS3Pattern.IMPORT[1]);
					index = currToken.index - 1;
					if(!currToken.token)
						throw new Error("Error parsing import.");
					else {
						AS3JS.debug("Parsed import name: " + currToken.token);
						if(currToken.token.indexOf("*") >= 0) {
							classDefinition.importWildcards.push(currToken.token); //To be resolved later
						}
						else {
							classDefinition.imports.push(currToken.token); //No need to resolve
						}
						self.stack.push(AS3ParseState.PACKAGE);
					}
				}
			}
		}
		parseHelper(this.src);
		if(!classDefinition.className)
			throw new Error("Error, no class provided for package: " + this.package);
		return classDefinition;
	}
});

var AS3JS = OOPS.extend({
	_statics_: {
		DEBUG_MODE: false,
		SILENT: false,
		debug: function() {
			if (AS3JS.SILENT)
				return;
			if(AS3JS.DEBUG_MODE)
				console.log.apply(console, arguments);
		},
		log: function() {
			if (AS3JS.SILENT)
				return;
			console.log.apply(console, arguments);
		},
		warn: function() {
			if (AS3JS.SILENT)
				return;
			console.warn.apply(console, arguments);
		}
	},
	_constructor_: function() {
	},
	compile: function(options) {
		var i, j, k, m, tmp;
		options = options || {};
		var srcPaths = options.srcPaths || {};
		var pkgLists = {};
		for(i in srcPaths) {
			pkgLists[srcPaths[i]] = this.buildPackageList(srcPaths[i]);
		}

		AS3JS.DEBUG_MODE = options.verbose || AS3JS.DEBUG_MODE;
		AS3JS.SILENT = options.silent || AS3JS.SILENT;

		var classes = {};
		var buffer = "";
		buffer += fs.readFileSync(path.join(__dirname, 'client/utils.js')).toString() + "\n";
		//First, parse through the classes and get the basic information
		for(i in pkgLists) {
			for(j in pkgLists[i]) {
				classes[pkgLists[i][j].package] = pkgLists[i][j].parse();
				AS3JS.debug(classes[pkgLists[i][j].package]);
				AS3JS.log('Parsed class: ' + classes[pkgLists[i][j].package].className);
			}
		}

		//Resolve all possible package name wildcards
		for(i in classes) {
			//For every class
			for(j in classes[i].importWildcards) {
				AS3JS.log('Resolving ' + classes[i].className + '\'s ' + classes[i].importWildcards[j] + ' ...')
				//For every wild card in the class
				for(k in srcPaths) {
					//For each possible source path (should hopefully just be 1 most of the time -_-)
					tmp = srcPaths[k] + path.sep + classes[i].importWildcards[j].replace(/\./g, path.sep).replace(path.sep+'*', '');
					tmp = tmp.replace(/\\/g, '/'); 
					tmp = tmp.replace(/[/]/g, path.sep); 
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
			//And then check its parent class (may be in the same package)
			/*if(classes[i].parent) {
				var foundParent = false;
				for(k in srcPaths) {
					var pkgPath = classes[i].package.replace(/\./g, path.sep);
					AS3JS.debug("Looking for " + classes[i].className + "'s parent class '" + classes[i].parent + "'...");
					if(fs.existsSync(srcPaths[k] + path.sep + pkgPath + path.sep + classes[i].parent + ".as")) {
						//classes[i].imports.push(classes[i].package + "." + classes[i].parent);
						AS3JS.debug("Imported " + classes[i].className + "'s parent class: " + classes[i].parent);
						foundParent = true;
						break;
					}
				}
				if(!foundParent)
					AS3JS.debug("Parent not found!");
			}*/
		}
		
		//Add extra imports before registring them (these will not be imported in the output code, but rather will provide insight for AS3JS to determine variable types)
		for(i in classes) {
			for (j in classes) {
				classes[i].addExtraImport(classes[j].package + '.' + classes[j].className);
			}
		}
		
		//Resolve import map
		for(i in classes) {
			classes[i].registerImports(classes);
		}

		//Resolve parent imports
		for(i in classes)
			classes[i].findParents(classes);
			
		//Process the function text to comply with JS
		for(i in classes)
			classes[i].process(classes);

		//Retrieve output
		for(i in classes) {
			buffer += classes[i].toString() + '\n';
		}

		//Remove old output file if it exists
		if(options.output) {
			if(fs.existsSync(options.output))
				fs.unlinkSync(options.output);
			fs.writeFileSync(options.output || 'output.js', buffer, "UTF-8", {flags: 'w+'});
		}


		AS3JS.log("Done.");
		return true;
	},
	buildPackageList: function(location) {
		var obj = {};
		var topLevel = location;
		location = location.replace(/\\/g, '/'); 
		location = location.replace(/[/]/g, path.sep); 
		if(fs.existsSync(location) && fs.statSync(location).isDirectory()) {
			function readDirectory(location, pkgBuffer, obj) {
				var files = fs.readdirSync(location);
				for(var i in files) {
					var pkg = pkgBuffer;
					if(fs.statSync(location + path.sep + files[i]).isDirectory()) {
						var splitPath = location.split(path.sep);
						if(pkg != '')
							pkg += '.';
						readDirectory(location + path.sep + files[i], pkg + files[i], obj)
					} else if(fs.statSync(location + path.sep + files[i]).isFile() && files[i].lastIndexOf('.as') == files[i].length - 3) {
						if(pkg != '')
							pkg += '.';
						pkg += files[i].substr(0, files[i].length - 3);
						obj[pkg] = new AS3Parser(fs.readFileSync(location + path.sep + files[i]).toString(), pkg);
						AS3JS.debug("Loaded file: ", location + path.sep + files[i] + " (package: " + pkg + ")");
					}
				}
			}
			var splitPath = location.split(path.sep);
			readDirectory(location, '', obj);
			return obj;
		} else {
			throw new Error("Error could not find directory: " + location);
		}
	}
});

module.exports = AS3JS;
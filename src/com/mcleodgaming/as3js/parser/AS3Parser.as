package com.mcleodgaming.as3js.parser
{
	import com.mcleodgaming.as3js.Main;
	import com.mcleodgaming.as3js.enums.*;
	import com.mcleodgaming.as3js.types.*;
	require "path"
	require "fs"
	
	public class AS3Parser 
	{
		/**
		 * Keeps track of previous function name to assist extractBlock() debugging
		 * TODO: This could definitely be implemented better
		 */
		public static var PREVIOUS_BLOCK:String;
		
		//public var index:int;
		public var stack:Array;
		public var src:String;
		public var classPath:String;
		public var parserOptions:Object;
			
		public function AS3Parser(src:String, classPath:String = null):void 
		{
			//index = 0;
			stack = [];
			this.src = src;
			this.classPath = classPath;
			parserOptions = { };
			parserOptions.safeRequire = false;
			parserOptions.ignoreFlash = false;
		}
		
		public static function increaseIndent(str:String, indent:String):String
		{
			return (indent + str).replace(/\n/g, "\n" + indent);
		}
		public static function parseArguments(str:String):Array
		{
			var args:Vector.<AS3Argument> = new Vector.<AS3Argument>();
			var tmpToken:AS3Token;
			var tmpArr:Array = AS3Parser.extractBlock(str, 0, '(', ')');
			var tmpExtractArr:Array = null;
			var index:int = tmpArr[1] - 1; //Ending index of parsed block
			var tmpStr:String = tmpArr[0].trim(); //Parsed block
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
						Main.debug('----->Parsed a ...rest param: ' + args[args.length-1].name);
						break;
					} else
					{
						//Grab the function name
						tmpToken = AS3Parser.nextWord(tmpStr, 0, AS3Pattern.VARIABLE[0], AS3Pattern.VARIABLE[1]); //Parse out the function name
						args[args.length-1].name = tmpToken.token; //Set the argument name
						Main.debug('----->Sub-Function argument found: ' + tmpToken.token);
						//If a colon was next, we'll assume it was typed and grab it
						if (tmpToken.index < tmpStr.length && tmpStr.charAt(tmpToken.index) == ':')
						{
							tmpToken = AS3Parser.nextWord(tmpStr, tmpToken.index, AS3Pattern.VARIABLE_TYPE[0], AS3Pattern.VARIABLE_TYPE[1]); //Parse out the argument type
							args[args.length-1].type = tmpToken.token; //Set the argument type
							Main.debug('----->Sub-Function argument typed to: ' + tmpToken.token);
						}
						tmpToken = AS3Parser.nextWord(tmpStr, tmpToken.index, AS3Pattern.ASSIGN_START[0], AS3Pattern.ASSIGN_START[1]);
						if (tmpToken.token == "=")
						{
							//Use all characters after self symbol to set value
							tmpExtractArr = AS3Parser.extractUpTo(tmpStr, tmpToken.index, /[;\r\n]/g);
							//Store value
							args[args.length-1].value =  tmpExtractArr[0].trim();
							//Store value
							Main.debug('----->Sub-Function argument defaulted to: ' + tmpExtractArr[0].trim());
						}
					}
				}
			}
			return args;
		}
		public static function checkForCommentOpen(str:String):String
		{
			return (str == "//") ? AS3ParseState.COMMENT_INLINE : (str == "/*") ? AS3ParseState.COMMENT_MULTILINE : null;
		}
		public static function checkForCommentClose(state, str):Boolean
		{
			return (state == AS3ParseState.COMMENT_INLINE && (str.charAt(0) == '\n' || str.charAt(0) == '\r' || str.charAt(0) == '')) ? true : (state == AS3ParseState.COMMENT_MULTILINE && str == "*/") ? true : false; 
		}
		public static function checkForStringOpen(str:String):String
		{
			return (str == '"') ? AS3ParseState.STRING_DOUBLE_QUOTE : (str == "'") ? AS3ParseState.STRING_SINGLE_QUOTE : null;
		}
		public static function checkForStringClose(state, str):Boolean
		{
			return (state == AS3ParseState.STRING_DOUBLE_QUOTE && str == '"') ? true : (state == AS3ParseState.STRING_SINGLE_QUOTE && str == "'") ? true : false; 
		}
		public static function nextWord(src:String, index:int, characters:String, pattern:String):AS3Token
		{
			characters = characters || AS3Pattern.IDENTIFIER[0];
			pattern = pattern || AS3Pattern.IDENTIFIER[1];
			var tokenBuffer:String = null;
			var extraBuffer:String = ''; //Contains characters that were missed
			var escapeToggle:Boolean = false;
			var innerState:String = null;
			for (; index < src.length; index++)
			{
				var c = src.charAt(index);
				if (c.match(characters))
				{
					tokenBuffer = (tokenBuffer) ? tokenBuffer + c : c; //Create new token buffer if needed, otherwise append
				} else if (!innerState && AS3Parser.checkForCommentOpen(src.substr(index, 2)) && !tokenBuffer)
				{
					tokenBuffer = null;
					Main.debug("Entering comment...");
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
							Main.debug("Exiting comment...");
							break;
						} else
						{
							extraBuffer += src.charAt(index);
						}
					}
				}  else if (!innerState && AS3Parser.checkForStringOpen(src.charAt(index)) && !tokenBuffer)
				{
					tokenBuffer = null;
					Main.debug("Entering string...");
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
							Main.debug("Exiting string...");
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
		}
		public static function extractBlock(text:String, start:int = 0, opening:String = "{", closing:String = "}"):Array
		{
			var buffer:String = "";
			var i:int = start;
			var count:int = 0;
			var started:Boolean = false;
			var insideString:String = null;
			var insideComment:String = null;
			var escapingChar:Boolean = false;
			while (!(count == 0 && started) && i < text.length)
			{
				if (insideComment)
				{
					//Inside of a comment, wait until we get out
					if (insideComment == '//' && (text.charAt(i) == '\n' || text.charAt(i) == '\r'))
					{
						insideComment = null; //End inline comment
						Main.debug("Exited comment");
					} else if (insideComment == '/*' && text.charAt(i) == '*' && i + 1 < text.length && text.charAt(i + 1) == '/')
					{
						insideComment = null; //End multiline comment
						Main.debug("Exited comment");
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
					Main.debug("Entering comment... " + "(//)");
					insideComment = '//';
				} else if (text.charAt(i) == '/' && i + 1 < text.length && text.charAt(i + 1) == '*')
				{
					Main.debug("Entering comment..." + "(/*)");
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
		}
		public static function extractUpTo(text:String, start:int, target:String):Array
		{
			var buffer:String = "";
			var i:int = start;
			var insideString:String = null;
			var insideComment:String = null;
			var escapingChar:Boolean = false;
			var pattern:String = new RegExp(target);
			while (i < text.length)
			{
				if (insideComment)
				{
					//Inside of a comment, wait until we get out
					if (insideComment == '//' && (text.charAt(i) == '\n' || text.charAt(i) == '\r'))
					{
						insideComment = null; //End inline comment
						Main.debug("Exited comment");
					} else if (insideComment == '/*' && text.charAt(i) == '*' && i + 1 < text.length && text.charAt(i + 1) == '/')
					{
						insideComment = null; //End multiline comment
						Main.debug("Exited comment");
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
					Main.debug("Entering comment... " + "(//)");
					insideComment = '//';
				} else if (text.charAt(i) == '/' && i + 1 < text.length && text.charAt(i + 1) == '*')
				{
					Main.debug("Entering comment..." + "(/*)");
					insideComment = '/*';
				} else if (text.charAt(i).match(pattern))
				{
					break; //Done
				}
				buffer += text.charAt(i);
				i++;
			}
			return [buffer, i];
		}
		
		public static function fixClassPath(clsPath:String):String
		{
			// Class paths at the root level might accidentally be prepended with a "."
			return clsPath.replace(/^\./g, "");
		}
		public function getState():String
		{
			return (this.stack.length > 0) ? this.stack[this.stack.length - 1] : null;
		}
		private function parseHelper(cls:AS3Class, src:String):void
		{
			var i:*;
			var j:*;
			var c:String;
			var currToken:AS3Token = null;
			var tmpToken:AS3Token = null;
			var tmpStr:String = null;
			var tmpArr:Array = null;
			var currMember:AS3Member = null;
			var index:int;
			for (index = 0; index < src.length; index++)
			{
				c = src.charAt(index);
				if (getState() == AS3ParseState.START)
				{
					//String together letters only until we reach a non-letter
					currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
					index = currToken.index - 1; //Update to the new position
					if (currToken.token == 'package')
					{
						stack.push(AS3ParseState.PACKAGE_NAME);
					}
				} else if (getState() == AS3ParseState.PACKAGE_NAME)
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
							index = tmpToken.index;
						} else
						{
							cls.packageName = currToken.token; //Just grab the package name
						}
						Main.debug('Found package: ' + cls.packageName);
						cls.importWildcards.push(AS3Parser.fixClassPath(cls.packageName + '.*')); //Add wild card for its own folder
						stack.push(AS3ParseState.PACKAGE);
						Main.debug('Attempting to parse package...');
					}
				} else if (getState() == AS3ParseState.PACKAGE)
				{
					currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
					index = currToken.index - 1;
					if (currToken.token == 'class' || currToken.token == 'interface')
					{
						if(currToken.token == 'interface')
							cls.isInterface = true;
						stack.push(AS3ParseState.CLASS_NAME);
						Main.debug('Found class keyword...');
					} else if (currToken.token == 'import')
					{
						stack.push(AS3ParseState.IMPORT_PACKAGE);
						Main.debug('Found import keyword...');
					} else if (currToken.token == 'require')
					{
						stack.push(AS3ParseState.REQUIRE_MODULE);
						Main.debug('Found require keyword...');
					}
				} else if (getState() == AS3ParseState.CLASS_NAME)
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
						
						// Update fully qualified class path if needed
						classPath = classPath || AS3Parser.fixClassPath(cls.packageName + '.' + cls.className); //Remove extra "." for top level packages
						
						cls.classMap[cls.className] = cls; //Register self into the import map (used for static detection)
						//Now we will check for parent class and any interfaces
						currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
						if (currToken.token == 'extends' && currToken.index < tmpToken.index)
						{
							index = currToken.index;
							currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
							index = currToken.index;
							//The token following 'extends' must be the parent class
							cls.parent = currToken.token;
							//Prep the next token
							currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
							Main.debug("Found parent: " + cls.parent);
						}
						if (currToken.token == 'implements' && currToken.index < tmpToken.index)
						{
							index = currToken.index;
							currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
							index = currToken.index;
							//The token following 'implements' must be an interface
							cls.interfaces.push(currToken.token);
							Main.debug("Found interface: " + currToken.token);
							currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
							//While we are at a token before the next curly brace
							while (currToken.index < tmpToken.index && currToken.index < src.length)
							{
								//Consider self token another interface being implemented
								index = currToken.index;
								Main.debug("Found interface: " + currToken.token);
								cls.interfaces.push(currToken.token);
								currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
								index = currToken.index;
							}
						}
						Main.debug('Parsed class name: ' + cls.className);
						//Now parsing inside of the class
						stack.push(AS3ParseState.CLASS);
						Main.debug('Attempting to parse class...');
						
						//Extract out the next method block
						AS3Parser.PREVIOUS_BLOCK = cls.className + ":Class";
						tmpStr = AS3Parser.extractBlock(src, index)[0];
						index += tmpStr.length - 1;
						
						//Recursively call parseHelper again under this new state (Once returned, package will be exited)
						parseHelper(cls, tmpStr);
					}
				} else if (getState() == AS3ParseState.CLASS)
				{
					currMember = currMember || new AS3Member(); //Declare a new member to work with if it doesn't exist yet
					currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
					index = currToken.index - 1;
					if (currToken.token == AS3Encapsulation.PUBLIC || currToken.token == AS3Encapsulation.PRIVATE || currToken.token == AS3Encapsulation.PROTECTED)
					{
						currMember.encapsulation = currToken.token;
						Main.debug('->Member encapsulation set to ' + currMember.encapsulation);
					} else if (currToken.token == 'static')
					{
						currMember.isStatic = true;
						Main.debug('-->Static flag set');
					} else if (currToken.token == AS3MemberType.VAR || currToken.token == AS3MemberType.CONST)
					{
						Main.debug('--->Member type "variable" set.');
						currMember = currMember.createVariable(); //Transform the member into a variable
						stack.push(AS3ParseState.MEMBER_VARIABLE);
					} else if (currToken.token == AS3MemberType.FUNCTION)
					{
						currToken = AS3Parser.nextWord(src, index + 1, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
						//Check for getter/setter
						if ((currToken.token == 'get' || currToken.token == 'set') && src[index + 1 + currToken.token.length + 1] != '(')
						{
							Main.debug('--->Member sub-type "' + currToken.token + '" set.');
							currMember.subType = currToken.token;
							index = currToken.index - 1;
						}
						currMember = currMember.createFunction(); //Transform the member into a function
						stack.push(AS3ParseState.MEMBER_FUNCTION);
						Main.debug('---->Member type "function" set.');
					}
				} else if (getState() == AS3ParseState.MEMBER_VARIABLE)
				{
					currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
					currMember.name = currToken.token; //Set the member name
					Main.debug('---->Variable name declared: ' + currToken.token);
					index = currToken.index;
					if (src.charAt(index) == ":")
					{
						currToken = AS3Parser.nextWord(src, index, AS3Pattern.VARIABLE_TYPE[0], AS3Pattern.VARIABLE_TYPE[1]);
						index = currToken.index;
						currMember.type = currToken.token;//Set the value type name
						Main.debug('---->Variable type for ' + currMember.name + ' declared as: ' + currToken.token);
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
					stack.pop();
				} else if (getState() == AS3ParseState.MEMBER_FUNCTION)
				{
					//Parse the arguments
					currToken = AS3Parser.nextWord(src, index, AS3Pattern.IDENTIFIER[0], AS3Pattern.IDENTIFIER[1]);
					index = currToken.index;
					currMember.name = currToken.token; //Set the member name
					Main.debug('****>Function name declared: ' + currToken.token);
					
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
								Main.debug('----->Parsed a ...rest param: ' + currMember.argList[currMember.argList.length-1].name);
								break;
							} else
							{
								currMember.argList[currMember.argList.length-1].name = tmpToken.token; //Set the argument name
								Main.debug('----->Function argument found: ' + tmpToken.token);
								//If a colon was next, we'll assume it was typed and grab it
								if (tmpToken.index < tmpStr.length && tmpStr.charAt(tmpToken.index) == ':')
								{
									tmpToken = AS3Parser.nextWord(tmpStr, tmpToken.index, AS3Pattern.VARIABLE_TYPE[0], AS3Pattern.VARIABLE_TYPE[1]); //Parse out the argument type
									currMember.argList[currMember.argList.length-1].type = tmpToken.token; //Set the argument type
									Main.debug('----->Function argument typed to: ' + tmpToken.token);
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
									Main.debug('----->Function argument defaulted to: ' + tmpToken.token.trim());
								}
							}
						}
					}
					Main.debug('------>Completed paring args: ', currMember.argList);
					//Type the function if needed
					if (src.charAt(index + 1) == ":")
					{
						tmpToken = AS3Parser.nextWord(src, index + 1, AS3Pattern.VARIABLE_TYPE[0], AS3Pattern.VARIABLE_TYPE[1]); //Parse out the function type if needed
						index = tmpToken.index;
						currMember.type = tmpToken.token;
						Main.debug('------>Typed the function to: ', currMember.type);
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
						stack.pop();
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
						stack.pop();
					}
				} else if (getState() == AS3ParseState.LOCAL_VARIABLE)
				{

				} else if (getState() == AS3ParseState.LOCAL_FUNCTION)
				{

				} else if (getState() == AS3ParseState.IMPORT_PACKAGE)
				{
					//The current token is a class import
					currToken = AS3Parser.nextWord(src, index, AS3Pattern.IMPORT[0], AS3Pattern.IMPORT[1]);
					index = currToken.index - 1;
					if (!currToken.token)
					{
						throw new Error("Error parsing import.");
					} else
					{
						Main.debug("Parsed import name: " + currToken.token);
						if (currToken.token.indexOf("*") >= 0)
						{
							cls.importWildcards.push(currToken.token); //To be resolved later
						}
						else
						{
							cls.imports.push(currToken.token); //No need to resolve
						}
						stack.push(AS3ParseState.PACKAGE);
					}
				} else if (getState() == AS3ParseState.REQUIRE_MODULE)
				{
					//The current token is a module requirement
					currToken = AS3Parser.nextWord(src, index, AS3Pattern.REQUIRE[0], AS3Pattern.REQUIRE[1]);
					index = currToken.index - 1;
					if(!currToken.token)
						throw new Error("Error parsing require.");
					else {
						Main.debug("Parsed require name: " + currToken.token);
						cls.requires.push(currToken.token.trim());
						stack.push(AS3ParseState.PACKAGE);
					}
				}
			}
		}
		public function parse(options:Object = null):AS3Class
		{
			options = options || { };
			if (typeof options.safeRequire !== 'undefined')
			{
				parserOptions.safeRequire = options.safeRequire;
			}
			if (typeof options.ignoreFlash !== 'undefined')
			{
				parserOptions.ignoreFlash = options.ignoreFlash;
			}
			
			var classDefinition:AS3Class = new AS3Class(parserOptions);
			stack.splice(0, stack.length);
			stack.push(AS3ParseState.START);
			
			parseHelper(classDefinition, src);
			
			if (!classDefinition.className)
			{
				throw new Error("Error, no class provided for package: " + classPath);
			}
			return classDefinition;
		}
		
		public static function checkArguments(fn:AS3Function):String
		{
			if (fn.argList.length <= 0)
			{
				return fn.value;
			}
			var start:int = fn.value.indexOf('{');
			var args:String = "";
			for (var i:int = 0; i < fn.argList.length; i++)
			{
				//We will inject arguments into the top of the method definition
				if (fn.argList[i].isRestParam)
				{
					args += "\n\t\t\tvar " + fn.argList[i].name + " = Array.prototype.slice.call(arguments).splice(" + i + ");";
				} else if (fn.argList[i].value)
				{
					args += "\n\t\t\t" + fn.argList[i].name + " = AS3JS.Utils.getDefaultValue(" + fn.argList[i].name + ", " + fn.argList[i].value + ");";
				}
			}
			return fn.value.substr(0, start + 1) + args + fn.value.substr(start + 1);
		}
		public static function injectInstantiations(cls:AS3Class, fn:AS3Function)
		{
			var start:int = fn.value.indexOf('{');
			var text:String = "";
			for (var i = 0; i < cls.members.length; i++)
			{
				//We will inject instantiated vars into the top of the method definition
				if (cls.members[i] instanceof AS3Variable && AS3Class.nativeTypes.indexOf(cls.members[i].type) < 0)
				{
					text += "\n\t\t\tthis." + cls.members[i].name + " = " + cls.members[i].value + ";";
				}
			}
			return fn.value.substr(0, start + 1) + text + fn.value.substr(start + 1);
		}
		public static function checkStack(stack:Array, name:String):void
		{
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
		}
		public static function lookAhead(str:String, index:int):Object
		{
			//Look ahead in the function for assignments
			var originalIndex:int = index;
			var startIndex:int = -1;
			var endIndex:int = -1;
			var semicolonIndex:int = -1;
			var token:String = "";
			var extracted:String = "";
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
		}
		public static function parseFunc(cls:AS3Class, fnText:String, stack:Array, statFlag:Boolean = false):Array
		{
			var i:int;
			var j:int;
			var index:int = 0;
			var result:String = '';
			var tmpStr:String = '';
			var tmpArgs:Vector.<AS3Argument>;
			var tmpMember:AS3Member;
			var tmpClass:AS3Class;
			var tmpField:AS3Member;
			var prevToken:AS3Token;
			var currToken:AS3Token;
			var tmpParse:String;
			var tmpStatic:Boolean = false;
			var tmpPeek:String;
			var objBuffer = ''; //Tracks the current object that is being "pathed" (e.g. "object.field1" or "object.field1[index + 1]", etc)
			var justCreatedVar:Boolean = false; //Keeps track if we just started a var statement (to help test if we're setting a type))
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
								var localVar:AS3Member = new AS3Member();
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
		}
		public static function cleanup(text:String):String
		{
			var i:int;
			var type:String;
			var params:Array;
			var val:String;
			var matches:Array = text.match(AS3Pattern.VECTOR[0]);
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
					text = text.replace(AS3Pattern.VECTOR[1], "AS3JS.Utils.createArray(" + params[0] + ", " + val + ")");
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
					text = text.replace(AS3Pattern.ARRAY[1], "AS3JS.Utils.createArray(" + params[0] + ", null)");
				} else
				{
					text = text.replace(AS3Pattern.ARRAY[1], "[]");
				}
			}
			
			matches = text.match(AS3Pattern.DICTIONARY[0]);
			//For each instantiated Dictionary found in the text
			for (i in matches)
			{
				// Replace with empty object
				text = text.replace(AS3Pattern.DICTIONARY[0], "{}");
			}
			
			//Now cleanup variable types
			text = text.replace(/([^0-9a-zA-Z_$.])(?:var|const)(\s*[a-zA-Z_$*][0-9a-zA-Z_$.<>]*)\s*:\s*([a-zA-Z_$*][0-9a-zA-Z_$.<>]*)/g, "$1var$2");
			
			return text;
		}
	}
}
package com.mcleodgaming.as3js.enums
{
	public class AS3ParseState 
	{
		public static const START:String = "start";
		public static const PACKAGE_NAME:String = "packageName";
		public static const PACKAGE:String = "package";
		public static const CLASS_NAME:String = "className";
		public static const CLASS:String = "class";
		public static const CLASS_EXTENDS:String = "classExtends";
		public static const CLASS_IMPLEMENTS:String = "classImplements";
		public static const COMMENT_INLINE:String = "commentInline";
		public static const COMMENT_MULTILINE:String = "commentMultiline";
		public static const STRING_SINGLE_QUOTE:String = "stringSingleQuote";
		public static const STRING_DOUBLE_QUOTE:String = "stringDoubleQuote";
		public static const STRING_REGEX:String = "stringRegex";
		public static const MEMBER_VARIABLE:String = "memberVariable";
		public static const MEMBER_FUNCTION:String = "memberFunction";
		public static const LOCAL_VARIABLE:String = "localVariable";
		public static const LOCAL_FUNCTION:String = "localFunction";
		public static const IMPORT_PACKAGE:String = "importPackage";
		public static const REQUIRE_MODULE:String = "requireModule";
	}
}
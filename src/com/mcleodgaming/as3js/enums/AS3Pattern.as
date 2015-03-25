package com.mcleodgaming.as3js.enums
{
	public class AS3Pattern 
	{
		public static const IDENTIFIER:Array = [ /\w/g, /\w/g ];
		public static const OBJECT:Array = [ /[\w\.]/g, /[\w(\w(\.\w)+)]/g ];
		public static const IMPORT:Array = [ /[0-9a-zA-Z_$.*]/g, /[a-zA-Z_$][0-9a-zA-Z_$]([.][a-zA-Z_$][0-9a-zA-Z_$])*\*?/g ];
		public static const REQUIRE:Array = [ /./g, /["'](.*?)['"]/g ];
		public static const CURLY_BRACE:Array = [ /[\{|\}]/g, /[\{|\}]/g ];
		public static const VARIABLE:Array = [ /[0-9a-zA-Z_$]/g, /[a-zA-Z_$][0-9a-zA-Z_$]*/g ];
		public static const VARIABLE_TYPE:Array = [ /[a-zA-Z_$<>.*][0-9a-zA-Z_$<>.]*/g, /[a-zA-Z_$<>.*][0-9a-zA-Z_$<>.]*/g ];
		public static const VARIABLE_DECLARATION:Array = [ /[0-9a-zA-Z_$:<>.*]/g, /[a-zA-Z_$][0-9a-zA-Z_$]*\s*:\s*([a-zA-Z_$<>\.\*][0-9a-zA-Z_$<>\.]*)/g ];
		public static const ASSIGN_START:Array = [ /[=\r\n]/g, /[=\r\n]/g ];
		public static const ASSIGN_UPTO:Array = [ new RegExp("[^;\\r\\n]", "g"), /(.*?)/g ];
		public static const VECTOR:Array = [ /new[\s\t]+Vector\.<(.*?)>\((.*?)\)/g, /new[\s\t]+Vector\.<(.*?)>\((.*?)\)/ ];
		public static const ARRAY:Array = [ /new[\s\t]+Array\((.*?)\)/g, /new[\s\t]+Array\((.*?)\)/ ];
		public static const REST_ARG:Array = [ /\.\.\.[a-zA-Z_$][0-9a-zA-Z_$]*/g, /\.\.\.[a-zA-Z_$][0-9a-zA-Z_$]*/g];
	}
}
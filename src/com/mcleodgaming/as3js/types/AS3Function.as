package com.mcleodgaming.as3js.types
{
	public class AS3Function extends AS3Member
	{
		public var argList:Array;
		
		public function AS3Function() 
		{
			argList = [];
		}
		public function hasArgument():Boolean
		{
			for(var i = 0; i < argList.length; i++)
				if(argList[i].name == name)
					return true;
			return false;
		}
		public function buildLocalVariableStack():Array
		{
			var i;
			var text = value || '';
			var matches = text.match(/(var|,)(.*?)([a-zA-Z_$][0-9a-zA-Z_$]*):([a-zA-Z_$][0-9a-zA-Z_$]*)/g);
			var locals = [];
			if(argList) {
				for(i in argList) {
					locals.push(argList[i]);
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
	}
}
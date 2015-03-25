package com.mcleodgaming.as3js.types
{
	public class AS3Member 
	{
		public var name:String;
		public var type:String;
		public var subType:String;
		public var value:String;
		public var encapsulation:String;
		public var isStatic:Boolean;
		
		public function AS3Member() 
		{
			name = null;
			type = '*';
			subType = null,
			value = null;
			encapsulation = "public";
			isStatic = false;
		}
		
		public function createVariable():AS3Variable
		{
			var obj = new AS3Variable();
			obj.name = name;
			obj.type = type;
			obj.subType = subType,
			obj.value = value;
			obj.encapsulation = encapsulation;
			obj.isStatic = isStatic;
			return obj;
		}
		public function createFunction():AS3Function
		{
			var obj = new AS3Function();
			obj.name = name;
			obj.type = type;
			obj.subType = subType,
			obj.value = value;
			obj.encapsulation = encapsulation;
			obj.isStatic = isStatic;
			return obj;
		}
	}
}
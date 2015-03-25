package com.mcleodgaming.as3js.parser 
{
	public class AS3Token 
	{
		public var token:String;
		public var index:int;
		public var extra:String;
		
		public function AS3Token(token:String, index:int, extra:String) 
		{
			this.token = token;
			this.index = index;
			this.extra = extra;
		}
	}

}
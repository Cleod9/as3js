package com.mcleodgaming.as3js.util
{
	public class AS3JSUtils 
	{
		public static function getDefaultValue(value:*, fallback:*):*
		{
			return (typeof value != 'undefined') ? value : fallback;
		}
		public static function createArray(size:int, val:*):Array
		{
			var arr = [];
			for (var i = 0; i < size; i++)
			{
				arr.push(val); 
			}
			return arr;
		}
	}
}
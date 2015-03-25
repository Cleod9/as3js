var AS3JS = function () {};

AS3JS.getDefaultValue = function(value, fallback) { 
  return (typeof value != 'undefined') ? value : fallback;
};
AS3JS.createArray = function(size, val) {
  var arr = [];
  for(var i = 0; i < size; i++) {
    arr.push(val); 
  }
  return arr;
};
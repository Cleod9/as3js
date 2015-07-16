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
{{packages}}
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
})({ entryPackage: "{{entryPackage}}", entryClass: "{{entryClass}}", entryMode: "{{entryMode}}" });
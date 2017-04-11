/*******************************
  AS3JS Version 0.3.3
  
    AS3 to JS converter for use with ImportJS and OOPS.js.
  
  The MIT License (MIT)

  Copyright (c) 2017 Greg McLeod <cleod9{at}gmail.com>

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
*******************************/
(function ( ) {
  var AS3JS = {
    Utils: {
      // Helper for default args
      getDefaultValue: function getDefaultValue(value, fallback) {
        return (typeof value != 'undefined') ? value : fallback;
      },
      // Helper for Vector/Array constructors
	  createArray: function (size, val) {
        var arr = [];
        for (var i = 0; i < size; i++)  {
          arr.push(val); 
        }
        return arr;
      }
    },
    load: function ( params ) {
      // Loads program specified by params
      params = params || {};
	  params.entryMode = params.entryMode || 'instance';
	
      // Shim just in case
      if (typeof Object.create !== 'function') {
        Object.create = function (o) {
          function F() {}
          F.prototype = o;
          return new F();
        }
      };

      // Some temps / helper
      var i, j, tmpPkg;
      var getPackageInfo = function ( name ) {
        // Splits package path into separate package and class name
        var pkg = name.split('.');
        var className = pkg[pkg.length-1];
        pkg.splice(pkg.length-1, 1);
        var packageName = pkg.join('.');

        return { 
          packageName: packageName,
          className: className
        };
      };

      // This hash map contains each package, each package contains its classes
      var packages = {};

      // Converts supplied package hash to packageName.className.{ source: moduleFn }
      for (i in params.program) {
        tmpPkg = getPackageInfo(i);
        packages[tmpPkg.packageName] = packages[tmpPkg.packageName] || {};
        packages[tmpPkg.packageName][tmpPkg.className] = { compiled: false, source: params.program[i] };
      }

      // This helper will execute the module source specified by "name" and return its exports object
      var imports = function ( packageName, className ) {
        // Only run source() if it hasn't been compiled yet
        if (!packages[packageName][className].compiled) {
          packages[packageName][className].compiled = true;
          packages[packageName][className].module = { exports: null, inject: null, import: imports };
          //This next line actually compiles the module
          packages[packageName][className].source(packages[packageName][className].module, packages[packageName][className].module.exports);
        }
        // Returns the compiled module
        return packages[packageName][className].module.exports;
      };

      // Compiles all packages
      for (i in packages) {
        for (j in packages[i]) {
          imports(i, j);
        }
      }
	
      // Run inject() and $cinit() functions as the final step (this trivializes circular dependencies)
      for (i in packages) {
        // Execute the injection functions
        for (j in packages[i]) {
          if (typeof packages[i][j].module.inject === 'function') {
            packages[i][j].module.inject();
          }
        }
      }
      for (i in packages) {
        // Execute the $cinit functions
        for (j in packages[i]) {
          if (typeof packages[i][j].module.exports.$cinit === 'function') {
            packages[i][j].module.exports.$cinit();
          }
        }
      }

      // Initializes application
      var entryPkgInfo = getPackageInfo(params.entry);
      var entryPoint = imports(entryPkgInfo.packageName, entryPkgInfo.className);
      if (params.entryMode === "instance") {
        return new entryPoint();
      } else if (params.entryMode === "static") {
        return entryPoint;
      }
    }
  };
  
  if (typeof module !== 'undefined') {
    //CommonJS
    module.exports = AS3JS;
  } else {
    //Browser Global
    window.AS3JS = AS3JS;
  }
})();
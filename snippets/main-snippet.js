(function ( ) {
  var Program = {};
{{packages}}

  if (typeof module !== 'undefined') {
    module.exports = AS3JS.load({ program: Program, entry: "{{entryPoint}}", entryMode: "{{entryMode}}" });
  } else if (typeof window !== 'undefined' && typeof AS3JS !== 'undefined') {
    window['{{entryPoint}}'] = AS3JS.load({ program: Program, entry: "{{entryPoint}}", entryMode: "{{entryMode}}" });
  }
})();
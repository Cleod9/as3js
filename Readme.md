# AS3JS (alpha) #

----------

**NEW:** **Try AS3JS [live in your browser!](http://www.as3js.org/demo)** 

[http://www.as3js.org](http://www.as3js.org)

AS3JS is a tool written for Node.js that converts ActionScript 3.0 to vanilla JavaScript (originally based on [ImportJS](https://github.com/Cleod9/importjs)). This allows you to write your code using the standard AS3 package structure, and have it automatically converted into a standalone JavaScript file. There are many IDE's out there that can easily parse ActionScript files, so why would you pass up this chance at smart JS code-completion in a program such as [FlashDevelop](http://www.flashdevelop.org/wikidocs/index.php?title=Features:Completion) or [FDT](http://fdt.powerflasher.com/)? **AS3JS even compiles its own source code from AS3 to JS!** :)

So this tool was created with the following goals in mind: 

- Write your code in ActionScript
- Output to **coherent, debugabble** JavaScript!

The best part about AS3JS is that even if you aren't familiar with AS3 you can still use this tool with a very small learning curve. The only real difference between AS3JS and normal JS code is what I'd like to call **"outer syntax"**. The majority of your code stays the same, you just need to change what "surrounds" your code. This should hopefully encourage building a much more organized code base in a large application.


## Features ##

- Converts ActionScript 3.0 code into readable JavaScript output (Structure based on [ImportJS](https://github.com/Cleod9/importjs))
- Recursively parses directories for ActionScript files and automatically resolves import dependencies
- Concatenation into a single .js file
- Support for Vector type syntax (transpiles to a standard Array)
- Support for the '*' wildcard symbol for imports
- Support for AS3's default argument values and the "...rest" argument
- Support for the "super" keyword up to the parent level
- Moderate support for getter/setter methods
- Mix and match with traditional JS code via the global namespace at your leisure
- Ultra fast compilation!

### Experimental features ###
- Allows `require "module_name"` at the package level (do not include semicolon, variable `module_name` will be assigned)

## Setup Instructions ##

**Installation Requirements:**

- [Node.js](http://nodejs.org/)


So the first thing you need in order to use this application is Node.js:

[http://nodejs.org/](http://nodejs.org/)

Once installed, then install AS3JS as a global module via your command line:

```
$ npm install as3js -g
```

If you just want to install as3js into a local project, you can omit the `-g` to run via `./node_modules/.bin/as3js`:

```
$ npm install as3js
```

## Usage ##

### CLI ###

AS3JS can be run as a CLI via the `as3js` command, which has the following parameters:

`-o`, `--output`: Path where the output file will be written (e.g. path/to/output.js)

`-src`, `--sourcepath`: Comma-delimited list of paths to pull source .as files from. It is expected that this path be the root of your project's package directory. So for example, if you defined a package such as `com.myproject`, you would want this value to be the folder that contains the `com` directory. Note that AS3JS processes folders recursively, so you only need to put the path to your top-level folders.

`-h`, `--help`: Outputs help information.

`-v`,`--version`: Outputs version information.

`-s`,`--silent`: Flag to completely silence AS3JS output.

`--verbose`: Flag to enable verbose output. Use to help debug transpiler errors.

`-d`, `--dry`: Perfoms a dry-run of the compilation. This will perform all of the usual compilation steps but skip writing the final output file.

`-e`, `--entry`: This is the entry package class for your application. Uses the format `[mode]:path.to.package.Class`. You replace `[mode]` with either `"instance"` to have AS3JS instantiate the class once your compiled script loads, or `"static"` to have AS3JS return the class function as-is.

`--safe-require` - Puts a try-catch around require statements. Useful for code that may run in both the browser and Node.js

`--ignore-flash` - Ignores imports of flash.* packages (helps silence errors when porting Flash code)

Here is an example command:

```
$ as3js -src ./myas3 -o ./output.js -e new:com.example.MyClass
```

The above example recursively browses through the directory `myas3` finding all `.as` files, converts them to JS, and finally combines the results into a file called `output.js` in the working directory. This script contains your entire application, and will initialize `MyClass` as your entry point.  Simple as that!
### Node Script ###

AS3JS can also be initialized manually within a Node.js script like so:

```js
// Import the compiler
var AS3JS = require('as3js');

// Instantiate the compiler
var as3js = new AS3JS();
var result = as3js.compile({
  srcPaths: ['./src'], // --sourcepath
  silent: false, // --silent
  verbose: false, // --verbose
  entry: "com.my.App", // Entry point class path
  entryMode: "instance", // "instance" or "static"
  safeRequire: false, // --safe-require
  ignoreFlash: false // --ignore-flash
  packages: [] // Provide an array of raw text strings to be parsed as "files"
});

// Gets the compiled source text and do what you want with it
var sourceText = result.compiledSource;

// Example: Prepending the loader source code to the program
var as3jslib = fs.readFileSync('node_modules/as3js/lib/as3.js');
fs.writeFileSync('app.js', as3jslib + '\n' + sourceText, "UTF-8", {flags: 'w+'});
```



## Examples ##

- **[Live browser demo](http://www.as3js.org/demo)** - Test out AS3JS right in your browser!

- **[Elevator Engine](https://github.com/cleod9/elevatorjs)** - I wrote this elevator simulator a long time ago in JavaScript and converted it to AS3. What's unique about this one is that the code can also compile to SWF simply by swapping out a single file.

## Limitations ##

Of course since AS3JS is still in alpha it comes with its limitations. See below:

### Event Listeners ###

AS3JS does not enforce class function binding when using them as callbacks. This is commonly an issue when dealing with event listeners. This simply means you will have to manage binding any event listeners on your own. A simple workaround for this is as follows:

```actionscript
//Write a global helper somewhere that anyone can access
var eventHelper = function (context, fn) {
	//Returns a function with the proper binding
	return function () {
		return fn.apply(context, Array.prototype.slice.call(arguments));
	};
};
```
```actionscript
//Usage in AS3
package {
	public class Main {
		public var myFuncBinded:Function;
		public function Main():void {
			//Allows you to use myFuncBinded for guaranteed scope
			myFuncBinded = eventHelper(this, myFunc);
			window.addEventListener("click", myFuncBinded);
		}
		public function myFunc(e:* = null):void {
			//When window is clicked
			console.log("clicked");
		}
	}
}
```
### No True Privates ###

While you can use any of the encapsulation keywords you'd like, there is currently no "true" encapsulation support in AS3JS. Private/protected class properties and methods remain publicly accessible on any instantiated objects. I gave a lot of thought to this and went over many potential solutions. I came to the conclusion that while encapsulation is convenient, in the open world of JavaScript all of this data is easily accessible through basic browser debugging tools. As such, I have no plans to add true encapsulation to AS3JS. The good news is that you can still use the keywords and AS3JS will simply strip them out.

### No Chaining super() ###

AS3JS does not currently support chaining `super` (i.e. `super.super.super.fn()`). If you need such a feature, you can achieve this by using JavaScript in your code:

```actionscript
GreatGrandfather.prototype.fn.call(this, arg1, arg2... etc);
```

### No type validation ###

AS3JS will not validate your types during compile time or runtime. I may add some compile time type checking in the future, but there are no plans for runtime type checking due to unnecessary overhead.

### Typed variable declarations cannot be all on one line ###

I hope to work on this soon, but currently you can't write statements like this:

```actionscript
var a:Type, b:Type, c:Type = 4;
```
If you remove the types it will work fine, but I have not yet implemented anything to strip the types from this type of statement.

### Class-level member variable assignments must be on one line ###

Currently AS3JS doesn't support breaking out something like this into separate lines:

```actionscript
public static var foo:Object = { a: 1, b: 2, c: 3, d: 4, e: 5 };
```
Hopefully you aren't writing such large assignments on class level properties, but for now please write these types of assignments as one-liners.

### Getter/Setter limitations ###

While the getter/setters work pretty well, there are a couple of things you should avoid:

- Assigning a value to a setter that spans multiple lines;
- Accessing a getter from within a getter: (e.g. `myGetter['key'].someOtherGetter`)

AS3JS isn't able to recognize those situations, so it will likely export invalid JS.

### No support for package-level functions ###

This isn't something I've seen used all that often anyway, but if you want to read up on package-level functions see [here](http://blogs.adobe.com/digitalmedia/2011/01/as3-package-level-functions-and-java-static-imports/)

### No casting types ###

I have not implemented the `as` operator, nor can you case with the `Caster(castee)` syntax. The only workaround for now is to re-assign values to a variable that has the proper Type:

```actionscript
var other:SomeOtherType = new SomeOtherType();
var foo:TypeIWant = other;
```

### No `is` support ###

Currently there is no support for type checking via the `is` operator (e.g. `val is Type`) Just stick with `instanceof` for now.

### No `Embed` support ###

Resource embedding is specific to the Flash platform, so I have no plans to implement it at this time.

### Restricted regex support ###

The parser is currently unable to recognize the start and end of a regular expression literal (e.g. `/pattern/`). As such, characters such as `"`, `'`, `{`, `}`, and other patterns may confuse the parser. A simple workaround for this is to use the `RegExp` constructor to define regular expressions that contain these characters (e.g. `new RegExp("pattern")`)


## \*Disclaimer\* ##

**AS3JS cannot currently convert *all* AS3 to proper JS.** While I have put a ton of effort into allowing it to convert 99% of AS3 syntax into JavaScript, the languages are still fundamentally different. There are several things that I have yet to handle, such as casting via the `as` operator, or forcefully binding event callbacks to class instances. This tool is not perfect, however it is quite able to handle a full-fledged personal project. You'll find that  sometimes after compiling without errors there may still be some minor syntax issues in the output, however nearly all of these issues can be avoided very easily with a few code tweaks in your AS3 and are easy to catch (See "Limitations" listed above).

Also I would like to note that **this is not an all-in-one solution** like [FlashJS](http://flashjs.com/), [FlexJS](http://flex.apache.org/download-flexjs.html), [OpenFL](http://www.openfl.org/), or [Randori](http://randoriframework.com/). This is more like what [Jangaroo](http://www.jangaroo.net/home/) was meant to do, but a trillion times simpler. Although AS3JS can be used to create code that is somewhat cross-compatible with Flash, it is still designed with the average JavaScript developer in mind. The philosophy of AS3JS is to greatly simplify the organization of your JavaScript code using AS3 as syntax, not to re-create Flash. You have the freedom to implement Flash AS3 features if you want, but they will not come built into AS3JS.

Lastly, I fully acknowledge the ActionScript name as the property of [Adobe](http://www.adobe.com/). I do not claim ownership of the language nor do I have any affiliation with Adobe, but I do encourage you to check out the [documentation](http://www.adobe.com/devnet/actionscript/learning.html) if you are unfamiliar with ActionScript 3.0. Just remember that AS3JS is made for JavaScript, so many features of Flash AS3 will not be implemented unless you create them yourself.

## Building Source ##

The source code for AS3JS is written in ActionScript 3 under the `src/` folder, and is also set up as a FlashDevelop project. You can compile the source code one of two ways:


- Clicking the Build button in the toolbar of FlashDevelop

OR

- Executing `node build.js` via the command-line

Either of these steps will output a file called `runtime-compiled.js`. Replace `runtime.js` with the contents of `runtime-compiled.js` to update the runtime with your changes.

### Finalizing A Build ###

Since AS3JS's source is written to be compiled by AS3JS itself, if your changes affect the output of compiled files it's important to run the build again and replace `runtime.js` a second AND third time. This ensures that the runtime is using your code as opposed to an outdated runtime. If something is wrong with the build, it will likely fail the third time you attempt to build. It also can't hurt to build a fourth time to ensure the final build is stable.


## Upgrade Notes ##

**Upgrading from v0.1.**: [ImportJS](https://github.com/Cleod9/importjs) and [OOPS.js](https://github.com/Cleod9/oopsjs) are no longer dependencies of this project, so be sure to follow the new setup instructions carefully)

**Upgrading from v0.2.**: AS3JS's responsibilities have been split into two functions: The *compiler*, and the *loader*. The compiler is what converts your AS3 into vanilla JS, but with a few extra features that depend on a separate loader library included in this repo. In browser environments, this is just a matter of using the `./lib/as3.js` as a global script on the page to load your program. For Node.js environments, you'll need to attach AS3JS to the `global` object (details later on below)


## Version History ##

**0.3.1**
- Updated Readme
- Improved error messaging when class paths are missing

**0.3.0**

- Documented the Node.js interface for loading the compiler manually
- Split AS3JS roles into "compiler" and "program" (while still maintaining mostly vanilla code)
- Added safeRequire option to allow browser to load code with Node require statements
- Added ignoreFlash option to ignore **flash.*** packages
- Fixed several issues with transpiling classes in the top-level package
- Experimental package-level `require` feature
- New `packages` option that can be used when compiling directly in Node.js (allows injecting raw text packages into the compiler)
- Shipped new live editor with 0.3.* support: http://www.as3js.org/demo

**0.2.***

-Created new Vanilla output format that no longer requires external libraries
-Removed ImportJS and OOPS.js as dependencies

**0.1.***

-Initial alpha release

**0.0.1**

-First commit (before conversion of the source code itself to AS3)



----------

Copyrighted © 2017 by Greg McLeod

GitHub: [https://github.com/cleod9](https://github.com/cleod9)
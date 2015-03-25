# AS3JS #

----------

AS3JS is an easy to use command line tool written in Node.js that converts ActionScript 3.0 to JavaScript  for use with my two libraries [OOPS.js](https://github.com/Cleod9/oopsjs) and [ImportJS](https://github.com/Cleod9/importjs). This allows you to write your code using the standard AS3 package structure, and have it automatically converted into a single JavaScript file. There are many IDE's out there that can easily parse ActionScript files, so why would you pass up this chance at smart JS code-completion in a program such as [FlashDevelop](http://www.flashdevelop.org/wikidocs/index.php?title=Features:Completion)? :)


## \*Disclaimer\*##

**AS3JS cannot convert all AS3 to proper JS.** While I have put a ton of effort into allowing it to convert over 95% of AS3 syntax into JavaScript, the languages are still fundamentally different. There are several things that I have yet to handle, such as dealing with situations when local variables have the same names as class members, or casts using the `as` operator. This tool is not perfect, however it is able to handle a full-fledged project. You'll find that while compiling without errors sometimes there may still be some minor syntax issues in the output, however nearly all of these issues can be avoided very easily with a few code tweaks.

Also I would like to note that **this is not an all-in-one solution** like [FlashJS](http://flashjs.com/) or [Randori](http://randoriframework.com/). This is more like what [Jangaroo](http://www.jangaroo.net/home/) was meant to do, but a trillion times simpler (what Flash developer wants to install Maven, really?). Although AS3JS can be used to create code that is somewhat cross-compataible with Flash, it is still indeed designed for JavaScript. The philosophy of AS3JS is to greatly simplify the organization of your JavaScript code using an AS3-like syntax, not to re-create Flash. You have the freedom to implement Flash AS3 features if you want, but they will not be built into AS3JS.

Lastly, the ActionScript name is the property of [Adobe](http://www.adobe.com/). I do not claim ownership of the language nor do I have any affiliation with Adobe, but I do encourage you to check out the [documentation](http://www.adobe.com/devnet/actionscript/learning.html) if you are unfamiliar with AS3. Just remember that AS3JS is made for JavaScript, so many features of AS3 will not be implemented unless you create them yourself.

## What is AS3JS? ##

AS3JS "builds" separate AS3 files into a single JavaScript file. My favorite language is ActionScript 3.0 due to its organizational simplicity, and I'm tired of seeing web projects with JavaScript all crammed into a single file. Sure there are other libraries out there like [RequireJS](http://requirejs.org/) that are meant to help keep things separate and modular, but I think we can do better than that. As it turns out, ActionScript and JavaScript are *almost* the same exact syntax, so I decided to exploit this by creating AS3JS for use with my other two libraries, [OOPS.js](https://github.com/Cleod9/oopsjs) and [ImportJS](https://github.com/Cleod9/importjs).


There are all sorts of JS preprocessors out there such as [CoffeeScript](http://coffeescript.org/) or [TypeScript](http://www.typescriptlang.org/), but they aren't "really" JavaScript. Why do we need to create a new language for a preprocessor? And why can't we have a syntax that, at its core, IS JavaScript? It just so happens that AS3 and JS are so similar, conversion just comes down to outputting the text in the correct format. The solution? AS3JS! 

So AS3JS was created with the following goals in mind: 

- Write your code in ActionScript
- Output to **coherent, debugabble** JavaScript!

The best part about AS3JS is that even if you aren't familiar with AS3 you can still use this tool with a very small learning curve. The only real difference between AS3JS and normal JS code is what I'd like to call **"outer syntax"**. The majority of your code stays the same, you just need to change what "surrounds" your code. This encourages a much more organized code base in a large application.

### Core Features ###

- Converts the majority of AS3 syntax into valid JavaScript
- Modular packaging system brought to you by [ImportJS](https://github.com/Cleod9/importjs)
- Object Oriented output courtesy of [OOPS.js](https://github.com/Cleod9/oopsjs) 
- Recursively parses directories for ActionScript files and automatically resolves import dependencies
- Combines output into a single file

### Other Features ###

- Simplifies the overall conversion process and cross-compatibility of AS3 code-bases to JS
- Supports `super.fn()`for parent functions (including `super()` for parent constructor)
- Supports '`*`' wildcard at the end of package names for automatic dependency resolution.
- Supports setting function arguments to default values (no more `typeof 'undefined'` checks!)
- It compiles really fast! 


## Setup Instructions ##

**Requirements:**

- [Node.js](http://nodejs.org/)
- [ImportJS](https://github.com/Cleod9/importjs)
- [OOPS.js](https://github.com/Cleod9/oopsjs)

So the first thing you need in order to use this application is Node.js:

[http://nodejs.org/](http://nodejs.org/)

Once installed, go to a terminal/command window and run the commands `node -v` and `npm -v`. You should see output similar to the following:

```
$ node -v
v0.10.18
$ npm -v
1.3.8
```
If you don't see the above text, then you may need to restart your computer. (If you're using Windows, I recommend restarting after installation anyway just in case)

Next, install AS3JS as a global module by typing `npm install node-as3js -g`:

```
$ npm install node-as3js -g
```

Once installed, you gain the capability to run the command `as3js` anywhere on your system. To load an output file created by as3js into the browser, make sure to first include the library files from [ImportJS](https://github.com/Cleod9/importjs) and [OOPS.js](https://github.com/Cleod9/oopsjs).

## Usage ##

AS3JS is run by typing in the command `as3js` in your command line window. This command has the following parameters:

`-o`, `--output`: Path where the output file will be written (e.g. C:\Documents\output.js)

`-src`, `--source`: Comma-delimited list of paths to pull source .as files from. It is expected that this path be the root of your project's package directory. So for example, if you defined a package such as `com.myproject`, you would want this value to be the folder that contains the `com` directory. Rememember that AS3JS processes folders recursively, so you only need to put the path to your top-level folders.

`-h`, `--help`: Outputs help information.

`-v`,`--version`: Outputs version information.

Here is an example command:

```
as3js -src myas3 -o output.js
```

The above example recursievly browses through the directory `myas3` finding all .as files, converts them to JS, and finally combines the results into a file called `output.js` in the working directory.


## Side Notes ##

- **You are not required to give types to all of your variables.** AS3JS is meant to allow regular JavaScript run within your functions, so if you don't want to give types to your variables and function returns, then just simply leave them out.
- **AS3JS does not validate your types in its final output**. In fact, all types are currently stripped out completely in the final output. The typing feature is mainly to grant you the ability to use your IDE's code-completion features to their full extent.
- **AS3JS cannot currently parse multiple inline typed-variable declarations** in the format `var foo:type, foo2:type, …etc`. Please separate them into different lines or they will be not be noticed by AS3JS.
- **No JS support for private/protected class members**. I highly encourage you to use them, however these values will always be coerced to public in the final output so name your properties accordingly!
- AS3JS will automatically parse for `.addEventListener(event, fn)` and change it to `.addEventListener(event, fn.bind(this))`.
- AS3JS does include comments in your output file, but **any comments outside of a function definition will be ignored.**
- AS3JS has limited [getter/setter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Working_with_Objects#Defining_getters_and_setters) support (e.g. `public function get foo()`). It's possible for AS3JS accidentally modify other variables with similar names, so it helps to give them a unique name and perhaps use a capital letter to start its name.
- AS3JS **does not** currently recognize the use of getters/setters in code such as `obj[index].getter` due to the dot operator being preceeded by a closing bracket. It's best to first set the object as a variable to avoid this bug like so: `var o = obj[index]; getter;`
- AS3JS **does not** currently support [package-level](http://www.negush.net/blog/package-level-functions/) functions
- AS3JS **does not** currently support chaining super commands (e.g. `super.super()`)
- You can reference global libraries such as jQuery just fine, you only have to make sure they are loaded before the AS3JS source file.


## Version History ##

**0.1.0**

-Initial release

----------

Copyrighted © 2013 by Greg McLeod

GitHub: [https://github.com/cleod9](https://github.com/cleod9)
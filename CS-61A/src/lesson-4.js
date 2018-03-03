/*
 * Essentials of interpretation.
 * by Dmitry A. Soshnikov <dmitry.soshnikov@gmail.com>
 *
 * Lesson 4. Working with environments. Variables and built-in functions.
 *
 * In this lesson we introduce the concept of an "environment" --
 * a repository to store variables and functions.
 *
 * We'll also see that the process of inrepretation is a *cycle* of
 * recursive "eval"-uation and "apply"-ing of functions. See:
 * http://mitpress.mit.edu/sicp/full-text/book/ch4-Z-G-1.gif
 *
 * In fact, all actions at the end of evaluation reduce to the applying of
 * the *built-in* functions (that is, implemented directly in the underlying
 * system, in our case -- directly in JavaScript). In following lessons we'll
 * introduce also *user-defined* functions.
 *
 * We consider the built-in functions first. For example, we'll move operators
 * from lesson-1 (such as +, -, *, - etc) to built-in functions.
 *
 * We again start with the main "evaluate" function which now (in contrast with
 * lesson-1) accepts *two* arguments -- the *expression* to eval and the *environment*
 * to lookup the *symbols* (i.e. variable and function names) and their values.
 */

/**
 * evaluate
 * @param {Expression} expression
 * @param {Environment} environment
 *
 * "eval" accepts expression to evaluate and the environment in which
 * it lookups the bindings for variables. Depending on the expression's type
 * it executes appropriate evaluating procedure -- i.e. still "eval" is
 * just a case-analysis which dispatches to needed routes.
 */
function evaluate(expression, environment) {

  // default environment is the global environment,
  // "TheGlobalEnvironment" object is defined and described below
  environment || (environment = TheGlobalEnvironment);

  // we consider the simplest expressions such as
  // numbers and strings as "self-evaluating", that is
  // the expressions which directly returns their
  // values without additional evaluation
  if (isSelfEvaluating(expression))
    return expression;

  // That's said, "eval" must look up variables in the environment
  // to find their values. We'll introduce the environments structure shortly.
  if (isVariable(expression))
    return lookupVariableValue(expression, environment);

  // A definition of a variable must recursively call "eval" to compute
  // the new value to be associated with the variable. The environment must
  // be modified to change (or create) the binding of the variable.
  if (isDefinition(expression))
    return evalDefinition(expression, environment);

  // All the other cases in this version of our interpreter
  // are the *function applications* (i.e. function calls). Applications
  // are compound expressions which consist of *operator* (i.e. function)
  // and *operands* (or arguments) parts.
  //
  // Example: ["+", 1, 2] - operator is "+" and [1, 2] is the list
  // of operands (function arguments). Prefix notation allows us to have
  // more than two operands, e.g. ["*", 5, 3, 4].
  //
  // Before the application itself, we should find the function definition in
  // the environment. Besides, we should also find the values of operands (in case
  // if variables are passed). The resulting procedure and arguments are passed
  // to "apply" function, which handles the actual procedure application.

  if (isApplication(expression))
    // apply the function
    return apply(
      // lookup function object in the environment; "getOperator" just
      // separates the operator symbol (function name) from the expression, e.g.:
      // getOperator(["+", 1, 2]) -> "+"
      evaluate(getOperator(expression), environment),
      // get values of passed arguments via recursive
      // mapping them with evaluation; "getArguments" separates argument names:
      // getArguments(["+", "x", 1]) -> ["x", 1] and "getArgumentValues" already
      // map it with "eval" -> [2, 1] (in case if "x" is 2)
      getArgumentValues(getArguments(expression), environment)
    );

}

// That's it, our "eval" case-analysis of expression types is ready. Next we should
// implement the procedure of function applications (calls).

/**
 * apply
 * @param {Function} procedure
 * @param {Array} arguments
 *
 * "apply" takes two arguments, a procedure and a list of arguments to which the
 * procedure should be applied. "apply" classifies procedures into two kinds:
 * it calls *applyBuiltInFunction* to apply built-ins. For future we plan also
 * applications of use-defined (compound) functions, so we consider this case
 * also, though, just inform that the functionality isn't implemented yet.
 */
function apply(procedure, arguments) {

  // if it's a built-in function, just call it
  if (isBuiltInFunction(procedure))
    return applyBuiltInFunction(procedure, arguments);

  // if it's a user-defined function... (leaved for
  // future versions of interpreter)
  if (isUserDefinedFunction(procedure))
    throw "User-defined functions are not implemented yet."

}

// -- Predicate functions ---

// Next we need the tester functions (predicates) which we used in
// "eval" classifying the expression types.

/**
 * isSelfEvaluating
 * @param {Expression} expression
 * Tests for primitive (self-evaluating) expressions
 */
function isSelfEvaluating(expression) {
  return !isNaN(expression) ||
    // we mark strings with single ' apostrophe to differentiate
    // them from variable names which are also strings
    (typeof expression == "string" && expression[0] == "'");
}

/**
 * isVariable
 * @param {Expression} expression
 * Tests whether the expression is variable. We allow
 * lower- and upper-cased letters, digits and some other
 * symbols in variable names (e.g. +, -, *, etc - since
 * function names are also variables)
 */
function isVariable(expression) {
  return /^([a-z-A-Z0-9_$+*/\-])+$/.test(expression);
}

/**
 * isDefinition
 * @param {Expression} expression
 * Tests whether the expression is definition. We use
 * the same "isTaggedList" from the lesson-1 for that.
 * Assignments has "define" as their tag.
 *
 */
function isDefinition(expression) {
  return isTaggedList("define", expression);
}

/**
 * isApplication
 * @param {Expression} expression
 * Tests whether the expression is a function call (the application).
 * We assume that functions may have any name (which satisfy "isVariable"
 * predicate), so there is no special testing tag here -- ["+", 1, 2],
 * ["-", 3, 1], ["hello", 10, 20] -- all are function calls (the
 * later is a user-defined function which we don't touch in this lesson).
 * So we just test whether the expression is an array.
 */
function isApplication(exp) {
  return Array.isArray(exp);
}

/**
 * isBuiltInFunction
 * @param {Function} procedure
 * Chechs whether the function is built-in. All built-in functions
 * are real JS functions since defined in the interpreter.
 */
function isBuiltInFunction(procedure) {
  return typeof procedure == "function";
}

/**
 * isUserDefinedFunction
 * @param {String} function name
 * Not implemented yet. Just return true.
 */
function isUserDefinedFunction(procedure) {
  return true;
}

/**
* isTaggedList
* @param {Expression} exp
*
* Main expression type testing function. Every complex
* expression has a type, which is the first element of
* the expression "array".
*
* Example:
*
* Expression ["+", A, B] is the "addition" function since
* its first element (the "tag") is "+"
*/
function isTaggedList(tag, exp) {
  return exp[0] == tag;
}

// -- Working with environments ---

// OK, completed with predicates. Next we should implement
// handling of variable lookups and definitions. This is where we
// tackle with *environment* concept. For now we use only one environment --
// "TheGlobalEnvironment" which stores all bindings defined globally
// (in the global context how we say in JavaScript). The built-in functions
// are also defined in the global environment.

/**
 * @property {Object} TheGlobalEnvironment
 * Global environment stores the bindings of the global context.
 * We use simple JavaScript object without prototype for this. Later,
 * when we'll introduce nested scopes, we'll use prototype inheritance to
 * chain environment frames, but for now -- only single environment frame --
 * the global one which has no parent environment ("null" as prototype).
 */
var TheGlobalEnvironment = Object.create(null);
TheGlobalEnvironment.toString = function () { return "[object TheGlobalEnvironment]" };

/**
 * lookupVariableValue
 * @param {String} variable
 * @param {Environment} environment
 * Returns the value that is bound to the symbol <variable> in the passed
 * environment, or signals an error if the variable is not defined.
 */
function lookupVariableValue(variable, environment) {
  if (variable in environment) {
    return environment[variable];
  }
  throw ReferenceError('"' + variable + '" is not defined');
}

/**
 * defineVariable
 * @param {String} variable
 * @param {Variant} value
 * @param {Environment} environment
 * Definition either creates a new binding in the environment
 * or changes its value if it exists.
 */
function defineVariable(variable, value, environment) {
  return environment[variable] = value;
}

/**
 * evalDefinition
 * @param {Expression} expression
 * @param {Environment} environment
 * Handles definitions of variables. It calls "evaluate" to find the value
 * to be assigned and transmits the variable and the resulting value to
 * "defineVariable" to be installed in the environment.
 */
function evalDefinition(expression, environment) {
  return defineVariable(
    // separate the variable name from expression, e.g.
    // getVariableName(["define", "x", 10]) -> "x"
    getVariableName(expression),
    // and extract the value; should call evaluate recursively since,
    // can be the case of assignment to another variable:
    // getVariableValue(["define", "x", "y"]) -> "y"
    evaluate(getVariableValue(expression), environment),
    environment
  );
}

/**
 * applyBuiltInFunction
 * @param {Function} procedure
 * @param {Array} args
 * Calls the JS function with the arguments
 */
function applyBuiltInFunction(procedure, args) {
  return procedure.apply(null, args);
}

// OK, we're almost finished. But yet, we need also getters
// which we used above to separate expression parts.

/**
 * getVariableName
 * @param {Expression} expression
 * Separates the variable name from the definition
 * expressions. It's always the first element of the expression
 * array. E.g.: ["define", "y", 20] -> "y"
 */
function getVariableName(expression) {
  return expression[1];
}

/**
 * getVariableValue
 * @param {Expression} expression
 * The same for getting the value of assignment or definition.
 * E.g.: ["define", "y", 20] -> 20
 */
function getVariableValue(expression) {
  return expression[2];
}

// helpers for applications (function calls)

/**
 * getOperator
 * @param {Expression} expression
 * Separates the operator (function name) from the application.
 * E.g.: ["+", "x", 1] -> "+"
 */
function getOperator(expression) {
  return expression[0];
}

/**
 * getArguments
 * @param {Expression} expression
 * Separates the operands (arguments) of the application.
 * E.g.: ["+", "x", 1, 5] -> ["x", 1, 5]
 */
function getArguments(expression) {
  return expression.slice(1);
}

/**
 * getArguments
 * @param {Expression} expression
 * Recursively "eval"s the argument values.
 * E.g.: ["x", 1] -> [2, 1] if "x" is 2
 */
function getArgumentValues(expressions, environment) {
  return expressions.map(function (argument) {
    return evaluate(argument, environment);
  });
}

// That's it. All we need else is to setup global
// environment with built-in functions (and possibly
// some variables).

// -- Setup the global environment ---

// helper function to extend an object
function extend(object, other) {
  for (var k in other) if (other.hasOwnProperty(k)) {
    object[k] = other[k];
  }
}

// extend "TheGlobalEnvironment" with initial bindings
extend(TheGlobalEnvironment, {

  // Some arithmetic functions. As we said, in this version
  // of the interpreter we support more than two operands, e.g.
  // ["+", 10, 20, 30], so we use reduce method of arrays to
  // handle this case.
  "+": function (/*arguments*/) {
    return [].reduce.call(arguments, function(a, b) {
      return a + b;
    });
  },
  // other mathematical functions are the same
  "*": function (/*arguments*/) {
    return [].reduce.call(arguments, function(a, b) {
      return a * b;
    });
  },
  // consider unary minus, i.e. -1
  "-": function (/*arguments*/) {
    if (arguments.length == 1) {
      return -arguments[0];
    }
    // else binary subtraction
    return [].reduce.call(arguments, function(a, b) {
      return a - b;
    });
  },
  // consider fractions, i.e. 1/n
  "/": function (/*arguments*/) {
    if (arguments.length == 1) {
      return 1 / arguments[0];
    }
    // else binary division
    return [].reduce.call(arguments, function(a, b) {
      return a / b;
    });
  },
  // other math functions
  "min": function (/*arguments*/) {
    return Math.min.apply(Math, arguments);
  },
  "max": function (/*arguments*/) {
    return Math.max.apply(Math, arguments);
  },
  "abs": function (x) {
    return Math.abs(x);
  },

  // some constants
  "true": true,
  "false": false,

  "VERSION": 1.5,

  // other functions
  "print": function (/*arguments*/) {
    return console.log.apply(console, arguments);
  }

});

// OK, let's test our interpreter.

// the simplest programs
console.log(evaluate(["+", 1, 2])); // 3
console.log(evaluate(["+", ["*", 3, 5, 2], 4])); // 34

// test self-evaluting expressions
console.log(evaluate(100)); // 100
console.log(evaluate("'hello")); // "'hello"

// built-in variables
console.log(evaluate("true")); // true

// other applications
evaluate(["print", "'hello", "'world", "VERSION"]); // "'hello" "'world" 1.5

// define "x" variable
evaluate(["define", "x", 10]);

// lookup it in the environment
console.log(evaluate("x")); // 10
// and use in expressions
console.log(evaluate(["*", "x", 5])); // 50

// define "y" variable
evaluate(["define", "y", 20]);

console.log(evaluate(["min", "x", 15, "y"])); // 10, i.e. "x"
console.log(evaluate(["/", "y", "x"])); // 2

// unary - and /
console.log(evaluate(["-", "x"])); // -10
console.log(evaluate(["/", "y"])); // 1/20, i.e. 0.05

// Exercises:
//
// 1. Implement assignment operation. In contrast with definition,
//    it should check whether a variable is bound and only after that
//    assign to it (or throw in case if the variable is not defined).
//
//    Example:
//
//    ["define", "x", 10];
//    ["set", "x", 20]; // OK, since "x" is defined
//    ["set", "y", 20]; // Error "y" is not defined
//
//    We'll need this operation in the following lesson, when we'll have
//    chains of environment frames (or the *scope chains*) and the assignment
//    in contrast with the definition may change the value of some *parent*
//    variable (definition always modifies current environment frame). Besides,
//    we'll the definition to define also functions.
//
// 2. AST format is fine to understand and work inside our interpreter,
//    however we can even more simplify it with using *s-expressions*
//    which are very similar to our AST.
//
//    Example:
//
//    ["define", "x", 10] in s-expression is (define x 10)
//    ["+", ["*", 5, "y"], "z", 10] is (+ (* 5 y) z 10)
//
//    Write a parser that transforms s-expressions into our AST tree.
//    You may use simple RegExp replaces and JS "eval" to create JS array or
//    e.g. parsing of s-expressions from note-1.

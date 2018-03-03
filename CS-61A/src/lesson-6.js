/*
 * Essentials of interpretation.
 * by Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 *
 * Lesson 6. Inner functions, lambdas and closures.
 *
 * MIT Style License.
 *
 * This lesson is devoted to implementation of inner functions and closures.
 * Besides, we introduce *anonymous functions* which we call *lambda*s.
 *
 * 1. Inner functions and closures.
 *
 * In case if an inner function uses parent variables and is *returned* to
 * the outside this directly leads us to the concept of a *closure* (i.e. we still should be
 * able to use parent variables, even if the parent activation environment should finish).
 *
 * Currently (in lesson-5) to execute a function, we create a fresh environment to bind formal
 * parameters to passed arguments and for storing local variables of the function. Thus, the created
 * environment currently *extends* always only the *global environment* (with this we get the
 * ability to access global variables from the activated function).
 *
 * (define x 10)              ; global variable "x"
 *
 * (define (foo y)            ; global function "foo" with parameter "y"
 *         (print (+ x y)))
 *
 * (foo 20)                   ; 30, "foo" has access to "x", "print" and "+" names which are
 *                            ; defined in the global environment
 *
 * Activation environment chain of "foo": {y: 20} -> {x: 10, foo: fn, print: built-in, +: built-in, ...}
 *
 * To support activation of *inner functions* the changes will be minimal: we should extend at
 * activation not *just* the global environment, but in general -- the *parent* environment. Thus,
 * at function *creation* we *save* this parent environment (where the function is *created*) and later
 * at activtion of the function we extend exactly this *saved environment* with the activation frame.
 *
 * We call this combination of a function itself and saved parent environment a *closure*:
 *
 * (define (foo x)                  ; global function "foo" with parameter "x"
 *         (define y 20)            ; local variable "y" of "foo" function
 *         (define (bar z)          ; local funcition "bar" with parameter "z", it's returned to the outside
 *                 (+ x y z)))
 *
 * (define bar (foo 10))            ; create global "bar" function as a result of calling "foo"
 * (bar 30)                         ; call "bar-fn" ("bar") passing "z" as 30 -- 60
 *
 * bar's environment chain: {z: 30} -> {y: 20, x: 10, bar: fn} -> {foo: fn, ... other globals} Thus, {z: 30}
 * is the activation frame, and {y: 20, x: 10, bar: fn} is that saved environment when "bar" was created.
 *
 * 2. Lambdas
 *
 * Lambdas (anonymous function expressions) are the same functions but do not require names. They can be useful when
 * are used as *first-class* functions being passed as functional arguments to *higher-order* functions (such as e.g. "map"):
 *
 * (lambda (x) (* x x)) -- creates new anonymous function
 * ((lambda (x) (* x x)) 2) -- 4, creates a function and immediately apply it
 *
 * A lambda though can be bind to a name in the environment and called later. In this case we make our previous definition
 * of a function from lesson-5 as just a *syntactic sugar* of binding a lambda to a name:
 *
 * (define (square x)
 *         (* x x))
 *
 * Will be a "sugar" for:
 *
 * (define square
 *     (lambda (x) (* x x)))
 *
 * With both definitions the resulting procedure is called as (square 2) -> 4
 *
 * For this we'll use the transformation: Funciton definitions -> Lambda -> Function object
 *
 * 3. Blocks
 *
 * As a "bonus" we'll implement *blocks* in this lessons which are the same as user-defined functions but
 * do not have formal parameters and do not create a new scope (begin <sequence-of-expressions>):
 *
 * (begin (define x 10)
 *        (define y 20)
 *        (+ x y))
 *
 * Dependencies:
 *   - lesson-5
 *   - parser from note-2: s-expressions to AST (for test examples)
 *
 * As before we start with extending of our main "evaluate" function.
 *
 */

/**
 * evaluate
 * @param {Expression} expression
 * @param {Environment} environment
 *
 * see lesson-5
 */
function evaluate(expression, environment) {

  // see lesson-5
  environment || (environment = TheGlobalEnvironment);

  // see lesson-5
  if (isSelfEvaluating(expression))
    return expression;

  // see lesson-5
  if (isVariable(expression))
    return lookupVariableValue(expression, environment);

  // see lesson-5
  if (isDefinition(expression))
    return evalDefinition(expression, environment);

  // see lesson-5
  if (isAssignment(expression))
    return evalAssignment(expression, environment);

  // if it's a lambda, create a function from it
  // ["lambda", ["x"], <body>] -> ["function", ["x"], <body>] + environment == closure
  if (isLambda(expression))
    return makeFunction(
      // we separate parameters
      getLambdaParameters(expression),
      // and the the body of a lambda
      getLambdaBody(expression),
      // and also closure the current environment
      environment
    );

  // we also eval blocks -- simple expression
  // sequences: ["begin", <actions>]
  if (isBlock(expression))
    return evalSequence(
      // separate the "actions" -- the expressions list
      getBlockActions(expression),
      // and eval it in the environment
      environment
    );

  // see lesson-5
  if (isApplication(expression))
    return apply(
      evaluate(getOperator(expression), environment),
      getArgumentValues(getArguments(expression), environment)
    );

}

/**
 * apply
 * @param {Function} procedure
 * @param {Array} arguments
 *
 * // see lesson-5
 *
 * In this version we support *inner functions as well*, so the environment for the evaluation
 * is constructed by extending the *saved environment* with the activation frame.
 */
function apply(procedure, arguments) {

  // see lesson-5
  if (isBuiltInFunction(procedure))
    return applyBuiltInFunction(procedure, arguments);

  // if it's a user-defined function
  if (isUserDefinedFunction(procedure))
    // this function is a wrapper of evalSequence from lesson-5
    return applyUserDefinedFunction(procedure, arguments);

}

// -- Predicate functions ---

// see lesson-5
function isSelfEvaluating(expression) {
  return !isNaN(expression) ||
    (typeof expression == "string" && expression[0] == "'");
}

// see lesson-5
function isVariable(expression) {
  return /^([a-z-A-Z0-9_$+*/\-])+$/.test(expression);
}

// see lesson-5
function isDefinition(expression) {
  return isTaggedList("define", expression);
}

// see lesson-5
function isAssignment(expression) {
  return isTaggedList("set!", expression);
}

// see lesson-5
function isApplication(exp) {
  return Array.isArray(exp);
}

// see lesson-5
function isBuiltInFunction(procedure) {
  return typeof procedure == "function";
}

// see lesson-5
function isUserDefinedFunction(procedure) {
  return isTaggedList("function", procedure);
}

/**
 * isLambda
 * @param {Expression} expression
 * Tests whether an expression is a lambda object
 * (i.e. has "lambda" as the type tag)
 */
function isLambda(expression) {
  return isTaggedList("lambda", expression);
}

/**
 * isBlock
 * @param {Expression} expression
 * Tests whether an expression is a block
 * ("begin" as a type tag)
 */
function isBlock(expression) {
  return isTaggedList("begin", expression);
}

// see lesson-5, lesson-1
function isTaggedList(tag, exp) {
  return exp[0] == tag;
}

// --- Representing user-defined functions ---

/**
 * makeFunction
 * @param {Array} parameters -- list of parameter names
 * @param {Array} body -- list of expressions (function body)
 * @param {Environment} parentEnvironment - a parent environment, where a function is created
 *
 * User-defined (compound) procedures are constructed from parameters, procedure bodies and
 * parent environments. I.e. all functions are *closures* since save parent lexical environment.
 */
function makeFunction(parameters, body, parentEnvironment) {
  // create a function
  var procedure = ["function", parameters, body];
  // and *closure* the lexical environment
  procedure.environment = parentEnvironment;
  return procedure;
}

// see lesson-5
function getFunctionBody(procedure) {
  return procedure[2];
}

// see lesson-5
function getFunctionParameters(procedure) {
  return procedure[1];
}

/**
 * makeLambda
 * @param {Array} parameters -- list of parameter names
 * @param {Array} body -- list of expressions (function body)
 *
 * Creates a lambda object -- intermediate representation of a function object. Later, at "eval",
 * lambdas are converted to function objects adding the third component -- the environment.
 * E.g.: parameters - ["x"], body - [["*", "x", "x"], ["+", 1, 2]]
 * ["lambda", ["x"], ["*", "x", "x"], ["+", 1, 2]], use contact to extract the body,
 * later in getLambdaBody the bogy again will be sliced to [["*", "x", "x"], ["+", 1, 2]]
 */
function makeLambda(parameters, body) {
  return ["lambda", parameters].concat(body);
}

/**
 * getLambdaBody
 * @param {Lambda} lambda
 * Gets the body of a lambda. This function is very similar to getFunctionBody
 */
function getLambdaBody(lambda) {
  return lambda.slice(2);
}

/**
 * getLambdaBody
 * @param {Lambda} lambda
 * Gets parameters of a lambda. This function is the same as getFunctionParameters
 */
function getLambdaParameters(lambda) {
  return lambda[1];
}

/**
 * getLambdaBody
 * @param {Expression} block
 * Gets the actions list of a block
 * ["begin", ["+", 1, 2], ["*", 2, 3]] -> [["+", 1, 2], ["*", 2, 3]]
 */
function getBlockActions(block) {
  return block.slice(1);
}

// -- Working with environments ---

/**
 * @property {Object} TheGlobalEnvironment
 * see lesson-5
 */
var TheGlobalEnvironment = {};
TheGlobalEnvironment.toString = function () { return "[object TheGlobalEnvironment]" };

// see lesson-5
function extendEnvironment(variables, values, parentEnvironment) {
  if (variables.length != values.length)
    throw "Count of variables and valules of bindings is not the same";

  // create new environment inheriting from the parent
  var environment = Object.create(parentEnvironment);

  // and initialize it with passed bindings
  for (var index = variables.length; index--;)
    environment[variables[index]] = values[index];

  return environment;
}

// see lesson-5
function lookupVariableValue(variable, environment) {
  if (variable in environment) {
    return environment[variable];
  }
  throw ReferenceError('"' + variable + '" is not defined');
}

// see lesson-5
function defineVariable(variable, value, environment) {
  return environment[variable] = value;
}

// see lesson-5
function setVariableValue(variable, value, environment) {

  if (!(variable in environment))
    throw ReferenceError('"' + variable + '" is not defined');

  do {
    // if found the frame, exit
    if (environment.hasOwnProperty(variable)) break;
    // else continue to search in parent environments
  } while (environment = Object.getPrototypeOf(environment));

  return environment[variable] = value;

}

/**
 * evalDefinition
 * @param {Expression} expression
 * @param {Environment} environment
 *
 * see lesson-5
 *
 * Lesson-6 note: in case of a function definition, in contrast with lesson-5 we do not
 * create a function directly, but instead *convert it to lambda*. Then calling recursively
 * "eval" on already lambda object, we create the function. It gives us the ability to make
 * a function definition as just a *syntactic sugar* of binding a lambda to a variable.
 */
function evalDefinition(expression, environment) {
  return defineVariable(
    getDefinitionName(expression),
    // calculated definition value; getDefinitionValue may return
    // a lambda as a result of transformation of the function definition; then "evaluate"
    // already creates a function from it: FunctionDefiniton -> evaluate(["lambda", ...]) -> ["function"]
    evaluate(getDefinitionValue(expression), environment),
    environment
  );
}

// see lesson-5
function evalAssignment(expression, environment) {
  return setVariableValue(
    getAssignmentName(expression),
    evaluate(getAssignmentValue(expression), environment),
    environment
  );
}

// see lesson-5
function applyBuiltInFunction(procedure, args) {
  return procedure.apply(null, args);
}

/**
 * applyUserDefinedFunction
 * @param {FunctionObject} procedure
 * @param {Array} arguments
 * Just a wrapper over the evalSequence from lesson-5
 */
function applyUserDefinedFunction(procedure, arguments) {
  return evalSequence(
    getFunctionBody(procedure), // the body is the sequence
    extendEnvironment( // environment to eval
      getFunctionParameters(procedure), // parameter names
      arguments, // values of passed arguments
      // the main part of this lesson: we extend not just the global
      // environment (as it was in lesson-5), but in general the parent
      // environment which we save at function creation
      procedure.environment
    )
  )
}

// --- Sequences ---

// see lesson-5
function evalSequence(expressions, environment) {
  var returnResult;
  expressions.forEach(function (expression) {
    returnResult = evaluate(expression, environment);
  });
  return returnResult;
}

// see lesson-5
function getDefinitionName(expression) {
  if (isVariable(expression[1]))
    return expression[1];

  // else name of a function
  return expression[1][0];

}

/**
 * getDefinitionValue
 * @param {Expression} expression
 *
 * This function is also generic in respect of getting the value
 * of defining entity. It can be either a simple value, or a function.
 *
 * ["define", "x", 10] -> 10, a value of a simple variable
 * ["define", ["alert", "msg"], <body>] -> converts a function
 * definition to a *lambda*: ["lambda", ["msg"], <body>]
 */
function getDefinitionValue(expression) {

  // a simple variable
  if (isVariable(expression[1]))
    return expression[2];

  // else, it's the definition of a function,
  // ["define", [<name>, arg1, arg2, ...], <body>],

  // we separate parameters (first element is the
  // function name, so we slice to get the parameter names)
  var parameters = expression[1].slice(1);

  // and the body
  var body = expression.slice(2);

  // finally we return newly created lambda
  // which later is converted to function object
  return makeLambda(parameters, body);

}

// see lesson-5
function getAssignmentValue(expression) {
  return expression[2];
}

// see lesson-5
function getAssignmentName(expression) {
  return expression[1];
}

// helpers for applications (function calls)

// see lesson-5
function getOperator(expression) {
  return expression[0];
}

// see lesson-5
function getArguments(expression) {
  return expression.slice(1);
}

// see lesson-5
function getArgumentValues(expressions, environment) {
  return expressions.map(function (argument) {
    return evaluate(argument, environment);
  });
}

// -- Setup the global environment ---

// helper function to extend an object
function extendJSObject(object, other) {
  for (var k in other) if (other.hasOwnProperty(k)) {
    object[k] = other[k];
  }
}

// extend "TheGlobalEnvironment" with initial bindings
extendJSObject(TheGlobalEnvironment, {

  // see lesson-5
  "+": function (/*arguments*/) {
    return [].reduce.call(arguments, function (a, b) {
      return a + b;
    });
  },
  // see lesson-5
  "*": function (/*arguments*/) {
    return [].reduce.call(arguments, function (a, b) {
      return a * b;
    });
  },

  // etc, see lesson-5 and extend the global environment
  // with any own built-in bindings as you wish

  // other functions
  "print": function (/*arguments*/) {
    return console.log.apply(console, arguments);
  }

});

// OK, let's test our interpreter.

// dependencies for tests
load("notes/note-2.js"); // (s-expressions to AST parser)

// test lambdas, create a "square" function
evaluate(parse("(define square-lambda (lambda (x) (* x x)))"));
console.log("(square-lambda 2):", (evaluate(parse("(square-lambda 2)")))); // 4

// create a lambda and immitiately call it
console.log("((lambda (x) (* x x)) 2):", (evaluate(parse("((lambda (x) (* x x)) 2)")))); // 4

// define a function as a sugar of a lambda
evaluate(parse("(define (square-fn x) (* x x))"));
console.log("(square-fn 2):", (evaluate(parse("(square-fn 2)")))); // 4

// test blocks and inner functions (closures)
evaluate(parse(
  "(begin" + // a block with 3 actions

  "    (define (get-logger level)" + // global function
  "        (define x (+ level 100))" + // local var
  "        (define (log data)" + // local function which is returned and closures "level" and "x"
  "                (print x level data)))" +

  "    (define log (get-logger 10))" + // function "log" which is the result of calling "get-logger"

  "    (log 'hello)" + // 110, 10, 'hello
  ")" // end block
));

// Exercises:
//
// 1. Experiment with closures in our language in the OOP aspect. Create a "Point" constructor
//    which accepts "x" and "y" parameters and returns a new point *instance*.
//    The instance may return and change its state variables.
//
// 2. Implement conditional if-expression:
//
//    (if <predicate>
//        <consequence>
//        <alternate>)
//
//    If <predicate> evaluates to true, then execute <consequence>, else <alternate>.
//    Example:
//
//    (if (> x 5)
//        (print 'x-is-grater-than-5)
//        (print 'x-is-less-than-5))
//
//  3. Implement "map" and "filter" higher-order functions to work with lists. Use recursion
//     to traverse a list and "first" and "rest" functions for working with lists from note-3.
//     To stop the recursion, implement a "null?" predicate. Example of usage:
//
//     (map (lambda (x) (* x x)) ; pass anonymous function to "map" function
//          (list 1 2 3 4))      ; and map the list to (list 1 4 9 16)


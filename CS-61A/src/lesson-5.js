/*
 * Essentials of interpretation.
 * by Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 *
 * Lesson 5. Simple user-defined functions.
 *
 * MIT Style License.
 *
 * In this lesson we continue implementation of our interpreter with
 * environments which we started in lesson-4.
 *
 * Note: we use the complete source of lesson-4 here, just
 * marking old parts with "see lesson-4" comment. All new parts of
 * this lesson-5 in contrast have detailed descriptions.
 *
 * Dependencies:
 *   - lesson-4
 *   - parser from note-2: s-expressions to AST (for test examples)
 *
 * As we noted in lesson-4, we separate functions on *built-in* (i.e. native) which
 * are implemented directly in JavaScript, and also *user-defined (i.e. compound)
 * functions* which are created manually by a user at runtime, already in *our* language.
 *
 * In lesson-4 we've implemented the first type of functions -- built-ins. In this
 * lesson we tackle with user-defined functions, which are just *combined sequences
 * of other expressions*.
 *
 * Our function definition will be made with the same command "define" which we use
 * for definition of simple variables. The format of the "define" command will be the following:
 *
 *   - Variables: (define <variable-name> <value>) -- defines a variable
 *
 *   Example: (define x 10)
 *
 *   - Functions: (define (<function-name>, <arg1>, <arg2>, ...) <function-body>),

 *   where <function-body> is a sequence of expressions.
 *
 *   Example:
 *
 *     (define (calculate x y)
 *             (define local-var 100)
 *             (+ x y local-var))
 *
 * Also, since user-defined functions provides own scopes for binding of parameters and
 * local variables, we introduce operation of *assignment*, which in contrast with the
 * definition may either update a *local* variable, or a variable from some *parent* environment.
 *
 * We start with extending of our main "evaluate" function.
 *
 */

// dependencies (s-expressions to AST parser)
// load("notes/note-2.js"); // or require("./notes/note-2.js")

/**
 * evaluate
 * @param {Expression} expression
 * @param {Environment} environment
 *
 * see lesson-4
 */
function evaluate(expression, environment) {

  // see lesson-4
  environment || (environment = TheGlobalEnvironment);

  // see lesson-4
  if (isSelfEvaluating(expression))
    return expression;

  // see lesson-4
  if (isVariable(expression))
    return lookupVariableValue(expression, environment);

  // see lesson-4
  if (isDefinition(expression))
    // Lesson-5 note: besides the definition of variables from lesson-4,
    // here use `define` construct also to create functions (see below)
    return evalDefinition(expression, environment);

  // An assignment the same as definition of a variable must recursively
  // call "eval" to compute the new value to be associated with the variable.
  // The environment must be modified to change the binding of the variable.
  // However, in contrast with the definition, assignment can modify a
  // variable from some *parent* environment (the global environment in this version
  // of interpreter) in case if a variable is not defined in the local scope.
  if (isAssignment(expression))
    return evalAssignment(expression, environment);

  // see lesson-4
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
 * "apply" takes two arguments, a procedure and a list of arguments to which the
 * procedure should be applied. "apply" classifies procedures into two kinds:
 * it calls *applyBuiltInFunction* to apply built-ins; it applies user-defined functions
 * by *sequentially evaluating the expressions* that make up the body of the functions.
 *
 * In this lesson we support *only global functions*, so the environment for the evaluation
 * of the body of a user-defined function is constructed by extending the *global environment*
 * to include new environment that *binds the parameters* of the procedure to the arguments
 * to which the procedure is to be applied.
 */
function apply(procedure, arguments) {

  // see lesson-4
  if (isBuiltInFunction(procedure))
    return applyBuiltInFunction(procedure, arguments);

  // if it's a user-defined function
  if (isUserDefinedFunction(procedure))

    // then we execute evaluation of the sequence of expressions...
    return evalSequence(

      // ...and this sequence is the function's *body*, so we
      // separate it from the function object (the structure
      // of a function object is described below) Example:
      // F: ["function", <parameters>, <body>],
      // getFunctionBody(F) -> <body>
      getFunctionBody(procedure),

      // For function execution we also need to create a *new fresh environment*
      // and bind formal parameters of the function to values of passed arguments.
      // This new *activation environment* has the global environment as its *parent*
      // (in order to refer global variables). That is, the resulting environment to
      // evaluate the user-defined function is a *chain* of two environments:
      // Activation environment and TheGlobalEnvironment. If a variable is not found
      // in the function's environment, we continue look-up in the global environment.
      extendEnvironment(

        // parameter names of the function, e.g.
        // getFunctionParameters(F) -> <parameters>
        getFunctionParameters(procedure),

        // values of passed arguments
        arguments,

        // and the parent environment (in this version -- only the global environment)
        TheGlobalEnvironment
      )
    )

}

// -- Predicate functions ---

// see lesson-4
function isSelfEvaluating(expression) {
  return !isNaN(expression) ||
    (typeof expression == "string" && expression[0] == "'");
}

// see lesson-4
function isVariable(expression) {
  return /^([a-z-A-Z0-9_$+*/\-])+$/.test(expression);
}

// see lesson-4
function isDefinition(expression) {
  return isTaggedList("define", expression);
}

/**
 * isAssignment
 * @param {Expression} expression
 * Tests whether the expression is assignment. We use
 * the same "isTaggedList" from the lesson-1 for that.
 * Assignments has "set!" as their tag (exclamation mark
 * signals that the method mutates the value)
 */
function isAssignment(expression) {
  return isTaggedList("set!", expression);
}

// see lesson-4
function isApplication(exp) {
  return Array.isArray(exp);
}

// see lesson-4
function isBuiltInFunction(procedure) {
  return typeof procedure == "function";
}

/**
 * isUserDefinedFunction
 * @param {String} function name
 *
 * User defined functions has a form:
 * ["function", <parameters>, <body>]
 * So to test whether it's a user-defined procedure,
 * we just test whether its tag is "function".
 *
 * Note: function's structure does not contain the name
 * of the function, because the name it's a name of
 * of a binding in the environment to which the function
 * is bound. This leads us to an ability to have anonymous
 * functions (we call them *lambda*s), which we'll be
 * introduce later.
 */
function isUserDefinedFunction(procedure) {
  return isTaggedList("function", procedure);
}

// see lesson-4, lesson-1
function isTaggedList(tag, exp) {
  return exp[0] == tag;
}

// --- Representing user-defined functions ---

/**
 * makeFunction
 * @param {Array} parameters -- list of parameter names
 * @param {Array} body -- list of expressions (function body)
 *
 * User-defined (compound) procedures in this version of our interpreter are
 * constructed from parameters and procedure bodies. Later, in the next lessons
 * when we'll implement static scope, inner functions and *closure* in general,
 * user-defined functions will have also third component -- saved lexical,
 * environment, but for now only parameters and bodies.
 */
function makeFunction(parameters, body) {
  return ["function", parameters, body];
}


/**
 * getFunctionBody
 * @param {FuncitonObject} procedure
 * Returns the body of function object (list of expressions).
 * Example: ["function", ["x", "y"], [["+", "x", "y"]]] -> [["+", "x", "y"]]
 */
function getFunctionBody(procedure) {
  return procedure[2];
}

/**
 * getFunctionParameters
 * @param {FuncitonObject} procedure
 * Returns parameter names of a function object.
 * Example: ["function", ["x", "y"], ["+", "x", "y"]] -> ["x", "y"]
 */
function getFunctionParameters(procedure) {
  return procedure[1];
}

// -- Working with environments ---

/**
 * @property {Object} TheGlobalEnvironment
 * see lesson-4
 */
var TheGlobalEnvironment = {};
TheGlobalEnvironment.toString = function () { return "[object TheGlobalEnvironment]" };

/**
 * extendEnvironment
 * @param {Array} variables - names of bindings
 * @param {Array} values - values of bindings
 * @param {Environment} parentEnvironment - outer frame
 *
 * Creates a new environment by extending the parent environment frame.
 * We use inheritance of JS objects to provide *environment chains* which
 * are implemented via the prototype chains.
 *
 * Example:
 *
 * var parentEnvironment = Object.create(null);
 * parentEnvironment.x = 10;
 *
 * var innerEnvironment = Object.create(parentEnvironment);
 * innerEnvironment.y = 20;
 *
 * Environment chain: {y: 20} -> {x: 10} -> null
 *
 */
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

/**
 * lookupVariableValue
 * @param {String} variable
 * @param {Environment} environment
 * Returns the value that is bound to the symbol <variable> in the passed
 * environment, or signals an error if the variable is not defined.
 *
 * Lesson-5 note: since we use JS objects with inheritance to form
 * environment chains, then we can use simple `in` operation to test
 * whether a property is present in the prototype chain (that is, whether
 * the variable is bound and exists in some environment frame in this
 * environment chain). If it exists, then simple reading of the property
 * returns needed value from needed frame. So the code of this function is
 * the same as in lesson-4.
 *
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
 *
 * Definition either creates a new binding in the environment
 * or changes its value if it exists.
 *
 * Lesson-5 note: a definition should always be applied for the
 * current (first) frame in the environment chain (example: when we
 * define a variable inside a function in JS, we define it locally
 * for this function, i.e. for the current environment). So again,
 * the code of this function is the same as in lesson-4.
 */
function defineVariable(variable, value, environment) {
  return environment[variable] = value;
}

/**
 * setVariableValue
 * @param {String} variable
 * @param {Variant} value
 * @param {Environment} environment
 *
 * This function is similar to the "defineVariable", however it
 * in contrast with the definition should consider the case, that
 * a variable may exist in some parent environment, and in such a case
 * exactly the binding of the parent environment should be updated.
 *
 */
function setVariableValue(variable, value, environment) {

  // if there is no such binding in the environment chain, exit
  if (!(variable in environment))
    throw ReferenceError('"' + variable + '" is not defined');

  // else we should find the exact environment frame in which
  // the variable is defined. We go through the environment chain
  // looking for the frame
  do {
    // if found the frame, exit
    if (environment.hasOwnProperty(variable)) break;
    // else continue to search in parent environments
  } while (environment = Object.getPrototypeOf(environment));

  // and change the value of a binding
  // in needed environment frame
  return environment[variable] = value;

}

/**
 * evalDefinition
 * @param {Expression} expression
 * @param {Environment} environment
 *
 * Handles definitions of variables. It calls "evaluate" to find the value
 * to be assigned and transmits the variable and the resulting value to
 * "defineVariable" to be installed in the environment.
 *
 * Lesson-5 note: we use definition for both: defining simple variables
 * and functions. The main part which is responsible for this is the
 * "getVariableValue" function which returns evaluated value which can be
 * either a function or another data. "getVariableName" name also separates
 * the definition of a variable and a function and returns corrent name of a binding.
 */
function evalDefinition(expression, environment) {

  // we extract the definition value (either of a variable or a function)
  // getVariableValue(["define", "x", "y"]) -> "y", for variable
  // getVariableValue(["define", ["alert", "msg"], <body>]]) -> new function object, for functions
  var definitionValue = getDefinitionValue(expression);

  // in case if the definition value is a function
  // we should not call evaluate recursively since we already created
  // a new function object inside the getDefinitionValue(...);
  // but for variables we should call "evaluate" to get the values
  // of possible variables: getDefinitionValue(...) -> "x" -> evaluate("x") -> 10
  if (!isUserDefinedFunction(definitionValue))
    definitionValue = evaluate(definitionValue);

  return defineVariable(

    // separate the variable name from expression, e.g.
    // getVariableName(["define", "x", 10]) -> "x", for variable
    // getVariableName(["define", ["alert", "msg"], <body>]) -> "alert", for function
    getDefinitionName(expression),

    // calculated definition value
    definitionValue,

    // and define the binding in the environment
    environment

  );
}

/**
 * evalAssignment
 * @param {Expression} expression
 * @param {Environment} environment
 *
 * The function is very similar to evalDefinition
 * See: "evalDefinition"
 */
function evalAssignment(expression, environment) {
  return setVariableValue(
    // get again the name (of a variable or a function)
    getAssignmentName(expression),
    // and evaluate the value which should be assigned to the name
    evaluate(getAssignmentValue(expression), environment),
    // and all this done again in the passed environment
    environment
  );
}

// see lesson-4
function applyBuiltInFunction(procedure, args) {
  return procedure.apply(null, args);
}

// --- Sequences ---

/**
 * evalSequence
 * @param {Array} expressions - list of expressions
 * @param {Environment} environment
 *
 * "evalSequence" is used by "apply" to evaluate the sequence of expressions in a
 * function body. It takes as arguments a sequence of expressions and an environment,
 * and evaluates the expressions in the order in which they occur. The value returned
 * is the value of the final expression.
 */
function evalSequence(expressions, environment) {

  // stores the result of currently
  // evaluated expression
  var returnResult;

  // evalute the function's body sequentially -- expression by expression
  expressions.forEach(function (expression) {
    returnResult = evaluate(expression, environment);
  });

  // and finaly return the last evaluated expression
  return returnResult;

}

/**
 * getDefinitionName
 * @param {Expression} expression
 *
 * This is a generic funciton to get the name of a binding.
 * The binding values can be either simple variables or functions.
 * The function analyzes which form it deals and correctly separates
 * the name of a "variable" (of a data).
 *
 * Examples:
 *
 * ["define", "x", 10] -> "x", a name of a simple variable
 * ["define", ["alert", "msg"], <body>] -> "alert", a name of a function
 *
 */
function getDefinitionName(expression) {

  // a simple variable, return <name>:
  // ["define", <name>, <value>]
  if (isVariable(expression[1]))
    return expression[1];

  // else, it's the definition of a function,
  // ["define", [<name>, arg1, arg2, ...], <body>]
  return expression[1][0];

}

/**
 * getDefinitionValue
 * @param {Expression} expression
 *
 * This function is also generic in respect of getting the value
 * of defining entity. It can be either a simple value, or a function.
 *
 * Examples:
 *
 * ["define", "x", 10] -> 10, a value of a simple variable
 * ["define", ["alert", "msg"], <body>] -> create new function object
 */
function getDefinitionValue(expression) {

  // a simple variable, return <value>:
  // ["define", <name>, <value>]
  if (isVariable(expression[1]))
    return expression[2];

  // else, it's the definition of a function,
  // ["define", [<name>, arg1, arg2, ...], <body>],

  // we separate parameters (first element is the
  // function name, so we slice to get the parameter names)
  var parameters = expression[1].slice(1);

  // and the body
  var body = expression.slice(2);

  // finally we return newly created function object
  return makeFunction(parameters, body);

}

/**
 * getAssignmentValue
 * @param {Expression} expression
 *
 * The function is similar to "getDefinitionValue", but
 * it's simpler in that it should not consider cases of
 * setting values of variables or function, since the
 * assignment has the form: ["set", <name>, <value>].
 */
function getAssignmentValue(expression) {
  return expression[2];
}

/**
 * getAssignmentName
 * @param {Expression} expression
 *
 * The function is similar to "getDefinitionName", but
 * it's simpler in that it should not consider cases of
 * setting values of variables or function, since the
 * assignment has the form: ["set", <name>, <value>]
 */
function getAssignmentName(expression) {
  return expression[1];
}

// helpers for applications (function calls)

// see lesson-4
function getOperator(expression) {
  return expression[0];
}

// see lesson-4
function getArguments(expression) {
  return expression.slice(1);
}

// see lesson-4
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

  // see lesson-4
  "+": function (/*arguments*/) {
    return [].reduce.call(arguments, function(a, b) {
      return a + b;
    });
  },
  // see lesson-4
  "*": function (/*arguments*/) {
    return [].reduce.call(arguments, function(a, b) {
      return a * b;
    });
  },

  // etc, see lesson-4 and extend the global environment
  // with any own built-in bindings as you wish

  // other functions
  "print": function (/*arguments*/) {
    return console.log.apply(console, arguments);
  }

});

// OK, let's test our interpreter.

// define some variables in the global environment
evaluate(parse("(define x 10)")); // x: 10
evaluate(parse("(define y 20)")); // y: 20

// test that we have them
console.log("x:", evaluate("x")); // 10
console.log("y:", evaluate("y")); // 20

// test built-in functions
console.log("(+ (* x y) 30):", evaluate(parse("(+ (* x y) 30)"))); // 230
evaluate(parse("(print 'hello 'world x)")); // 'hello 'world 10

// define a function
evaluate(parse("(define (sum x y) (+ x y))")); // function "sum"
// call the function
console.log("(sum 10 y):", evaluate(parse("(sum 10 y)"))); // 30

// define another function which modifies outer variable
evaluate(parse(
  "(define (set-x value) " + // function "set-x" with parameter "value"
    "(define local-var 10) " + // define local variable inside the function
    "(set! x (+ local-var value)))" // modify outer var "x"
));

// call the function
evaluate(parse("(set-x 100)"));
// test modified variable
console.log("x:", evaluate("x")); // 110

// Exercises:
//
// 1. Implement *blocks*. Blocks differ from user-defined functions only in
//    that they have no parameters and therefore do not create a new scope of evaluation
//    to bind these parameters. In all other properties, blocks are also just
//    *sequences of expressions*.
//
//    Structure:
//
//    (begin <sequence-of-expressions>)
//
//    Example:
//
//    (begin (define x 10)
//           (define y 20)
//           (+ x y))
//
//    "eval" should the same as in functions evaluate sequence of these three expressions
//    and return as the result the value of the final evaluated expression, i.e. 30
//
// 2. Implement *anonymous function expressions* (lambdas) which can be called directly
//    without definition and destroyed right after evaluation (only if they are not
//    assigned to some variable)
//
//    Structure:
//
//    (lambda (<arg1>, <arg2>, ...) <body>)

//    where <body> is also a sequence of expressions.
//
//    Example:
//
//    (lambda (x) (* x x)) -- creates new anonymous function
//    ((lambda (x) (* x x)) 2) -- 4, creates a function and directly apply it
//
// 3. Make a function definition described in this lesson as a *syntactic sugar* of defining
//    a varible with a value of a lambda.
//
//    Example:
//
//    (define (square x)
//            (* x x))
//
//    Should be a "sugar" of:
//
//    (define square (lambda (x) (* x x)))
//
//    With both definitions the resulting procedure should be called as (square 2) -> 4
//

/*
 * Essentials of interpretation.
 * by Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 *
 * Lesson 7. Derived expressions ("Syntactic sugar").
 *
 * MIT Style License.
 *
 * In this lesson we tackle with *derived expressions*. Such expressions are called so because
 * they are implemented with help of already existing expressions in the language. This is
 * why they are also called often as a "syntactic sugar".
 *
 * The main goal of a "syntactic sugar" is to allow a programmer to write a code more convenient
 * (often it's just mean -- shorter) and more syntactically elegant, that is avoiding a so-called
 * "syntactic noise" (though, we have to notice that often such a treatment can be personally relative).
 *
 * Many langauges provide derived expressions. E.g. "switch-case" which is a sugar for nested
 * "if-else" clauses. In this lesson we'll work exactly with this type of expression.
 *
 * 1. If-expression
 *
 * First we introduce "if-expression" which have the form:
 *
 * (if <condition>
 *     <then-consequent-actions>
 *     <else-alternative-actions>)
 *
 * I.e. quite a casual if-expression which we saw in many other languages: if <condition> evaluates to "true", then
 * we execute <then-consequent-actions>, else we execute (optional) <else-alternative-actions>. Example:
 *
 * (if (null? x)
 *     (begin
 *            (print 'x-is-null)
 *            (set! x 10))
 *      (print 'OK))
 *
 * which basically says: if "x" variable is null, then print the message about it and set "x" to 10, else
 * just print "OK".
 *
 * 2. Cond-expression
 *
 * Having "if", we may easily implement "cond-expression", or a *case-analysis* expressions (it's called "switch-case"
 * in some languages). It has a form:
 *
 * (cond (<condition-1> <consequent-1>)
 *       (<condition-2> <consequent-2>)
 *       ...
 *       (<condition-n> <consequent-n>)
 *       (else <alternative-expression>))
 *
 * For example, the following code:
 *
 * (cond ((> x 0) x)
 *       ((= x 0) (print 'zero) 0)
 *       (else (- x)))
 *
 * can be reduced (or "desugared") into the following nested "if"s:
 *
 * (if (> x 0)
 *     x
 *     (if (= x 0)
 *         (begin (print 'zero)
 *                0)
 *         (- x)))
 *
 * Dependencies:
 *   - lesson-6
 *   - parser from note-2: s-expressions to AST (for test examples)
 *
 * And again we start with extending of our main "evaluate" function.
 *
 */

/**
 * evaluate
 * @param {Expression} expression
 * @param {Environment} environment
 *
 * see lesson-6
 */
function evaluate(expression, environment) {

  // see lesson-6
  environment || (environment = TheGlobalEnvironment);

  // see lesson-6
  if (isSelfEvaluating(expression))
    return expression;

  // see lesson-6
  if (isVariable(expression))
    return lookupVariableValue(expression, environment);

  // see lesson-6
  if (isDefinition(expression))
    return evalDefinition(expression, environment);

  // see lesson-6
  if (isAssignment(expression))
    return evalAssignment(expression, environment);

  // see lesson-6
  if (isLambda(expression))
    return makeFunction(
      getLambdaParameters(expression),
      getLambdaBody(expression),
      environment
    );

  // see lesson-6
  if (isBlock(expression))
    return evalSequence(
      getBlockActions(expression),
      environment
    );

  // if it's "if" expression, then
  // eval it in our environment
  if (isIf(expression))
    return evalIf(expression, environment);

  // if it's a "cond"-expression, we *transform* it
  // into the nested "if" expressions and evaluate it
  if (isCond(expression))
    return evaluate(
      condToIf(expression),
      environment
    );

  // see lesson-6
  if (isApplication(expression))
    return apply(
      evaluate(getOperator(expression), environment),
      getArgumentValues(getArguments(expression), environment)
    );

}

// see lesson-6
function apply(procedure, arguments) {
  if (isBuiltInFunction(procedure))
    return applyBuiltInFunction(procedure, arguments);

  if (isUserDefinedFunction(procedure))
    return applyUserDefinedFunction(procedure, arguments);
}

// -- Predicate functions ---

// see lesson-6
function isSelfEvaluating(expression) {
  return !isNaN(expression) ||
    (typeof expression == "string" && expression[0] == "'");
}

// see lesson-6
function isVariable(expression) {
  return /^([a-z-A-Z0-9_$+*/\-?!=><])+$/.test(expression);
}

// see lesson-6
function isDefinition(expression) {
  return isTaggedList("define", expression);
}

// see lesson-6
function isAssignment(expression) {
  return isTaggedList("set!", expression);
}

// see lesson-6
function isApplication(exp) {
  return Array.isArray(exp);
}

// see lesson-6
function isBuiltInFunction(procedure) {
  return typeof procedure == "function";
}

// see lesson-6
function isUserDefinedFunction(procedure) {
  return isTaggedList("function", procedure);
}

// see lesson-6
function isLambda(expression) {
  return isTaggedList("lambda", expression);
}

// see lesson-6
function isBlock(expression) {
  return isTaggedList("begin", expression);
}

/**
 * isIf
 * @param {Expression} expression
 * Tests whether an expression is the "if" expression
 * (has "if" as a type tag)
 */
function isIf(expression) {
  return isTaggedList("if", expression);
}

/**
 * getIfPredicate
 * @param {Expression} ifExpression
 * This getter separates the condition part (predicate)
 * of an if-expression. Example:
 * ["if", [">", "x", 5], <then-actions>, <else-actions>],
 * the result is [">", "x", 5]
 */
function getIfPredicate(ifExpression) {
  return ifExpression[1];
}

/**
 * getIfConsequent
 * @param {Expression} ifExpression
 * This function separates the consequent part (then-action)
 * of an if-expression. Example:
 * ["if", <predicate>, ["print", 10], <else-actions>],
 * the result is["print", 10]
 */
function getIfConsequent(ifExpression) {
  return ifExpression[2];
}

/**
 * getIfConsequent
 * @param {Expression} ifExpression
 * The getter separates the alternative part (else-action)
 * of an if-expression. Example:
 * ["if", <predicate>, <consequent-actions>, ["print", 20]],
 * the result is ["print", 20]. Note: this part is *optional*,
 * in this case the false value is returned
 */
function getIfAlternative(ifExpression) {
  return ifExpression[3] || false;
}

/**
 * evalIf
 * @param {Expression} ifExpression
 * @param {Environment} environment
 * Executes either consequent or alternative part of an
 * if-expression depending on the boolean value of the predicate part.
 * We should call "evaluate" recursively to get the value of predicate.
 */
function evalIf(ifExpression, environment) {

  // if the conditions (predicate) evals to true, then
  // execute the consequent block
  if (evaluate(getIfPredicate(ifExpression), environment))
    return evaluate(getIfConsequent(ifExpression), environment);

  // else, execute the alternative block
  return evaluate(getIfAlternative(ifExpression), environment);

}

/**
 * isCond
 * @param {Expression} expression
 * Tests whether an expression is the "cond" expression
 * (has "cond" as a type tag)
 */
function isCond(expression) {
  return isTaggedList("cond", expression);
}

// -- Cond transformation ---

// We include syntax procedures that extract the parts of a cond expression, and a procedure
// "condToIf" that transforms "cond" expressions into "if" expressions. A case analysis begins
// with cond and has a list of predicate-action clauses. A clause is an else clause if its
// predicate is the symbol else.

/**
 * condToIf
 * @param {Expression} condExpression
 * Transforms "cond" into nested "if"s. We just get the clauses of
 * "cond" and *expand* into "if-else".
 */
function condToIf(condExpression) {
  return expandCondClauses(getCondClauses(condExpression));
}

/**
 * getCondClauses
 * @param {Expresison} condExpression
 * Returns the clauses part of a "cond" expression.
 * E.g.: ["cond", [[">", "x", 5], "x"], ["else", 5]]
 * returns [[[">", "x", 5], "x"], ["else", 5]]
 */
function getCondClauses(condExpression) {
  return condExpression.slice(1);
}

/**
 * expandCondClauses
 * @param {Array} condClauses
 * Transforms "cond" clauses (retrieved by "getCondClauses")
 * into the nested "if" expressions. Each clause consists of
 * a *predicate* part (condition) and *actions* part. There can
 * special "else" clause, which should be last in the "condClauses" array.
 */
function expandCondClauses(condClauses) {

  // if no clauses, we've done
  if (condClauses.length == 0)
    return false;

  // we separate first and rest clauses
  var first = condClauses[0];
  var rest = condClauses.slice(1);

  // if it's "else" clause, then we have to check
  // that it's the last clause the list
  if (isCondElseClause(first)) {

    if (rest.length != 0) throw "else clause isn't last in the cond: " + condClauses

    // else we return the actions wrapping them into "begin"
    // via "sequenceExpression" if nessesary
    return sequenceExpression(getCondActions(first));
  }

  // else it's not "else" clause; then we just make
  // and new "if" expression specifying it's alternative part
  // recursively again to "expandCondClauses" passing rest clauses
  return makeIf(
    getCondPredicate(first), // separate predicate
    sequenceExpression(getCondActions(first)), // and actions
    expandCondClauses(rest) // NOTICE: recursive building of nested "else" part
  );

}

// "cond" testers and getters

/**
 * isCondElseClause
 * @param {Expresison} condClause
 * Tests whether a "cond" clause is the "else" clause
 */
function isCondElseClause(condClause) {
  return getCondPredicate(condClause) == "else";
}

/**
 * getCondPredicate
 * @param {expresison} condClause
 * Separates predicate (condition) part from the condClause:
 * [[">", "x", 5], "x"] -> [">", "x", 5]
 */
function getCondPredicate(condClause) {
  return condClause[0];
}

/**
 * condActions
 * @param {expresison} condClause
 * Separates actions part from the condClause:
 * [[">", "x", 5], "x"] -> ["x"]
 */
function getCondActions(condClause) {
  return condClause.slice(1);
}

/**
 * sequenceExpression
 * @param {Array} expressions
 * Wraps (if required) an array of expressions into "begin"
 * node (block). If the array contains only one expression,
 * it's just returned -- there is no need to wrap it.
 */
function sequenceExpression(expressions) {

  if (expressions.length == 0)
    return null;

  // the only one expression
  if (expressions.length == 1)
    return expressions[0];

  // else we wrapp it with "begin" expression, making
  // a single block expression with the actions
  return makeBegin(expressions);

}

/**
 * makeBegin
 * @param {Array} expresisons
 * Constructs a "begin" (block) node.
 */
function makeBegin(expresisons) {
  return ["begin", expresisons];
}

/**
 * makeIf
 * @param {Expresison} predicate
 * @param {Expresison} consequent
 * @param {Expresison} alternative
 * Creates an "if" node.
 */
function makeIf(predicate, consequent, alternative) {
  return ["if", predicate, consequent, alternative];
}

// see lesson-6, lesson-1
function isTaggedList(tag, expresison) {
  return expresison[0] == tag;
}

// see lesson-6
function makeFunction(parameters, body, parentEnvironment) {
  // create a function
  var procedure = ["function", parameters, body];
  // and *closure* the lexical environment
  procedure.environment = parentEnvironment;
  return procedure;
}

// see lesson-6
function getFunctionBody(procedure) {
  return procedure[2];
}

// see lesson-6
function getFunctionParameters(procedure) {
  return procedure[1];
}

// see lesson-6
function makeLambda(parameters, body) {
  return ["lambda", parameters].concat(body);
}

// see lesson-6
function getLambdaBody(lambda) {
  return lambda.slice(2);
}

// see lesson-6
function getLambdaParameters(lambda) {
  return lambda[1];
}

// see lesson-6
function getBlockActions(block) {
  return block.slice(1);
}

// -- Working with environments ---

/**
 * @property {Object} TheGlobalEnvironment
 * see lesson-6
 */
var TheGlobalEnvironment = {};
TheGlobalEnvironment.toString = function () { return "[object TheGlobalEnvironment]" };

// see lesson-6
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

// see lesson-6
function lookupVariableValue(variable, environment) {
  if (variable in environment) {
    return environment[variable];
  }
  throw ReferenceError('"' + variable + '" is not defined');
}

// see lesson-6
function defineVariable(variable, value, environment) {
  return environment[variable] = value;
}

// see lesson-6
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

// see lesson-6
function evalDefinition(expression, environment) {
  return defineVariable(
    getDefinitionName(expression),
    evaluate(getDefinitionValue(expression), environment),
    environment
  );
}

// see lesson-6
function evalAssignment(expression, environment) {
  return setVariableValue(
    getAssignmentName(expression),
    evaluate(getAssignmentValue(expression), environment),
    environment
  );
}

// see lesson-6
function applyBuiltInFunction(procedure, args) {
  return procedure.apply(null, args);
}

// see lesson-6
function applyUserDefinedFunction(procedure, arguments) {
  return evalSequence(
    getFunctionBody(procedure),
    extendEnvironment(
      getFunctionParameters(procedure),
      arguments,
      procedure.environment
    )
  )
}

// --- Sequences ---

// see lesson-6
function evalSequence(expressions, environment) {
  var returnResult;
  expressions.forEach(function (expression) {
    returnResult = evaluate(expression, environment);
  });
  return returnResult;
}

// see lesson-6
function getDefinitionName(expression) {
  if (isVariable(expression[1]))
    return expression[1];

  // else name of a function
  return expression[1][0];

}

// see lesson-6
function getDefinitionValue(expression) {
  // a simple variable
  if (isVariable(expression[1]))
    return expression[2];

  // else, it's the definition of a function,
  var parameters = expression[1].slice(1);
  var body = expression.slice(2);
  return makeLambda(parameters, body);
}

// see lesson-6
function getAssignmentValue(expression) {
  return expression[2];
}

// see lesson-6
function getAssignmentName(expression) {
  return expression[1];
}

// helpers for applications (function calls)

// see lesson-6
function getOperator(expression) {
  return expression[0];
}

// see lesson-6
function getArguments(expression) {
  return expression.slice(1);
}

// see lesson-6
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

  // see lesson-6

  ">": function (a, b) { return a > b; }, // tests, whether "a" is greater than "b"

  "=": function (a, b) { return a === b; }, // tests, whether "a" equals "b"

  "null?": function (a) { return a === null; }, // tests, whether a value is null

  "null": null, // null constant,

  "+": function (/*arguments*/) {
    return [].reduce.call(arguments, function(a, b) {
      return a + b;
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

  // other functions
  "print": function (/*arguments*/) {
    return console.log.apply(console, arguments);
  }

  // etc, see lesson-6 and extend the global environment
  // with any own built-in bindings as you wish

});

// OK, let's test our interpreter.

// dependencies for tests
load("notes/note-2.js"); // (s-expressions to AST parser)

// define "x" variable with the "null" value
evaluate(parse("(define x null)"));
evaluate(parse("(print x)")); // null

// test simple if expression
evaluate(parse(
  "(if (null? x)" +
  "    (begin" +
  "        (print 'x-is-null)" +
  "        (set! x 10))" +
  "    (print 'OK))"
));

evaluate(parse("(print x)")); // 10

// change "x"
evaluate(parse("(set! x -5)")); // 10
evaluate(parse("(print x)")); // 5

// test "cond" expression; returns 5: else clause -x
console.log(evaluate(parse(
  "(cond ((> x 0) x)" +
  "      ((= x 0) (print 'zero) 0)" +
  "      (else (- x)))"
)));

// Exercises:
//
// 1. Implement "let" derived expression which is a "sugar" for the immediately invoked lambda:
//
//    (let ((x 5)
//          (y 6))
//          (* x y))
//
//    Transforms into (create lambda and immidiately execute it):
//
//    ((lambda (x y) (* x y)) 5 6)
//
//    Implement "letToLambda" converter and all corresponding procedures to handle the case.
//

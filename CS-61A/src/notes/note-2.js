/**
 * Essentials of interpretation.
 * by Dmitry A. Soshnikov <dmitry.soshnikov@gmail.com>
 *
 * Note 2. S-expression to AST transformer.
 *
 * As we said in the exercise 4.2, s-expressions are
 * very similar to our AST format, however they are
 * even more simpler, since allow to ommit quotes, commas, etc.
 *
 * Examples:
 *
 * S-expression      |       AST
 * ------------------------------------
 *  (+ 1 2)          |   ["+", 1, 2]
 *  (define x 10)    |   ["define", "x", 10]
 *  (print 'hello)   |   ["print", "'hello"]
 *
 *  etc. I.e. we see that it's almost the same syntactic
 *  constructs, just a bit "sugared".
 *
 * This note defines a "parser" of s-expressions which produces
 * on its return AST format of an expression. In the next lessons
 * we'll use exactly s-expressions in our examples, but still
 * to work with ASTs in the interpreter.
 *
 * Dependencies for this note:
 *
 *  1. code of lesson-4
 *
 * MIT Style License
 *
 */

/**
 * parse
 * @param {String} exp
 *
 * Since s-expressions are almost the same syntactic
 * constructs as our ASTs we can even use (and will use)
 * just simple RegExp replaces to create our JS array from
 * the s-expression string.
 */
function parse(exp) {

  // handle the simplest expressions (funcitons "isVariable"
  // and "isSelfEvaluating" are defined in the lesson-4)
  if (isVariable(exp) || isSelfEvaluating(exp)) {
    return /\d+/.test(exp) ? Number(exp) : exp;
  }

  // else we analyze a complex expression
  exp = exp

    // first we clean whitespaces
    .trim()

    // then turn parens into the
    // brackets: (+ 1 x) -> [+ 1 x]
    .replace(/\(/g, "[")
    .replace(/\)/g, "]")

    // then we need to replace space-delimiters
    // with the commas: [+ 1 x] -> [+, 1, x]
    .replace(/\s+/g, ",")

    // after that we also need to quote the function,
    // operator and variable names to avoid parse
    // errors in JS, but, we should leave numbers as is:
    // [+, 1, x] -> ["+", 1, "x"]
    .replace(/([^,\[\]0-9]+?(?=(,|\])))/g, '"$1"');

  // having done this, all we have to do else
  // is just to build native JS array using native JS "eval"
  return eval(exp);

}

// tests

// simple variables and self-evaluating
console.log("10", parse("10")); // 10
console.log("x", parse("x")); // "x"
console.log("'hello", parse("'hello")); // "'hello"

// addition funciton call with two constants and variable
console.log("(+ 1 2 x):", parse("(+ 1 2 x)")); // ["+", 1, 2, "x"]

// try to evaluate
console.log("(+ 1 2):", evaluate(parse("(+ 1 2)"))); // 3

// nested
console.log("(+ (* 2 3) 1):", parse("(+ (* 2 3) 1)")); // ["+" ["*", 2, 3], 1]

// definitions
console.log("(define x 10):",  parse("(define x 10)")); // ["define", "x", 10]

// call to print function with passing string and variable
console.log("(print 'hello world)", parse("(print 'hello world)")); // ["print", "'hello", "world"]


// Exercises:
//
// 1. Suppose we don't have convenient RegExp replacements. Write own parser using either
// recursion or stack to handle sub-expressions. See note-1 with the stack implementation
// (the only difference from note-1 is that instead of direct calculations, we need only to
// create AST node and put it back to the stack).
//
// 2. Use Jison to generate automatic parser. See "misc/jison" examples or documentation
// on the official website (http://zaach.github.com/jison/).

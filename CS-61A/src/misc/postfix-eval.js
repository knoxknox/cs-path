/**
 * Postfix notation math evaluator
 * See: http://en.wikipedia.org/wiki/Reverse_Polish_notation
 *
 * See also prefix notation example:
 * https://github.com/DmitrySoshnikov/Essentials-of-interpretation/blob/master/src/notes/note-1.js
 *
 * by Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 * MIT Style License
 */

/**
 * postfixEval
 * @param {String} string
 *
 * Evaluates a simple math expression
 * in the postfix notation.
 *
 * Example:
 *   2 3 +       => 5
 *   2 3 + 5 *   => 25
 */
function postfixEval(string) {

  var stack = [];
  var ch; // current char

  for (var k = 0, length = string.length; k < length;  k++) {

    ch = string[k];

    // if it's a value, push it onto the stack
    if (/\d/.test(ch))
      stack.push(ch);

    // else if it's an operator
    else if (ch in operators) {

      var b = +stack.pop();
      var a = +stack.pop();

      var value = operators[ch](a, b);
      stack.push(value);

    }

    // else we just skip whitespaces

  }

  if (stack.length > 1)
    throw "ParseError: " + string + ", stack: " + stack;

  return stack[0];

}

// operators
var operators = {
  "+": function (a, b) { return a + b },
  "-": function (a, b) { return a - b },
  "*": function (a, b) { return a * b },
  "/": function (a, b) { return a / b }
};

// tests

console.log(postfixEval("2 3 +")); // 5
console.log(postfixEval("2 3 + 5 *")); // 25
console.log(postfixEval("5 1 2 + 4 * + 3 -")); // 14

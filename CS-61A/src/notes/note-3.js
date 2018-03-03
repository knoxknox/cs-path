/**
 * Essentials of interpretation.
 * by Dmitry A. Soshnikov <dmitry.soshnikov@gmail.com>
 *
 * Note 3. Complex data structures: pairs and lists.
 *
 * This small note is mostly not about our interpreter implementation
 * but about those complex data structures which we will use in the
 * our language.

 * This time we will cover pairs and lists. We will see how a "pair" being
 * a basic complex structure allows us to have more abstract entities such
 * as "lists" (well, "arrays" in terminology of JavaScript) -- just linking
 * pairs and "objects" -- just tracking two lists: of keys and values. Later,
 * when we'll introduce "closures", we'll see that objects can be implemented
 * using them (by the big deal, in some sense, "object" === "closure").
 *
 * We will chose the most efficient implementation for lists. Starting from
 * the simplest linked-lists, we'll replace them with just JS arrays.
 *
 * MIT Style License
 *
 */

// --- Simple pairs and lists ---

/**
 * pair
 * @param {Variant} x
 * @param {Variant} y
 *
 * A pair have two any components (which follows from its name).
 * We can use a simple array with two elements to represent a pair.
 */
function pair(x, y) {
  return [x, y];
}

/**
 * first
 * @param {Pair} pair
 *
 * And accordingly, having a pair we may get its first element...
 */
function first(pair) {
  return pair[0];
}

/**
 * rest
 * @param {Pair} pair
 *
 * ... And the second one. We specially chose terminology of "rest" --
 * it will be convenient for lists, built from pairs.
 */
function rest(pair) {
  return pair[1];
}

// Some tests

var p = pair(1, 2);
console.log("p:", p); // [1, 2]

console.log("first(p):", first(p)); // 1
console.log("rest(p):", rest(p)); // 2

// Not a big deal, but this is a fundamental abstraction unit from which
// we can build more abstract things. Let's look on "lists".

// --- Lists as chained pairs ---

// if we set first element of a pair to an value, and the second element
// to *another pair*, we'll get an interesting structure, which we call a "list":
var foo = pair(1, pair(2, null));
console.log("foo:", foo); // [1, [2, null]]

console.log("first(foo):", first(foo)); // 1
console.log("rest(foo):", rest(foo)); // [2, null]

// This is where name "rest" comes into convenient semantic usage --
// the rest of a list which is also a *list* or the null value. This abstraction
// is so powerful, that we can automate it and represent a special constructor for it.
// Let's call it the same -- "list".

/**
 * list
 * @param {Arguments} arguments object
 *
 * Creates a list from arguments by chaining pairs. Notice how "result" variable
 * (which is initially the "null" and next -- a pair) becomes recursively a *rest tail*
 * of the next chain link.
 */
function list(/* arguments */) {
  var result = null;
  for (var k = arguments.length; k--;) {
    result = pair(arguments[k], result);
  }
  return result;
}

// let's test lists and rewrite our var foo = pair(1, pair(2, null)) example:
var foo = list(1, 2);
console.log("foo:", foo); // [1, [2, null]]

// we see the same result
console.log("first(foo):", first(foo)); // 1
console.log("rest(foo):", rest(foo)); // [2, null]

// a longer list
var bar = list(1, 2, 3, 4);
console.log("bar:", bar); // [1, [2, [3, [4, null]]]]

console.log("first(rest(rest(bar))):", first(rest(rest(bar)))); // 3


// --- Representation and use-cases in our language ---

// In our language we will represent pairs and lists in the same
// semantics and similar syntax (just parenthis are outside):
//
// (pair 1 2) -- creates a pair, in AST view: ["pair", 1, 2] -> [1, 2]
// (list 1 2 3 4) -- creates a list, in AST view: ["list", 1, 2, 3, 4] -> [1, [2, [3, [4, null]]]]
//
// (define x (pair 1 2)) -- define "x" variable which is a pair
//
// (first x) -- get first element, 1
// (rest x) -- get second (rest) element, 2
//
// (define y (list 1 2 3 4)) -- define "y" which is a list
//
// (first y) -- 1
// (rest y) -- [2, [3, [4, null]]]
// (first (rest (rest y))) -- 3
//
// We will use lists to manage as just sequences of data, as well as represent objects.
// E.g. when we'll introduce higher-order and functions anonymous lambdas, we'll be
// able to e.g. to *map* lists, etc:
//
// (map (lambda (x) (* x x)) ; anonymous function
//      (list 1 2 3 4))      ; maps the list to (list 1 4 9 16)
//
// In fact, even our programs (ASTs) are represented as lists (JS arrays) and we could
// apply these operations also for them.
//
// For example (a list which corresponds to our (+ 1 2) command):
//
// (first (list '+ 1 2)) -> '+
// (rest (list '+ 1 2)) -> (list 1 2)
//

// So, these are "pairs" and "lists" and they work!
//
// However, internally, in implementation level we can represent lists more
// efficiently -- just using JavaScript arrays for this. Return values of course
// should be kept as before; we just change implementation of "pair" and "list" constructors.


// --- Effecient lists implementation ---

// Instead of [1, [2, [3, [4, null]]]] for (list 1 2 3 4) structure, we'd like to use
// simple JS array: [1, 2, 3, 4]. Thus, the invariant of manual lists building (that is
// with just linking pairs) should be kept!
//
// The technique is very simple: if the second component of a pair is a simple value, then the
// implementation is the same as it was: [x, y]. In case if the second component is a *pair* (an array),
// then we just *concat* the [x] with the y, constructing *plain JS array*

/**
 * pair
 * @param {Variant} x
 * @param {Variant} y
 *
 * Implementation of a pair with efficient support for lists
 */
var pair = function (x, y) {
  // if "y" is a pair, then concat
  if (Array.isArray(y)) return [x].concat(y);
  // else it's a simple pair
  return [x, y];
}

// we should adjust getters as well

/**
 * first
 * @param {Pair} pair
 *
 * "first" getter is leaved as is...
 */
var first = function (pair) {
  return pair[0];
};

/**
 * rest
 * @param {Pair} pair
 *
 * ... And the "rest" getter should also analyze whether it deals
 * with a simple pair, or a list structure. In former case it just
 * returns the second element, in later case -- we just *slice*, getting
 * the *tail* of a list (which as we remember should also be a list or the null)
 */
var rest = function (pair) {
  // if it's a list (i.e. more than 2 elements)
  if (pair.length > 2) {
    // then we return the tail of the list, checking the case with null (simple pair)
    var tail = pair.slice(1);
    if (tail.length == 1) tail[1];
    return tail;
  }
  // else, it's a simple pair, just return the second cell
  return pair[1];
};

// Let's check that all invariants are kept the same and that we didn't break
// public API with changing internal implementation

var p = pair(1, 2); // [1, 2]
console.log("p:", p); // [1, 2]

console.log("first(p):", first(p)); // 1
console.log("rest(p):", rest(p)); // 2

// manual list builing by chaining pairs
var foo = pair(1, pair(2, null));
console.log("foo:", foo); // [1, [2, null]]

console.log("first(foo):", first(foo)); // 1
console.log("rest(foo):", rest(foo)); // [2, null]

// And the implementation of list, which just converts
// arguments to an array, attaching "null" value at the end

/**
 * list
 * @param {Arguments} arguments object
 *
 * Efficient implementation of lists
 */
var list = function (/* arguments */) {
  // convert to array
  var result = [].slice.call(arguments, 0);
  // and add "terminate null" value
  result.push(null);
  return result;
};

// and check again that all invariants are OK
var foo = list(1, 2);
console.log("foo:", foo); // [1, 2, null]

// we see the same result
console.log("first(foo):", first(foo)); // 1
console.log("rest(foo):", rest(foo)); // [2, null]

// a longer list
var bar = list(1, 2, 3, 4);
console.log("bar:", bar); // [1, 2, 3, 4, null]

console.log("first(rest(rest(bar))):", first(rest(rest(bar)))); // 3

// Exercises:
//
// 1. An "object" is a collection of *slots*. Implement "object" constructor
//    which creates objects via:
//
//    (object
//            (slot 'x 10)
//            (slot 'y 20))
//
//    You may use two lists to track slot (property) names and values.
//    Implement getter of property and creating of a new property on object.
//
//    Later, when we'll introduce inner functions and closures, we'll see
//    how to implement such objects with using just the tools of our language
//    without lower-level implementation. This is what is called "message-passing" technique.


// P.S.:
//
// In some languages you may find another terminology which corresponds to our "pair", "first" and "rest".
// I.e. in Scheme they are called: "cons" (short from "construct") -- our "pair", "car" -- our "first"
// "cdr" -- our "rest". Sometimes they are called: "head" -- our "first" and "tail" -- our "rest".
// However we have chosen exactly this terminology: "pair", "first", "rest" and "list".
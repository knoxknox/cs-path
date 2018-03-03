# hw6 problem 3
#
# name(s): 
# date: 
#
# Hmmm... comments: 
#
#

import sys


# Example1 is an example program that
#   1) asks the user for two inputs
#   2) computes the product of the inputs
#   3) prints out the result (with write)
#   4) stops

Example1 = """
00 read r1          # get # from user to r1
01 read r2          # ditto, for r2
02 mul r3 r1 r2     # r3 = r1 * r2
03 write r3         # print what's in r3
04 halt             # stop.
"""


# in the Gold section, you'll write a Fibonacci program:
# when you do, be sure to change the name of the program below!!


# These statements are to set up Hmmm...
# You'll need the files that are in this folder.

if __name__ == "__main__" : 
    import hmmmAssembler ; reload(hmmmAssembler)
    import hmmmSimulator ; reload(hmmmSimulator)
    hmmmAssembler.main(Example1) # assemble input into machine code
    hmmmSimulator.main()   # run that machine code

# to change the function being run by the assembler and simulator, change to
#   hmmmAssembler.main(Function_name)
#
# to avoid debugging mode without asking, replace the last line with
#     hmmmSimulator.main(['-n'])
#
# to enter debugging mode without asking, replace the last line with
#     hmmmSimulator.main(['-d'])
#
# to have the program ask you whether or not you want to debug, use
#     hmmmSimulator.main()


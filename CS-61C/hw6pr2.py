# hw6
#
# problem number:
# name(s):
# date:
#
# Hmmm... comments:
#
#

# You need to download three files in order to run Hmmm:
#   1) hmmmAssembler.py
#   2) hmmmSimulator.py
#   3) binary.py
# place them in the same directory as this file (hw6pr1.py)
# the Desktop may be easiest, at least to start...

import hmmmAssembler ; reload(hmmmAssembler)
import hmmmSimulator ; reload(hmmmSimulator)
import sys


# Example1 is an example program that
#   1) asks the user for two inputs
#   2) computes the product of the inputs
#   3) prints out the result (with write)
#   4) stops

Example1 = """
00 read r1          # get an integer from the user
                    # and hold it in register r1
01 read r2          # ditto, for register r2
02 mul r3 r1 r2     # r3 = r1 * r2
03 write r3         # write out (print) the contents of r3
04 halt             # stop here.
"""


# Problem1 is an example program that
#   1) asks the user for an input
#   2) counts up from that input
#   3) keeps going and going...

Problem1 = """
00 read r1          # get an integer from the user
                    # and hold it in register r1
01 write r1         # write out (print) the value of r1
02 addn r1 1        # add 1 to the value in register r1
                    # in other words, r1 = r1 + 1
03 jump 01          # jump to line 01 next
                    # so line 01 will be the next line to execute
04 halt             # this will never happen!
                    # hit CONTROL-C to break the program!
"""


# change Problem1 to Example1 to run the other program
# however, be sure to leave it as Problem1 for the graders when submitting!

hmmmAssembler.main(Problem1) # assemble input into machine code
hmmmSimulator.main()         # run that machine code


# to enter debugging mode without asking, replace the last line with
#     hmmmSimulator.main(['-d'])
#
# to avoid debugging mode without asking, replace the last line with
#     hmmmSimulator.main(['-n'])



#!/usr/bin/python

import sys, string
from binary import *

memory = [0]*256        # 256 words of memory.  Instructions are represented
                        # ..in string form; data is integer
register = [0]*16       # 16 integer registers
pc = 0                  # program counter initialized to 0
lpc = 0                 # where the program counter was 1 instruction ago
codesize = 0            # can't execute past this or read/write before this

#
# opcodes encodes the preferred opcode translations.  Each entry is a
# triple: match, mask, translation.  If the binary word matches
# "match" under the mask, the translated opcode is given by that
# entry.  Blanks are ignored in the match and mask fields.  The table
# is order-dependent; the first match is used.  Note that at present
# the masks are either 0x0 or 0xF in each hex digit, although the code
# doesn't enforce that restriction.
#
# This table is shared directly between the assembler and simulator.
# The assembler doesn't use all the fields.
#
opcodes = (
        ("0000 0000 0000 0000", "1111 1111 1111 1111", "halt"),
        ("0000 0000 0000 0001", "1111 0000 1111 1111", "read"),
        ("0000 0000 0000 0010", "1111 0000 1111 1111", "write"),
        ("0000 0000 0000 0011", "1111 0000 1111 1111", "jumpi"),
        ("0001 0000 0000 0000", "1111 0000 0000 0000", "loadn"),
        ("0010 0000 0000 0000", "1111 0000 0000 0000", "load"),
        ("0011 0000 0000 0000", "1111 0000 0000 0000", "store"),
        ("0100 0000 0000 0000", "1111 0000 0000 1111", "loadi"),
        ("0100 0000 0000 0001", "1111 0000 0000 1111", "storei"),
        ("0101 0000 0000 0000", "1111 0000 0000 0000", "addn"),
        ("0110 0000 0000 0000", "1111 1111 1111 1111", "nop"),
        ("0110 0000 0000 0000", "1111 0000 0000 1111", "mov"),
        ("0110 0000 0000 0000", "1111 0000 0000 0000", "add"),
        ("0111 0000 0000 0000", "1111 0000 1111 0000", "neg"),
        ("0111 0000 0000 0000", "1111 0000 0000 0000", "sub"),
        ("1000 0000 0000 0000", "1111 0000 0000 0000", "mul"),
        ("1001 0000 0000 0000", "1111 0000 0000 0000", "div"),
        ("1010 0000 0000 0000", "1111 0000 0000 0000", "mod"),
        ("1011 0000 0000 0000", "1111 1111 0000 0000", "jump"),
        ("1011 0000 0000 0000", "1111 0000 0000 0000", "call"),
        ("1100 0000 0000 0000", "1111 0000 0000 0000", "jeqz"),
        ("1101 0000 0000 0000", "1111 0000 0000 0000", "jnez"),
        ("1110 0000 0000 0000", "1111 0000 0000 0000", "jgtz"),
        ("1111 0000 0000 0000", "1111 0000 0000 0000", "jltz"),
        ("0000 0000 0000 0000", "0000 0000 0000 0000", "data"),
        )

#
# arguments encodes the required arguments for each operation.  "r"
# means a register; "s" means a signed 8-bit number in decimal; "u"
# means an unsigned 8-bit number in decimal, and "n" means a signed or
# unsigned 16-bit number in hex (0x notation) or decimal.  Actually,
# all numbers are accepted in all bases.
#
# In addition, "z" means insert four bits of zeros without swallowing
# an argument; however, this works only at the beginning of an
# argument specifier.
#
# This table is taken directly from hmmmAssembler.py.
#
arguments = {"halt": "",
        "read": "r",
        "write": "r",
        "jumpi": "r",
        "loadn": "rs",
        "load": "ru",
        "store": "ru",
        "loadi": "rr",
        "storei": "rr",
        "addn": "rs",
        "add": "rrr",
        "mov": "rr",
        "nop": "",
        "sub": "rrr",
        "neg": "rzr",
        "mul": "rrr",
        "div": "rrr",
        "mod": "rrr",
        "jump": "zu",
        "call": "ru",
        "jeqz": "ru",
        "jgtz": "ru",
        "jltz": "ru",
        "jnez": "ru",
        "data": "n"}

def valid_integer(x):
    return -32768 <= x <= 32767

def disassemble(line):
    """Disassemble a binary line, returning a @h-element tuple.
The first tuple element is a string giving the assembly code, the second is
the mnemonic opcode alone, and the third is a list of arguments, if any,
in binary encoding."""
    if type(line) != type(''):
        return ('***UNTRANSLATABLE INSTRUCTION!***', '***UNTRANSLATABLE***', \
          [])
    hex = binary_to_num(reduce(lambda x, y: x + y, line.strip().split(' ')))
    for tuple in opcodes:
        proto = binary_to_num(reduce(lambda x, y: x + y, tuple[0].split(' ')))
        mask = binary_to_num(reduce(lambda x, y: x + y, tuple[1].split(' ')))
        if hex & mask == proto:
            # We have found the proper instruction.  Decode the arguments.
            opcode = tuple[2]
            translation = opcode
            hex <<= 4
            args = []
            separator = ' '
            for arg in arguments[opcode]:
                # r s u n z
                if arg == 'r':
                    val = (hex & 0xf000) >> 12
                    translation += separator + 'r' + str(val)
                    separator = ', '
                    hex <<= 4
                    args += [val]
                elif arg == 'z':
                    hex <<= 4
                elif arg == 's'  or  arg == 'u':
                    val = (hex & 0xff00) >> 8
                    if arg == 's'  and  (val & 0x80) != 0:
                        val -= 256
                    translation += separator + str(val)
                    separator = ', '
                    hex <<= 8
                    args += [val]
                elif arg == 'u':
                    val = (hex & 0xff00) >> 8
                    translation += separator + str(val)
                    separator = ', '
                    hex <<= 8
                    args += [val]
                elif arg == 'n':
                    # In the absence of other information, always unsigned
                    val = hex & 0xffff
                    translation += separator + str(val)
                    separator = ', '
                    hex <<= 16
                    args += [val]
            return (translation, opcode, args)
    return ('***UNTRANSLATABLE INSTRUCTION!***', '***UNTRANSLATABLE***', [])

def simulationError(message):
    """Issue an error message and halt program execution."""
    print "\n\n" + message
    print "Halting program execution."
    sys.exit()

def run() :
    global pc, memory, loop_check, lpc, codesize
    while pc != -1:         # fetch/execute cycle
        if pc not in range(codesize) :
            simulationError("Memory Out of Bounds Error.\n"
              + "Program attempted to execute memory location " + str(pc))
        ir = memory[pc]         # Fetch and store into instruction register
        lpc = pc
        pc = pc+1           # increment pc
        try :
            execute(ir)         # execute instruction
        except KeyboardInterrupt :
            print "\n\nInterrupted by user, halting program execution...\n"
            sys.exit()
        except EOFError :
            print "\n\nEnd of input, halting program execution...\n"
            sys.exit()

def checkOverflow(register, ir, lpc):
    if not valid_integer(register):
        parts = ir.split()
        (translation, opcode, args) = disassemble(memory[lpc])
        print "\n  Program Counter:", lpc
        print "  Instruction:", opcode, "  Arguments:", ", ".join(parts[1:])
        print "  Translation:", translation,
        simulationError("Integer Overflow Error: Result was larger than 16 bits.\n")

def execute(ir) :
    global memory, register, pc, lpc

    if ir == "" or valid_integer(ir):
        simulationError("Bad instruction at memory location " + lpc)

    parts = ir.split() # parse instruction
    (translation, opcode, args) = disassemble(memory[lpc])

    # Register 0 is always forced to zero
    register[0] = 0

    if opcode == "halt":
        pc = -1                 # This terminates the run loop

    elif opcode == "read":
        sys.stdin.flush()
        sys.stdout.flush()
        sys.stderr.flush()
        input = raw_input("Enter number: ")
        while input == "" \
          or  (not (input.isdigit() \
            or (input[0] == '-' and input[1:].isdigit()))) \
          or not valid_integer(int(input)):
            print "\n\nIllegal input: number must be in [-32768,32767]"
            input = raw_input("Enter number (q to quit): ")
            if input == "q" :
                sys.exit()
        register[args[0]] = int(input)

    elif opcode == "write":
        print register[args[0]]

    elif opcode == "jumpi":
        pc = register[args[0]]
        if pc not in range(codesize):
            simulationError("Invalid jump target at pc " + str(lpc) \
              + ": " + str(pc))

    elif opcode == "loadn":
        register[args[0]] = args[1]

    elif opcode == "load":
        if args[1] not in range(codesize, 256) :
            simulationError("Invalid load target at pc " + str(lpc) \
              + ": " + str(args[1]))
        register[args[0]] = memory[args[1]]

    elif opcode == "store":
        if args[1] not in range(codesize, 256) :
            simulationError("Invalid store target at pc " + str(lpc) \
              + ": " + str(args[1]))
        memory[args[1]] = register[args[0]]

    elif opcode == "loadi":
        if register[args[1]] not in range(codesize, 256) :
            simulationError("Invalid load target at pc " + str(lpc) \
              + ": " + str(register[args[1]]))
        register[args[0]] = memory[register[args[1]]]

    elif opcode == "storei":
        if register[args[1]] not in range(codesize, 256) :
            simulationError("Invalid store target at pc " + str(lpc) \
              + ": " + str(register[args[1]]))
        memory[register[args[1]]] = register[args[0]]

    elif opcode == "addn":
        register[args[0]] += args[1]
        checkOverflow(register[args[0]], ir, lpc)

    elif opcode == "add"  or  opcode == "mov"  or  opcode == "nop":
        if opcode == "nop":
            args = [0, 0, 0]
        elif opcode == "mov":
            args += [0]
        register[args[0]] = register[args[1]] + register[args[2]]
        checkOverflow(register[args[0]], ir, lpc)

    elif opcode == "sub"  or  opcode == "neg":
        if opcode == "neg":
            args = [args[0], 0, args[1]]
        register[args[0]] = register[args[1]] - register[args[2]]
        checkOverflow(register[args[0]], ir, lpc)

    elif opcode == "mul":
        register[args[0]] = register[args[1]] * register[args[2]]
        checkOverflow(register[args[0]], ir, lpc)

    elif opcode == "div":
        try:
            register[args[0]] = register[args[1]] // register[args[2]]
        except ZeroDivisionError :
            simulationError("Division by Zero Error at pc " + str(lpc) + ".")

    elif opcode == "mod":
        try:
            register[args[0]] = register[args[1]] % register[args[2]]
        except ZeroDivisionError :
            simulationError("Division by Zero Error at pc " + str(lpc) + ".")

    elif opcode == "jump"  or  opcode == "call":
        if opcode == "jump":
            args = [0] + args
        register[args[0]] = pc
        pc = args[1]
        if pc not in range(codesize):
            simulationError("Invalid jump/call target at pc " + str(lpc) \
              + ": " + str(pc))

    elif opcode == "jeqz":
        if register[args[0]] == 0:
            pc = args[1]
        if pc not in range(codesize):
            simulationError("Invalid jump target at pc " + str(lpc) \
              + ": " + str(pc))

    elif opcode == "jltz":
        if register[args[0]] < 0:
            pc = args[1]
        if pc not in range(codesize):
            simulationError("Invalid jump target at pc " + str(lpc) \
              + ": " + str(pc))

    elif opcode == "jgtz":
        if register[args[0]] > 0:
            pc = args[1]
        if pc not in range(codesize):
            simulationError("Invalid jump target at pc " + str(lpc) \
              + ": " + str(pc))

    elif opcode == "jnez":
        if register[args[0]] != 0:
            pc = args[1]
        if pc not in range(codesize):
            simulationError("Invalid jump target at pc " + str(lpc) \
              + ": " + str(pc))

    else:
        simulationError("Invalid operation code at pc " + str(pc))

    # Re-force register 0 to zero so register dumps will be correct.
    register[0] = 0

def readfile(filename) :
    global memory, codesize
    try:
        f = file(filename,"r")    # file with machine code
    except:
        print "Cannot open file: ", filename
        sys.exit()
    address = 0
    codesize = 0
    while 1 :
        line = f.readline()
        for c in line:
            if c not in "01 \n":
                print "\nERROR: Not a valid binary file.\n"
                sys.exit()
        if line == "": break
        memory[address] = line
        address = address + 1
        codesize = codesize + 1
    if codesize == 0:
        print "\nERROR: Empty file.\n"
        sys.exit()
    f.close()

def main (filename=None) :
    readfile(filename)

    try :
        run()
    except KeyboardInterrupt :
        print "\n\nInterrupted by user, halting program execution...\n"
        sys.exit()
    except EOFError :
        print "\n\nEnd of input, halting program execution...\n"
        sys.exit()

#! /usr/bin/env python

"""hmmm2py.py
   A python script which converts a HMMM (Harvey Mudd Miniature Machine, see
   http://www.cs.hmc.edu/~cs5grad/cs5/hmmm/documentation/documentation.html
   for more details) binary file into a python script. If the binary file
   doesn't assemble, it writes an error and does not create an output file.
   The created python script will be shell executable but will also 
   have a function named the name of the input file (without the extension)
   which takes a tuple of integer inputs and outputs a tuple of integer
   outputs (It does not check for valid input). The output file also
   defines the global strings "assemblycode" and "binarycode" which
   correspond with the original code given. The hmmmAssemblerCommand must
   specify a shell-executable HMMM assembler, while the hmmmSimulatorFile
   should be the location of a hmmmSimulator which can be imported into
   Python.
   When executed from the shell, arguments given should be (in order):
   The filename to convert (ought to be a .a file, but this isn't necessary).
   The command used to execute the hmmmAssembler from the current directory.
   The location of the hmmmSimulator file.
   Arguments not given will be prompted for, and arguments (or prompt
   responses) of 'd' will use the default values. If command line arguments
   are given and a fourth argument is present, this will be passed into
   convertToPy as the fcname argument, but this is purely optional.
   The path given to the hmmmSimulator must include a ./ if it is in
   the current directory, as the base of the path (minus the terminating
   filename) is used to make sure the created file can import binary.py."""

import os, sys

hmmmAssemblerCommand = "./hmmmAssembler.py"
hmmmSimulatorFile = "./hmmmSimulator.py"

def assembleToBinary(filename):
  """Takes a filename (in the current directory) and uses the hmmmAssembler
     to assemble that file. This assumes that the hmmmAssemblerCommand will
     run the hmmmAssembler. It tells the assembler to write to a file named
     hmmm2py_temp_assembled.b which it then reads and returns as a string.
     If the assembler fails, it returns None."""
  global hmmmAssemblerCommand
  os.system(hmmmAssemblerCommand+" -f "+filename+" -o hmmm2py_temp_assembled.b")
  lsin = os.popen("ls")
  files = lsin.read()
  lsin.close()
  if "hmmm2py_temp_assembled.b" not in files:
    return None
  fin = open("hmmm2py_temp_assembled.b",'r')
  binary = fin.read()
  fin.close()
  os.system("rm hmmm2py_temp_assembled.b")
  return binary

def convertToPy(filename, fcname = None):
  """Takes a filename and converts it to a py file. See the docstring for
     this module for more details. The file should be in the current directory,
     and the hmmmAssemblerCommand and hmmmSimulatorFile variables should be
     set correctly. The resulting file is fragile: renaming it will break
     it (see the resulting file's docstring for details). If fcname is given
     and evaluates to True, the internal function for use with import will
     be named fcname, otherwise, it will take the name of the file."""
  global hmmmSimulatorFile
  fname = ''.join(filename.split('.')[:-1])
  if not fcname:
    fcname = fname
  fin = open(filename,'r')
  assemblycode = fin.read()
  fin.close()
  binarycode = assembleToBinary(filename)
  if not binarycode:
    print "ERROR: Code did not assemble. Check that your code assembles, and"
    print "that a working hmmmAssembler exists at:\n"+hmmmAssemblerCommand+".\n"
  else:
    fin = open(hmmmSimulatorFile,'r')
    hmmmSimulator = fin.read()
    fin.close()
    # chop off the last 6 lines, which contain a comment, and the
    # hmmmSimulator if __name__ == "__main__": main() statement.
    # Also chop off the header from hmmmSimulator.py
    truncatedSimulator = '\n'.join(hmmmSimulator.split('\n')[4:\
                         hmmmSimulator.split('\n').index("def main () :")])
    # hack to add extra newlines to the Simulator's output so that piping
    # in will work:
    whichline = truncatedSimulator.split('\n').index("\t\tprint register[reg1]")
    truncatedSimulator = '\n'.join(truncatedSimulator.split('\n')[:whichline]+\
                         ["\t\tprint '\\n'+str(register[reg1])"]+\
                         truncatedSimulator.split('\n')[whichline+1:])

# BEGINNNING of the code to be generated.

    header = """#! /usr/bin/env python

"""+'"""'+fname+""".py
   This file is a python version of """+fname+""".a,
   which provides two methods of execution, as well as two useful global
   variables. This program is shell-executable, and should behave exactly
   like the hmmmSimulator run on binarycode when executed in this fashion,
   except that it prints one extra newline per output line.
   If imported, this file does nothing, but the shell functionality can
   be accessed via the runcode method, and the """+fname+\
"""method
   will take a list or tuple of integers as program inputs and return a tuple
   of program outputs corresponding to those inputs. Because this method
   makes use of pipes to this file and he runcode method, if the file is
   renamed, the """+fname+""" method will no longer work.
   This file also defines the assemblycode and binarycode variables, which
   correspond to the original assembly code and assembled binary code used
   to make this file.
   This file contains a copy of most of the hmmmSimulator code, which was
   written by Ran Libeskind-Hadas in 2006, and modified by Peter Mawhorter
   that same year.
"""+'"""'+"""

import os
import sys; sys.path.append('"""+'/'.join(hmmmSimulatorFile.split('/')[:-1])+\
"""')
"""
    output = """

assemblycode = """+'"""\n'+assemblycode+'"""'+"""

binarycode = """+'"""\\\n'+binarycode+'"""'+"""

def runcode():
  """+'"""'+"""runcode runs code defined as a string instead of reading it
     from a file, like the hmmmSimulator would normally do. This method
     actually runs the code given in the string binarycode."""+'"""'+"""
  global memory, codesize, binarycode
  
  codesize = len(binarycode.split('\\n'))
  for i in range(codesize):
    memory[i] = binarycode.split('\\n')[i]

  try:
    run()
  except KeyboardInterrupt:
    print "\\n\\nInterrupted by user, halting program execution...\\n"
    sys.exit()
  except EOFError:
    print "\\n\\nEnd of input, halting program execution...\\n"
    sys.exit()

def """+fcname+"""(inputs):
  """+'"""'+"""This function takes a tuple of inputs and returns a tuple of
     outputs, acting exactly as the code in binarycode would when run in
     the hmmmSimulator. To do this, it uses os.popen to call itself,
     which calls the runcode method which uses the built-in code from
     hmmmSimulator above to run the binary code in binarycode. This means that
     if this file is renamed, the reference to itself in the call to os.popen
     below will break."""+'"""'+"""
  global debug, regiser_display, memory_display, visualize
  debug = register_display = memory_display = visualize = False
  cmd = "echo '"+'\\n'.join([str(i) for i in inputs])+\\
                    "\\n' | ./"""+fname+""".py"
  selfin = os.popen(cmd)
  strout = selfin.read()
  selfin.close()
  output = tuple([int(s) for s in strout.split('\\n')[:-1] \\
                  if s != '' and s[0] != 'E'])
  return output

# Shell executablility
if __name__ == "__main__": runcode()
"""

# END of the code to be generated.

    fout = open(fname+".py",'w')
    fout.write(header)
    fout.write(truncatedSimulator)
    fout.write(output)
    fout.close()

    os.system("chmod 0755 "+fname+".py")


if __name__ == "__main__":
  fcname = None
  if sys.argv[2:]:
    if sys.argv[2] != 'd':
      hmmmAssemblerCommand = sys.argv[2]
  else:
    inp = raw_input("Define the hmmmAssemblerCommand: ")
    if inp != 'd':
      hmmmAssemblerCommand = inp
  if sys.argv[3:]:
    if sys.argv[3] != 'd':
      hmmmSimulatorFile = sys.argv[3]
  else:
    inp = raw_input("Define the hmmmSimulatorFile (include a './'): ")
    if inp != 'd':
      hmmmSimulatorFile = inp
  if sys.argv[4:]:
    fcname = sys.argv[4]
  if sys.argv[1:]:
    if fcname:
      convertToPy(sys.argv[1], fcname)
    else:
      convertToPy(sys.argv[1])
  else:
    if fcname:
      convertToPy(raw_input("What file would you like to convert? "), fcname)
    else:
      convertToPy(raw_input("What file would you like to convert? "))


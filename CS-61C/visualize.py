#! /usr/bin/env python
# registers.py
# created 16.6.2006 by Peter Mawhorter
# program to visualize the registers of the HMMM.

from visual import *


def main() :
  reg_setup()
  reg_update()
  rate(1)

# sets up the registers window
def reg_setup() :
  global reg_scene

  B_LENGTH = 16
  B_WIDTH = 48
  B_COLOR = (0.3,0.3,0.3)
  R_COLOR = (0.6,0.6,0.6)
  T_COLOR = (0.8,0.8,0.8)
  NUM_REGISTERS = 16

  reg_scene = display(title="Registers", width=180, height=480, userzoom=0, userspin=0, exit=0)

  reg_scene.select()

  backing = box(pos=(0,0,0), width=0.1, height=B_WIDTH, length=B_LENGTH, color=B_COLOR)
  r_size = B_WIDTH/16.
  r_offset = B_WIDTH/2. - r_size*0.5
  r_length = B_LENGTH-B_LENGTH/10.
  r_width = r_size*2./3.
  registers = []
  labels = []
  hmmm_register_display_labels = []
  for i in range(NUM_REGISTERS) :
    rate(100)
    registers.append(box(pos=(0,r_offset - r_size*i,0.1), width=0.1, height=r_width, length=r_length, color=R_COLOR))
    labels.append(label(pos=registers[i].pos, text="r" + str(i).ljust(2) + ": ", color=T_COLOR, opacity=0, box=0, line=0, space=0, xoffset=0, yoffset=0, height=10, border=0))

# writes into the registers window
def reg_update(values) :
  rate(50)
  global reg_scene
  NUM_REGISTERS = 16

  labels = []

  for obj in reg_scene.objects :
    if obj.__class__ == label :
      labels.append(obj)

  for i in range(NUM_REGISTERS) :
    labels[i].text = labels[i].text[:5] + str(values[i]).ljust(7)


# sets up the memory window
def mem_setup() :
  global hmmm_memory_display_labels
  global mem_scene

  B_LENGTH = 16
  B_WIDTH = 128
  B_COLOR = (0.3,0.3,0.3)
  M_COLOR = (0.6,0.6,0.6)
  T_COLOR = (0.8,0.8,0.8)
  MEM_SIZE = 256
  COLUMNS = 8
  ROWS = MEM_SIZE/COLUMNS
  # make sure that ROWS is an int

  mem_scene = display(title="Memory", width=800, height=800, userzoom=0, userspin=0, exit=0, autoscale = 0, range = (70,70,70))

  mem_scene.select()

  backing = box(pos=(0,0,0), width=0.1, height=B_WIDTH, length=B_LENGTH*COLUMNS, color=B_COLOR)
  m_x_size = B_LENGTH
  m_x_offset = -B_LENGTH*COLUMNS/2. + m_x_size*0.5
  m_y_size = B_WIDTH/ROWS
  m_y_offset = B_WIDTH/2. - m_y_size*0.5
  m_length = m_x_size - m_x_size/10.
  m_width = m_y_size*2./3.
  memory = []
  labels = []
  for j in range(COLUMNS) :
    for i in range(ROWS) :
      memory.append(box(pos=(m_x_offset + m_x_size*j,m_y_offset - m_y_size*i,0.1), width=0.1, height=m_width, length=m_length, color=M_COLOR))
      labels.append(label(pos=memory[i+j*ROWS].pos, text = str(i+j*ROWS).ljust(3) + ": ", color=T_COLOR, opacity=0, box=0, line=0, space=0, xoffset=0, yoffset=0, height=1, border=0))

# writes into the memory window
def mem_update(values) :
  rate(50)
  global mem_scene

  MEM_SIZE = 256
  COLUMNS = 8

  labels = []

  for obj in mem_scene.objects :
    if obj.__class__ == label :
      labels.append(obj)

  display = []
  for v in values :
    if not (str(v).isdigit() or str(v)[1:].isdigit()) :
      display.append("code")
    else :
      display.append(str(v))

  for i in range(MEM_SIZE) :
    labels[i].text = labels[i].text[:5] + display[i].ljust(6)

if __name__ == "__main__" : main()

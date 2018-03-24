# python strings are immutable!

def num_to_twos_complement(num, width = 8) :
    if num >= 0 :
        return add_binary(width * "0", num_to_bin(num))
    else :
        string = add_binary(width * "0", num_to_bin(-num))
        return add_binary(complement(string), "1")

def binary_to_num(string) :
    if string == "" :
        return 0
    else :
        return int(string[-1]) + 2 * binary_to_num(string[:-1])

# @private
def num_to_bin(num) :
    if num == 0 :
        return ""
    else :
        if num % 2 == 1 :
            return num_to_bin(num/2) + "1"
        else :
            return num_to_bin(num/2) + "0"

# @private
def add_binary(string1, string2) :
    return add_helper(string1, string2, 0)

# @private
def add_helper(string1, string2, carryin) :
    if string1 == "" and string2 == "" :
        if carryin == 1:
            return str(carryin)
        else:
            return ""
    elif string1 == "" : return add_helper(str(carryin), string2, 0)
    elif string2 == "" : return add_helper(string1, str(carryin), 0)
    else :
        sum = int(carryin + int(string1[-1]) + int(string2[-1])) % 2
        carryout = int(carryin + int(string1[-1]) + int(string2[-1])) / 2
        return add_helper(string1[:-1], string2[:-1], carryout) + str(sum)

# @private
def complement(string) :
    if string == "" :
        return ""
    else :
        if string[0] == "1" :
            return "0" + complement(string[1:])
        else :
            return "1" + complement(string[1:])

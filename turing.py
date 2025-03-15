import time

# current_task = "q0"
# T = ["-","&","+","1"]
# machine_turing = {
#   "q0":{"+":"+q4L","&":"&q4L","1":"1q0R",},
#   "q1":{"&":"1q2L","1":"1q1L",},
# "q2":{"&":"1q6R"},
#   "q3":{"+":"","&":"","-":"","1":"",},
#   "q4":{"&":"&q*N","1":"&q5L",},
#   "q5":{"&":"&q1L","1":"1q5L",},
#   "q6":{"&":"&q0R","1":"1q6R",},
# }
# input_tape = ["q0","1","1","1","+","1","1","-","1","1"]
def init_program(turing,T,current_task,input_tape,num_steps):
    return run(turing,T,current_task,input_tape,num_steps)

def run(machine_turing,T,current_task="q0",input_tape=["q0","1","1","1","+","1","1","-","1","1"],num_steps=100):
    check_q = input_tape.split("'")
    print(check_q) 
    
    for i in check_q:
        if i in machine_turing:
            if i in check_q[1]:
                input_tape = list(check_q[0]+check_q[2])
                current_task = i
                input_tape.insert(len(check_q[0]),current_task)
    print(machine_turing)
    print(input_tape)
    count_prog = 0
    while current_task != "q*":
        count_prog += 1
        index_q = input_tape.index(current_task)
        view_q = index_q+1
        if num_steps:
            if count_prog > int(num_steps):
                print("error3")
                break
        if view_q >= len(input_tape):
            input_tape.append("&")
        
        if current_task in machine_turing:
            if input_tape[view_q] in machine_turing[current_task]:
                old_task = current_task
                temp_task = list(machine_turing[current_task][input_tape[view_q]])
                temp_task.pop(0)
                temp_task.pop(-1)
                current_task = ''.join(temp_task)
                old_view = input_tape[view_q]
                input_tape[view_q] = machine_turing[old_task][input_tape[view_q]][0]

                match machine_turing[old_task][old_view][-1]:
                    case "R":
                        input_tape.insert(view_q+1,current_task)
                        input_tape.pop(index_q)
                    case "L":
                        if index_q - 2<=-2:
                            input_tape.remove(old_task)
                            input_tape.insert(0,current_task)
                            input_tape.insert(1,"&")
                        elif index_q - 2 == -1:
                            input_tape.remove(old_task)
                            input_tape.insert(0,current_task)
                        else:
                            input_tape.remove(old_task)
                            input_tape.insert(index_q-1, current_task)
                            
                    case "N":
                        input_tape[index_q] = current_task
                form_output = '{:>20} {:>20}'.format((" ".join(input_tape)), ("("+machine_turing[old_task][old_view]+")"))
                print((str(count_prog)+"."),form_output)
                
            else:
                print(input_tape)
                print("error2")
                break
        else:
            print(input_tape)
            print("error1")
            break

    return input_tape

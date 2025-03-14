import time

current_task = "q0"
T = ["-","&","+","1"]
machine_turing = {
  "q0":{"+":"+q4L","&":"&q4L","1":"1q0R",},
  "q1":{"&":"1q2L","1":"1q1L",},
"q2":{"&":"1q6R"},
  "q3":{"+":"","&":"","-":"","1":"",},
  "q4":{"&":"&q*N","1":"&q5L",},
  "q5":{"&":"&q1L","1":"1q5L",},
  "q6":{"&":"&q0R","1":"1q6R",},
}
input_tape = ["q0","1","1","1","+","1","1","-","1","1"]
print(input_tape)
while current_task != "q*":
  index_q = input_tape.index(current_task)
  view_q = index_q+1
  if view_q >= len(input_tape):
    input_tape.append("&")
  
  if current_task in machine_turing:
    if input_tape[view_q] in machine_turing[current_task]:
        old_task = current_task
        current_task = machine_turing[old_task][input_tape[view_q]][1:3]
        old_view = input_tape[view_q]
        input_tape[view_q] = machine_turing[old_task][input_tape[view_q]][0]

        match machine_turing[old_task][old_view][3]:
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
                input_tape[index_q] = machine_turing[old_task][input_tape[view_q]][1:2].join('')

        time.sleep(0.5)
        print(" ".join(input_tape),index_q)
        
    else:
        print(input_tape)
        print("error2")
        break
  else:
    print(input_tape)
    print("error1")
    break

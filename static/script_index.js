
q_rows = 0
function generate_table(){
  var size = document.getElementById('size').value;
  var T_alphavit = document.getElementById('T').value;  
  tr = document.createElement('tr');
  var td = document.createElement('td');
  tr.appendChild(td);
  for (var j = 0; j < T_alphavit.length; j++) {
    var td = document.createElement('td');
    td.innerHTML = T_alphavit[j];
    tr.appendChild(td);
  }
  document.getElementById('table').appendChild(tr);
  add_row(size, T_alphavit);
  // for (var i = 0; i < T_alphavit.length+1; i++) {
  //   var tr = document.createElement('tr');
  //   for (var j = 0; j < size+1; j++) {
  //     var td = document.createElement('td');
  //     td.innerHTML = T_alphavit[i];
  //     tr.appendChild(td);
  //   }
}
  

function add_row(size=document.getElementById('row_name').value, T_alphavit=document.getElementById('T').value){
    
  for (var i = 0; i < size; i++) {
    var tr = document.createElement('tr');
    td = document.createElement('td');
    td.innerHTML = "q"+q_rows;
    tr.appendChild(td);
    for (var j = 1; j < T_alphavit.length+1; j++) {
      var td = document.createElement('td');
      var input_field = document.createElement('input');
      input_field.type = "text";
      input_field.name = "q"+q_rows+"_"+T_alphavit[j-1];
      input_field.className = "q_commands__field";
      td.appendChild(input_field);
      td.className = "q_commands";
      tr.appendChild(td);
    }
    q_rows++

    document.getElementById('table').appendChild(tr);
  }
}
function run() {
  var input = document.getElementById('input_tape').value;
  var T_alphavit = document.getElementById('T').value;  
  var size = document.getElementById('size').value;
  var q_commands = document.getElementsByClassName('q_commands__field');
  let data = {
    
  }
  for (var i = 0; i < q_commands.length; i++) {
    let q_command = q_commands[i].getAttribute('name');
    if (q_commands[i].value != "") {
      const q_t = q_command.split("_")[1];
      const q_n = q_command.split("_")[0];
      
      data[q_n] = { ...data[q_n], [q_t] : q_commands[i].value}
    }
  }
  let response = fetch('/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',

    },
    body: JSON.stringify({input: input, size: size, T_alphavit: T_alphavit, data: data})
  }).then(response => response.json())
  .then(data => {
    console.log(data);
    data_field = document.getElementById('output');
    for (const key in data) {
      if(key != ""){
        let tr = document.createElement('tr');
        let td = document.createElement('td');
        td.innerHTML = key;
        tr.appendChild(td);
        for (const key2 in data[key]) {
          if(data[key][key2] != ""){
            let td = document.createElement('td');
            td.innerHTML = data[key][key2];
            tr.appendChild(td);
          }
        }
        data_field.appendChild(tr);
    }
    }
  });
  
}
requestpost = document.getElementById('run');
requestpost.addEventListener('submit', run);
function from_file() {
  var file = document.getElementById('file').files[0];
  var reader = new FileReader();
  const input = document.getElementsByClassName('q_commands__field');
  reader.onload = function() {
    var contents = reader.result;
    contents = JSON.parse(contents);
    for (const key in contents) {
      for (const key2 in contents[key]) {
        console.log(key+"_"+key2);
        console.log(contents[key][key2]);
        input[key+"_"+key2].value = contents[key][key2];
      }
    }
  }
  reader.readAsText(file);
}

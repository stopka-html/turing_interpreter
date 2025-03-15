let q_rows = 0
let is_created = false

const size_value = document.getElementById('size')
const T_value = document.getElementById('T')

document.onload = () => {
	size_value = 1
	generate_table()
}

document.addEventListener('DOMContentLoaded', () => {
	const data = JSON.parse(localStorage.getItem('data'))
	if (data != null) read_from_var(data, data['size'], data['T_alphavit'])
})

// save data
setInterval(() => {
	if (is_created) {
		let data = get_inputs()
		data['size'] = size_value.value
		data['T_alphavit'] = T_value.value
		localStorage.setItem('data', JSON.stringify(data))
	}
}, 60000) // 60 sec

function generate_table() {
	document.getElementById('table').innerHTML = ''
	q_rows = 0

	const tr = document.createElement('tr')
	const td = document.createElement('td')
	td.className = 'q_name'
	td.innerHTML = 'q'

	tr.appendChild(td) // q name
	for (let i = 0; i < T_value.value.length; i++) {
		const td = document.createElement('td')
		td.innerHTML = T_value.value[i]
		tr.appendChild(td) // T
	}

	document.getElementById('table').appendChild(tr)
	add_row(size_value.value, T_value.value)
}

// add row
function add_row(size = 1, T_alphavit = T_value.value) {
	for (var i = 0; i < size; i++) {
		var tr = document.createElement('tr')
		td = document.createElement('td')
		td.innerHTML = 'q' + q_rows
		tr.appendChild(td)

		for (var j = 1; j < T_alphavit.length + 1; j++) {
			var td = document.createElement('td')
			var input_field = document.createElement('input')
			input_field.type = 'text'
			input_field.name = 'q' + q_rows + '_' + T_alphavit[j - 1]
			input_field.className = 'q_commands__field'
			td.appendChild(input_field)
			td.className = 'q_commands'
			tr.appendChild(td)
		}
		q_rows++

		document.getElementById('table').appendChild(tr)
	}
}

function remove_row() {
	const table = document.getElementById('table')
	table.deleteRow(table.rows.length - 1)
}

// get all inputs
function get_inputs() {
	var q_commands = document.getElementsByClassName('q_commands__field')
	var data = {}

	for (var i = 0; i < q_commands.length; i++) {
		let q_command = q_commands[i].getAttribute('name')
		if (q_commands[i].value != '') {
			const q_t = q_command.split('_')[1]
			const q_n = q_command.split('_')[0]

			data[q_n] = { ...data[q_n], [q_t]: q_commands[i].value }
		}
	}
	return data
}

// post to flask and get program
function run() {
	var input = document.getElementById('input_tape').value
	var T_alphavit = document.getElementById('T').value
	var size = document.getElementById('size').value
	var num_steps = document.getElementById('num_steps').value
	var data = get_inputs()

	if (Object.keys(data).length == 0) {
		const div_output = document.getElementById('output')
		const p = document.createElement('p')
		p.innerHTML = 'No data'
		div_output.appendChild(p)
		return
	}

	fetch('/run', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ input: input, num_steps: num_steps, size: size, T_alphavit: T_alphavit, data: data }),
	})
		.then((response) => response.json())
		.then((data) => {
			data_field = document.getElementById('output')
			for (const key in data) {
				if (key != '') {
					let tr = document.createElement('tr')
					let td = document.createElement('td')
					td.innerHTML = key
					tr.appendChild(td)
					for (const key2 in data[key]) {
						if (data[key][key2] != '') {
							let td = document.createElement('td')
							td.innerHTML = data[key][key2]
							tr.appendChild(td)
						}
					}
					data_field.appendChild(tr)
				}
			}
		})
}

function read_from_var(data, size, T) {
	delete data['size']
	delete data['T_alphavit']
	document.getElementById('size').value = size
	document.getElementById('T').value = T
	generate_table()
	const input = document.getElementsByClassName('q_commands__field')
	for (const key in data) {
		for (const key2 in data[key]) input[key + '_' + key2].value = data[key][key2]
	}
}

// read json from file
function from_file() {
	const reader = new FileReader()
	const file = document.getElementById('file').files[0]
	const input = document.getElementsByClassName('q_commands__field')

	reader.onload = () => {
		const contents = JSON.parse(reader.result)
		for (const key in contents) {
			for (const key2 in contents[key]) input[key + '_' + key2].value = contents[key][key2]
		}
	}

	reader.readAsText(file)
}

//write json commands to file
function write_and_download() {
	// const input = document.getElementsByClassName('q_commands__field')
	const data = get_inputs()
	const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data))
	const downloadAnchorNode = document.createElement('a')
	downloadAnchorNode.setAttribute('href', dataStr)
	downloadAnchorNode.setAttribute('download', 'table_commands.json')
	document.body.appendChild(downloadAnchorNode) // required for firefox
	downloadAnchorNode.click()
	downloadAnchorNode.remove()
}

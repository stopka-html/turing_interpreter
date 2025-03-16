let q_rows = 0
let is_created = false

const size_value = document.getElementById('size')
const T_value = document.getElementById('T')
const table = document.getElementById('table')
const q_commands__label = document.getElementsByClassName('q_commands__label')

size_value.value = 50

generate_table()

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
	table.innerHTML = ''
	q_rows = 0

	const fragment = document.createDocumentFragment()

	const tr = document.createElement('tr')
	const td = document.createElement('td')

	tr.appendChild(td) // q name

	for (let i = 0; i < T_value.value.length; i++) {
		const td = document.createElement('td')
		const input = document.createElement('input')

		input.className = 'q_commands__label'
		input.value = T_value.value[i]

		td.appendChild(input)
		tr.appendChild(td)
	}

	fragment.appendChild(tr)

	table.appendChild(fragment)
	add_row(size_value.value, T_value.value, fragment)
}

function add_row(size = 1, T_alphavit = T_value.value) {
	const fragment = document.createDocumentFragment()

	for (let i = 0; i < size; i++) {
		const tr = document.createElement('tr')
		const td = document.createElement('td')
		td.innerHTML = 'q' + q_rows
		tr.appendChild(td)

		for (let j = 1; j < T_alphavit.length + 1; j++) {
			const td = document.createElement('td')
			td.className = 'q_commands'

			const input_field = document.createElement('input')
			input_field.type = 'text'
			input_field.name = 'q' + q_rows + '_' + T_alphavit[j - 1]
			input_field.className = 'q_commands__field'

			td.appendChild(input_field)
			input_field.focus()

			tr.appendChild(td)
		}

		q_rows++

		fragment.appendChild(tr)
	}

	table.appendChild(fragment)
}

const q_commands = document.getElementsByClassName('q_commands')

const remove_row = () => table.deleteRow(table.rows.length - 1)

// get all inputs
function get_inputs() {
	const q_commands = document.getElementsByClassName('q_commands__field')
	let data = {}

	for (let i = 0; i < q_commands.length; i++) {
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
	const input = document.getElementById('input_tape').value
	const num_steps = document.getElementById('num_steps').value
	const data = get_inputs()

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
		body: JSON.stringify({ input: input, num_steps: num_steps, size: size_value.value, T_alphavit: q_commands__label, data: data }),
	})
		.then((response) => response.json())
		.then((data) => {
			data_field = document.getElementById('output')
			data_field.innerHTML = ''
			for (const key in data) {
				if (key != '') {
					const tr = document.createElement('tr')
					for (const key2 in data[key])
						if (data[key][key2] != '') {
							let span = document.createElement('span')
							span.innerHTML = data[key][key2]
							tr.appendChild(span)
						}

					data_field.appendChild(tr)
				}
			}
		})
}

function read_from_var(data, size, T) {
	delete data['size']
	delete data['T_alphavit']
	size_value.value = size
	T_value.value = T
	generate_table()
	const input = document.getElementsByClassName('q_commands__field')
	for (const key in data) for (const key2 in data[key]) input[key + '_' + key2].value = data[key][key2]
}

// read json from file
function importFromFile() {
	const reader = new FileReader()
	const input = document.getElementsByClassName('q_commands__field')

	const fileInput = document.getElementById('file')
	const files = fileInput.files
	const lastFile = files[files.length - 1]

	generate_table()

	reader.onload = () => {
		const contents = JSON.parse(reader.result)
		for (const key in contents) for (const key2 in contents[key]) input[key + '_' + key2].value = contents[key][key2]
	}

	reader.readAsText(lastFile)
}

//write json commands to file
function write_and_download() {
	const data = get_inputs()
	const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data))
	const downloadAnchorNode = document.createElement('a')
	downloadAnchorNode.setAttribute('href', dataStr)
	downloadAnchorNode.setAttribute('download', 'table_commands.json')
	document.body.appendChild(downloadAnchorNode) // required for firefox
	downloadAnchorNode.click()
	downloadAnchorNode.remove()
}

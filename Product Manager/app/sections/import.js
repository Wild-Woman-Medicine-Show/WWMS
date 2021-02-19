module.exports = {
	title: 'Import',
	css: ``,
	html: `
		<table cellpadding="0" cellspacing="0" border="0">
			<tbody id="model-select">
				<tr><td style="text-align: right">
					<button data-model="Blend" active>Blends</button>
					<button data-model="Product">Products</button>
					<button data-model="Variant">Variants</button>
					<button data-model="Shopify">Shopify</button>
				</td></tr>
			</tbody>
		</table>
		<form id="import-form">
			<table cellpadding="0" cellspacing="0" border="0">
				<tbody>
					<tr><td>
						<div class="file-wrapper">
							<input type="text" id="file-path" readonly>
							<button id="file-open">Browse Files</button>
							<input type="file" id="file-input" style="width: 0; visibility: hidden">
						</div>
					</td></tr>
				</tbody>
			</table>
		</form>
		<table id="preview-table" cellpadding="0" cellspacing="0" border="0" hidden>
			<tbody>
			</tbody>
		</table>
		<table id="confirm-table" cellpadding="0" cellspacing="0" border="0" hidden>
			<tbody>
				<tr><td style="text-align: right; background-color: var(--bg-color-orange-02); padding: 0.15in;">
					This operation will overwrite any existing records whose titles match those in the table above
				</td></tr>
				<tr><td style="text-align: right">
					<button id="confirm-button">Confirm</button>
					<button id="reset-button" style="background-color: var(--bg-color-red-02)">Reset</button>
				</td></tr>
				<tr id="progress-indicator"><td></td></tr>
			</tbody>
		</table>
	`,
	scripts: [
		function(section) {
			const buttons = section.nodes.shadow.querySelectorAll('#model-select button')
			let active = null

			for(const button of buttons) {
				if(button.hasAttribute('active')) active = button
				button.addEventListener('click', function() {
					if(active) active.removeAttribute('active')
					button.setAttribute('active', true)
					active = button
				})
			}
		},
		function(section) {
			const parse = require('csv-parse')
			const mongoose = require('mongoose')
			const models = require('../schemas.js')
			const reader = new FileReader()
			let result = []

			const import_form = section.nodes.shadow.querySelector('#import-form')
			const file_input = import_form.querySelector('#file-input')
			const preview_table = section.nodes.shadow.querySelector('#preview-table')
			const confirm_table = section.nodes.shadow.querySelector('#confirm-table')
			const confirm_button = confirm_table.querySelector('#confirm-button')
			const reset_button = confirm_table.querySelector('#reset-button')

			const progress_indicator = (function(){
				const progress_wrapper = section.nodes.shadow.querySelector('#progress-indicator')
				const progress_element = progress_wrapper.querySelector('td')

				return {
					set progress(value) {
						progress_element.style.width = value + '%'
					}
				}
			})()

			function get_active_model() {
				return section.nodes.shadow.querySelector('#model-select button[active]').dataset.model
			}

			function reset_form() {
				import_form.reset()
			}
			function reset_preview() {
				preview_table.setAttribute('hidden', true)
				confirm_table.setAttribute('hidden', true)
				preview_table.innerHTML = ''
			}

			function preview_data() {
				if(!result) return

				reset_preview()

				const headers = Object.keys(models[get_active_model()].model.schema.obj)
				const header_row = preview_table.insertRow(-1)

				for(let header of headers) {
					Object.assign(header_row.insertCell(-1), { textContent: header })
				}

				for(let row of result) {
					const table_row = preview_table.insertRow(-1)
					for(let key of headers) {
						const node = Object.assign(table_row.insertCell(-1), { textContent: row[key], contentEditable: true })
						Object.defineProperty(row, key, {
							get() {
								return node.textContent.trim()
							},
							set(value) {
								node.textContent = value
								return true
							}
						})
					}
				}

				preview_table.removeAttribute('hidden')
				confirm_table.removeAttribute('hidden')
			}

			function process_data() {
				const active_model = get_active_model()

				const data = []

				if(active_model === 'Shopify') {
					const products = { model_name: 'Product', records: [] }
					const variants = { model_name: 'Variant', records: [] }
					data.push(products, variants)
					for(const record of result) {
						if(record.Title !== '') products.records.push(record)
						variants.records.push(record)
					}
				} else {
					data.push({
						model_name: active_model,
						records: result
					})
				}

				return data
			}

			async function save_data(data) {
				mongoose.connect('mongodb://localhost/wwms_pm', { useNewUrlParser: true, useUnifiedTopology: true });
				await new Promise(resolve => mongoose.connection.once('open', resolve))

				for(const { model_name, records } of data) {
					const { model, unique } = models[model_name]
					if(!model) throw new Error(`Invalid model "${model_name}"`)

					for(let ai = 0, al = records.length; ai < al; ++ai) {
						progress_indicator.progress = parseInt((ai + 1) * 100 / al)
						record = records[ai]

						const existing = unique ? await model.findOne({ [unique]: record[unique] }).exec() : null
						if(existing) {
							await existing.overwrite(record)
						} else {
							const reference = new model(record)
							await reference.save(error => {
								if(error) throw error
							})
						}
					}
				}

				mongoose.connection.close()

				progress_indicator.progress = 0
			}

			reader.addEventListener('load', e => {
				parse(e.target.result, { 'columns': true }, (error, output) => {
					if(error) throw error;
					result = output
					preview_data()
				})
			})

			file_input.addEventListener('change', e => {
				reader.readAsText(file_input.files[0])
			})

			import_form.addEventListener('submit', e => {
				e.preventDefault()
			})

			confirm_button.addEventListener('click', e => {
				const data = process_data()
				save_data(data)
			})

			reset_button.addEventListener('click', e => {
				e.preventDefault()
				reset_form()
				reset_preview()
			})
		}
	]
}
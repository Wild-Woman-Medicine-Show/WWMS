module.exports = {
	title: 'Modify',
	css: ``,
	html: `
		<table cellpadding="0" cellspacing="0" border="0">
			<tbody id="model-select">
				<tr><td style="text-align: right">
					<button data-model="Blend" active>Blends</button>
					<button data-model="Product">Products</button>
					<button data-model="Variant">Variants</button>
					<button data-model="Shopify" disabled>Shopify</button>
				</td></tr>
			</tbody>
		</table>
		<table id="preview-table" cellpadding="0" cellspacing="0" border="0" hidden>
			<tbody>
			</tbody>
		</table>
		<table id="confirm-table" cellpadding="0" cellspacing="0" border="0" hidden>
			<tbody>
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
			const mongoose = require('mongoose')
			const models = require('../schemas.js')
			let model = null, unique = null, data = []

			const buttons = section.nodes.shadow.querySelectorAll('#model-select button')
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

			function reset_preview() {
				preview_table.setAttribute('hidden', true)
				confirm_table.setAttribute('hidden', true)
				preview_table.innerHTML = ''
			}

			async function select_data({ model }) {
				mongoose.connect('mongodb://localhost/wwms_pm', { useNewUrlParser: true, useUnifiedTopology: true });
				await new Promise(resolve => mongoose.connection.once('open', resolve))

				const data = await model.find()

				mongoose.connection.close()

				return data
			}

			function preview_data({ data }) {
				if(!data) return

				reset_preview()

				const headers = Object.keys(models[get_active_model()].model.schema.obj)
				const header_row = preview_table.insertRow(-1)

				for(let header of headers) {
					Object.assign(header_row.insertCell(-1), { textContent: header })
				}

				for(let row_key in data) {
					const row = data[row_key]
					const new_row = {}
					const table_row = preview_table.insertRow(-1)
					for(let key of headers) {
						const node = Object.assign(table_row.insertCell(-1), { textContent: row[key], contentEditable: true })
						Object.defineProperty(new_row, key, {
							get() {
								return node.textContent.trim()
							},
							set(value) {
								node.textContent = value
								return true
							}
						})
					}
					data[row_key] = new_row
				}

				preview_table.removeAttribute('hidden')
				confirm_table.removeAttribute('hidden')

				return data
			}

			function flatten(obj) {
				const flat = []
				const headers = Object.keys(models[get_active_model()].model.schema.obj)
				for(let header of headers) flat[header] = obj[header]
				return flat
			}

			function process_data({ data }) {
				const active_model = get_active_model()

				const processed = []

				if(active_model === 'Shopify') {
					const products = { model_name: 'Product', records: [] }
					const variants = { model_name: 'Variant', records: [] }
					processed.push(products, variants)
					for(const record of data) {
						if(record.Title !== '') products.records.push(flatten(record))
						variants.records.push(flatten(record))
					}
				} else {
					for(let key in data) data[key] = flatten(data[key])
					processed.push({
						model_name: active_model,
						records: data
					})
				}

				return processed
			}

			async function save_data({ model, unique, records }) {
				mongoose.connect('mongodb://localhost/wwms_pm', { useNewUrlParser: true, useUnifiedTopology: true });
				await new Promise(resolve => mongoose.connection.once('open', resolve))

				if(!model) throw new Error(`Invalid model "${model_name}"`)

				for(let ai = 0, al = records.length; ai < al; ++ai) {
					progress_indicator.progress = parseInt((ai + 1) * 100 / al)
					record = records[ai]

					const existing = unique ? await model.findOne({ [unique]: record[unique] }).exec() : null
					if(existing) {
						await existing.overwrite(record)
						await existing.save()
					} else {
						const reference = new model(record)
						await reference.save(error => {
							if(error) throw error
						})
					}
				}

				mongoose.connection.close()

				progress_indicator.progress = 0
			}

			async function display_model({ model, unique }) {
				data = await select_data({ model })
				data = preview_data({ data })
			}

			for(const button of buttons) {
				if(button.hasAttribute('active')) display_model(models[button.dataset.model])
				button.addEventListener('click', () => display_model(models[button.dataset.model]))
			}

			confirm_button.addEventListener('click', e => {
				const processed = process_data({ data })
				for(const { model_name, records } of processed) {
					const { model, unique } = models[model_name]
					save_data({ model, unique, records })
				}
			})

			reset_button.addEventListener('click', e => {
				e.preventDefault()
				reset_form()
				reset_preview()
			})
		}
	]
}
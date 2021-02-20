module.exports = class Product_Manager {
	#mongoose = require('mongoose')
	#models = require('../schemas.js')
	#parse = require('csv-parse')
	#reader = new FileReader()
	#model = ''
	#models_disabled = []
	#actions = ['Import','Modify','Export']
	#action = ''
	#data = []
	#nodes = { }
	#root = null

	constructor(root) {
		this.init(root)
	}

	init(root) {
		this.#root = root

		root.innerHTML =  `
					<div class="_heading">
						<h2>Product Manager</h2>
					</div>
					<div class="_content">
						<table id="action-select" cellpadding="0" cellspacing="0" border="0">
							<tbody>
								<tr><td style="text-align: right">
									<button data-action="Import" active>Import</button>
									<button data-action="Modify" data-disable='["Shopify"]'>Modify</button>
									<button data-action="Export">Export</button>
								</td></tr>
							</tbody>
						</table>
						<table id="model-select" cellpadding="0" cellspacing="0" border="0">
							<tbody>
								<tr><td style="text-align: right">
									<button data-model="Blend" active>Blends</button>
									<button data-model="Product">Products</button>
									<button data-model="Variant">Variants</button>
									<button data-model="Shopify">Shopify</button>
								</td></tr>
							</tbody>
						</table>
						<table id="import-table"  cellpadding="0" cellspacing="0" border="0" hidden>
							<tbody>
								<tr><td>
									<form class="file-wrapper">
										<input type="text" id="file-path" readonly>
										<button id="file-open">Browse Files</button>
										<input type="file" id="import-file" style="width: 0; visibility: hidden">
									</form>
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
					</div>
		`

		this.#nodes.import_table = root.querySelector('#import-table')
		this.#nodes.import_form = this.#nodes.import_table.querySelector('form')
		this.#nodes.import_file = this.#nodes.import_table.querySelector('#import-file')
		this.#nodes.preview_table = root.querySelector('#preview-table')
		this.#nodes.confirm_table = root.querySelector('#confirm-table')
		this.#nodes.confirm_button = this.#nodes.confirm_table.querySelector('#confirm-button')
		this.#nodes.reset_button = this.#nodes.confirm_table.querySelector('#reset-button')
		this.#nodes.progress_indicator = (() => {
			const progress_wrapper = this.#nodes.confirm_table.querySelector('#progress-indicator')
			const progress_element = progress_wrapper.querySelector('td')

			return {
				set progress(value) {
					progress_element.style.width = value + '%'
				}
			}
		})()

		;(() => {
			const wrapper = this.#nodes.import_form
			const file = { path:null, open:null, target:null }
			for(let child of wrapper.children) {
				if(file.path && file.open && file.target) break
				if(child.id === 'file-path') file.path = child
				if(child.id === 'file-open') file.open = child
				if(child.id === 'import-file') file.target = child
			}
            
            file.path.addEventListener('click', e => {
            	if(file.path.value === "") file.target.click()
            })
            file.path.addEventListener('dblclick', e => {
            	file.target.click()
            })
            file.open.addEventListener('click', e => {
                e.preventDefault()
                file.target.click()
            })
            file.target.addEventListener('change', e => {
            	file.path.value = file.target.files[0].path
            })
		})()

		;(() => {
			const buttons = root.querySelectorAll('#model-select button')

			this.#nodes.model_select = {}

			for(const button of buttons) {
				this.#nodes.model_select[button.dataset.model] = button

				const handle = e => {
					e && e.preventDefault()

					this.model = button.dataset.model
				}

				if(button.hasAttribute('active')) handle()
				button.addEventListener('click', handle)
			}
		})()

		;(() => {
			const buttons = root.querySelectorAll('#action-select button')

			this.#nodes.action_select = {}

			for(const button of buttons) {
				this.#nodes.action_select[button.dataset.action] = button

				const handle = e => {
					e && e.preventDefault()

					this.action = button.dataset.action
					this.models_disabled = button.dataset.disable ? JSON.parse(button.dataset.disable) : []
				}

				if(button.hasAttribute('active')) handle()
				button.addEventListener('click', handle)
			}
		})()

		this.#reader.addEventListener('load', e => {
			this.#parse(e.target.result, { 'columns': true }, (error, result) => {
				this.reset_preview()

				if(error) throw error;

				this.#data = result
				this.preview_data()
			})
		})

		this.#nodes.import_file.addEventListener('change', e => {
			this.#reader.readAsText(this.#nodes.import_file.files[0])
		})

		this.#nodes.import_form.addEventListener('submit', e => {
			e.preventDefault()
		})

		this.#nodes.confirm_button.addEventListener('click', e => {
			const processed = this.process_data()

			for(const { model, data } of processed) {
				this.#model = model
				this.#data = data
				this.save_data()
			}
		})

		this.#nodes.reset_button.addEventListener('click', e => {
			e.preventDefault()
			this.reset_import()
			this.reset_preview()
		})
	}

	get models() {
		return Object.assign(Object.create(null), this.#models)
	}
	set models(value) {}

	get models_disabled() {
		return Object.assign(Object.create(null), this.#models_disabled)
	}
	set models_disabled(models) {
		if(models instanceof Array) {
			for(const model in this.#nodes.model_select) {
				const model_selector = this.#nodes.model_select[model]
				if(models.includes(model)) {
					if(this.#model === model_selector.dataset.model) {
						const keys = Object.keys(this.#nodes.model_select)
						const remaining = keys.filter(e => !models.includes(e))
						this.model = remaining[0]
					}
					model_selector.setAttribute('disabled', true)
				} else if(model_selector.hasAttribute('disabled')) {
					model_selector.removeAttribute('disabled')
				}
			}
		}
	}

	get model() {
		return this.#model
	}
	set model(model) {
		if(this.#models[model] && !this.#models_disabled.includes(model)) {
			if(this.#model) this.#nodes.model_select[this.#model].removeAttribute('active')
			this.#nodes.model_select[model].setAttribute('active', true)
			this.#model = model

			this.reset_preview()

			;(async () => {
				if(this.#action && this.#action !== 'Import') await this.select_data()
				this.preview_data()
			})()
		}
	}

	get action() {
		return this.#action
	}
	set action(action) {
		if(this.#actions.includes(action)) {
			if(this.#action === 'Import') {
				if(action !== 'Import') {
					this.#nodes.import_table.setAttribute('hidden', true)
				}
				this.reset_import()
			}
			this.reset_preview()

			if(this.#action !== action) {
				this.#data = []

				;({
					Import: () => {
						this.#nodes.import_table.removeAttribute('hidden')
					},
					Modify: async () => {
						await this.select_data()
						this.preview_data()
					},
					Export: async () => {
						await this.select_data()
						this.preview_data()
					}
				})[action]()
			}

			if(this.#action) this.#nodes.action_select[this.#action].removeAttribute('active')
			this.#nodes.action_select[action].setAttribute('active', true)
			this.#action = action
		}
	}

	get data() {
		return this.#data
	}
	set data(value) {}

	get headers() {
		return ['_id', ...Object.keys(this.#models[this.#model].model.schema.obj)]
	}
	set headers(value) {}

	reset_import() {
		this.#nodes.import_form.reset()
	}

	reset_preview() {
		this.#nodes.preview_table.setAttribute('hidden', true)
		this.#nodes.confirm_table.setAttribute('hidden', true)
		this.#nodes.preview_table.innerHTML = ''
	}

	async select_data() {
		this.#mongoose.connect('mongodb://localhost/wwms_pm', { useNewUrlParser: true, useUnifiedTopology: true });
		await new Promise(resolve => this.#mongoose.connection.once('open', resolve))

		this.#data = await this.#models[this.#model].model.find({})

		this.#mongoose.connection.close()
	}

	preview_data() {
		this.reset_preview()

		if(!this.data.length) return

		const headers = this.headers
		const header_row = this.#nodes.preview_table.insertRow(-1)

		for(let header of headers) {
			Object.assign(header_row.insertCell(-1), { textContent: header })
		}

		for(let row_key in this.#data) {
			const row = this.#data[row_key]
			const table_row = this.#nodes.preview_table.insertRow(-1)
			for(let key of headers) {
				const node = Object.assign(table_row.insertCell(-1), { textContent: row[key], contentEditable: key === '_id' ? false : true })
				Object.defineProperty(row, key, {
					get() {
						return node.textContent
					},
					set(value) {
						node.textContent = value
						return true
					},
					configurable: true
				})
			}
		}

		this.#nodes.preview_table.removeAttribute('hidden')
		this.#nodes.confirm_table.removeAttribute('hidden')
	}

	process_data() {
		const processed = []

		if(this.#model === 'Shopify') {
			const products = { model_name: 'Product', data: [] }
			const variants = { model_name: 'Variant', data: [] }
			processed.push(products, variants)

			for(let record of data) {
				if(record.Title !== '') products.data.push(record)
				variants.records.push(record)
			}
		} else {
			processed.push({ model: this.#model, data: this.#data })
		}

		return processed
	}

	flatten_data(obj) {
		const flat = []
		for(let header of this.headers) flat[header] = obj[header]
		return flat
	}

	async save_data() {
		this.#mongoose.connect('mongodb://localhost/wwms_pm', { useNewUrlParser: true, useUnifiedTopology: true });
		await new Promise(resolve => this.#mongoose.connection.once('open', resolve))
		const { model, unique } = this.#models[this.#model]

		for(let ai = 0, al = this.#data.length; ai < al; ++ai) {
			this.#nodes.progress_indicator.progress = parseInt((ai + 1) * 100 / al)
			const record = this.flatten_data(this.#data[ai])
			
			const condition = record._id ? { _id: record._id } : (unique.length ? { $and: unique.map(e => ({ [e]: record[e] })) } : null)
			const query = condition ? await model.findOne(condition).exec() : null
			if(query) {
				console.log(`Overwriting: "${record.Title}"`)
				await query.overwrite(record)
				await query.save()
			} else {
				console.log(`Writing: "${record.Title}"`)
				delete record._id
				const reference = new model(record)
				await reference.save()
			}
		}

		this.#mongoose.connection.close()

		this.#nodes.progress_indicator.progress = 0
	}
}
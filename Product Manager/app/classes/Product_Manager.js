module.exports = class Product_Manager {
	#electron = require('electron')
	#mongoose = null
	#models = require('../schemas.js')
	#csv_parse = require('csv-parse')
	#csv_stringify = require('csv-stringify')
	#reader = null
	#model = ''
	#models_disabled = []
	#actions = ['Import','Modify','Export']
	#action = ''
	#query = {}
	#data = []
	#nodes = {}

	constructor(root) {
		this.init(root)
	}

	init(root) {
		root.innerHTML =  `
			<div id="title-bar">
				<div id="title">Product Manager</div>
				<div id="window-buttons">
					<button class="window-button" data-action="minimize">&#128469;</button>
					<button class="window-button" data-action="maximize">&#128470;</button>
					<button class="window-button" data-action="close">&#128473;</button>
				</div>
			</div>
			<div id="content">
				<table id="utilities-table">
					<tbody>
						<tr>
							<td colspan="2">
								<div class="flex" style="justify-content: flex-end">
									<div id="action-select" class="button-set">
										<button class="action-button" data-action="Import" active>Import</button>
										<button class="action-button" data-action="Modify">Modify</button>
										<button class="action-button" data-action="Export">Export</button>
									</div>
								</div>
							</td>
						</tr>
					</tbody>
					<tbody>
						<tr>
							<td id="search">
								<form id="search-form">
									<input type="text" id="search-input">
									<button class="search-button" data-action="submit">&#128269;</button>
									<button class="search-button" data-action="reset">&#128473;</button>
								</form>
							</td>
							<td>
								<div id="model-select" class="button-set">
									<button class="model-button" data-model="Blend" active>Blends</button>
									<button class="model-button" data-model="Product">Products</button>
									<button class="model-button" data-model="Variant">Variants</button>
									<button class="model-button" data-model="Shopify">Shopify</button>
								</div>
							</td>
						</tr>
					</tbody>
					<tbody id="import-file">
						<tr>
							<td colspan="2">
								<form id="import-file-form">
									<input type="file" id="import-file-input">
								</form>
							</td>
						</tr>
					</tbody>
				</table>
				<table id="preview" hidden>
					<tbody>
					</tbody>
				</table>
				<table id="confirm-select" hidden style="padding-bottom: 0;">
					<tbody>
						<tr><td style="padding-bottom: 8px">
							<div class="button-set">
								<button class="confirm-button" data-action="confirm">Confirm</button>
							    <button class="confirm-button" data-action="reset">Reset</button>
							</div>
						</td></tr>
					</tbody>
					<tbody>
						<tr id="progress">
							<td id="progress-indicator"></td>
						</tr>
					</tbody>
				</table>
			</div>
		`

		this.#nodes.root 			   = root
		this.#nodes.window_buttons 	   = (() => {
			// Window Buttons
			const window_buttons = {}

			window_buttons.root = this.#nodes.root.querySelector('#window-buttons')

			const buttons = window_buttons.root.querySelectorAll('.window-button')

			for(const button of buttons) {
				window_buttons[button.dataset.action] = button
			}

			window_buttons.minimize.addEventListener('click', e => {
				const window = this.#electron.remote.getCurrentWindow()
				if(window.isMinimized()) window.restore()
				else window.minimize()
				
			})
			window_buttons.maximize.addEventListener('click', e => {
				const window = this.#electron.remote.getCurrentWindow()
				if(window.isMaximized()) window.unmaximize()
				else window.maximize()
			})
			window_buttons.close.addEventListener('click', e => {
				this.#electron.remote.getCurrentWindow().close()
			})

			return window_buttons
		})()
        this.#nodes.import_file        = (() => {
            // Import File Selector
            const import_file = {}

            import_file.root  = this.#nodes.root.querySelector('#import-file')
			import_file.form  = import_file.root.querySelector('#import-file-form')
            import_file.input = import_file.root.querySelector('#import-file-input')
            
            import_file.path = (() => {
            	const path = document.createElement('input')
            	path.type = 'text'
            	path.id = 'import-file-path'
            	path.setAttribute('readonly', '')
            	return import_file.form.appendChild(path)
            })()
            import_file.open = (() => {
            	const open = document.createElement('button')
            	open.id = 'import-file-open'
            	open.textContent = 'Browse Files'
            	return import_file.form.appendChild(open)
            })()

            const trigger_file_input = (e) => {
                e && e.preventDefault()
                import_file.input.click()
            }

            const read_file = (e) => {
            	e && e.preventDefault()
            	const file = import_file.input.files[0]
                import_file.path.value = file.path
				this.#reader.readAsText(file)
            }
            
            import_file.path.addEventListener('click', e => {
                if(import_file.path.value === "") trigger_file_input()
            })
            import_file.path.addEventListener('dblclick', trigger_file_input)
            import_file.open.addEventListener('click', trigger_file_input)
            import_file.input.addEventListener('change', read_file)
			import_file.form.addEventListener('submit', read_file)

            return import_file
        })()
		this.#nodes.model_select       = (() => {
			// Model selector
			const model_select = {}

			model_select.root = this.#nodes.root.querySelector('#model-select')

			const buttons = model_select.root.querySelectorAll('.model-button')

			for(const button of buttons) {
				model_select[button.dataset.model] = button

				const handle = e => {
					e && e.preventDefault()

					this.model = button.dataset.model
				}

				if(button.hasAttribute('active')) process.nextTick(handle)
				button.addEventListener('click', handle)
			}

			return model_select
		})()
		this.#nodes.action_select      = (() => {
			// Action Selector
			const action_select = {}

			action_select.root = this.#nodes.root.querySelector('#action-select')

			const buttons = action_select.root.querySelectorAll('.action-button')

			for(const button of buttons) {
				action_select[button.dataset.action] = button

				const handle = e => {
					e && e.preventDefault()

					this.action = button.dataset.action
					this.models_disabled = button.dataset.disable ? JSON.parse(button.dataset.disable) : []
				}

				if(button.hasAttribute('active')) process.nextTick(handle)
				button.addEventListener('click', handle)
			}

			return action_select
		})()
		this.#nodes.preview            = (() => {
			// Preview
			const preview = {}

			preview.root = this.#nodes.root.querySelector('#preview')

			return preview
		})()
		this.#nodes.confirm_select     = (() => {
			// Confirmation / Reset Buttons
			const confirm_select = {}

			confirm_select.root = this.#nodes.root.querySelector('#confirm-select')

			const buttons = confirm_select.root.querySelectorAll('.confirm-button')

			for(const button of buttons) {
				confirm_select[button.dataset.action] = button
			}

			confirm_select.confirm.addEventListener('click', async e => {
				if(this.#action === 'Import' || !/Shopify/.test(this.#model)) {
					const data = this.#data
					const model = this.#model
					const processed = this.process_data()

					for(const model in processed) {
						this.#model = model
						this.#data = processed[model]
						await this.save_data()
					}

					this.#data = data
					this.#model = model
				} else {
					this.export_data()
				}
			})

			confirm_select.reset.addEventListener('click', e => {
				e.preventDefault()
				this.#data = []
				this.action = this.#action
			})

			return confirm_select
		})()
		this.#nodes.progress           = (() => {
			// Progress Indicator
			const progress = {}

			progress.root = this.#nodes.confirm_select.root.querySelector('#progress')

			progress.indicator = progress.root.querySelector('#progress-indicator')

			Object.defineProperty(progress.indicator, 'progress', { 
				set(value) { 
					progress.indicator.style.width = value + '%' 
				}
			})

			return progress
		})()

		this.#mongoose                 = (() => {
			const mongoose = require('mongoose')

			const connect = mongoose.connect

			mongoose.connect = () => {
				const server_url = `mongodb://localhost/wwms_product_manager`

				connect.call(mongoose, server_url, { useNewUrlParser: true, useUnifiedTopology: true })

				return new Promise(resolve => this.#mongoose.connection.once('open', resolve))
			}

			return mongoose
		})()
		this.#reader                   = (() => {
			// File Reader
			const reader = new FileReader()

			reader.addEventListener('load', e => {
				this.#csv_parse(e.target.result, { 'columns': true }, (error, result) => {
					this.reset_preview()

					if(error) throw error;

					this.#data = result
					this.preview_data()
				})
			})

			return reader
		})()
	}

	get models() {
		return Object.assign(Object.create(null), this.#models)
	}
	set models(value) {}

	get models_disabled() {
		return Object.assign(Object.create(null), this.#models_disabled)
	}
	set models_disabled(models_disabled) {
		if(models_disabled instanceof Array) {
			for(const model in this.#models) {
				const button = this.#nodes.model_select[model]

				if(!button) continue

				if(models_disabled.includes(model)) {
					if(this.#model === model) {
						this.model = Object.keys(this.#models).filter(e => !models_disabled.includes(e))[0]
					}
					button.setAttribute('disabled', '')
				} else if(button.hasAttribute('disabled')) {
					button.removeAttribute('disabled')
				}
			}
		}
	}

	get model() {
		return this.#model
	}
	set model(model) {
		if(this.#models[model] && !this.#models_disabled.includes(model)) {
			if(this.#model !== model) {
				if(this.#model) {
					let model_select = this.#nodes.model_select[this.#model]
					if(model_select && model_select.hasAttribute('active')) {
						model_select.removeAttribute('active')
					} else {
						model_select = this.#nodes.model_select.root.querySelector('[active]')
						if(model_select && model_select.hasAttribute('active')) {
							model_select.removeAttribute('active')
						}
					}
				}
				this.#nodes.model_select[model].setAttribute('active', '')
				this.#model = model
			}

			this.action = this.#action
		}
	}

	get action() {
		return this.#action
	}
	set action(action) {
		if(this.#actions.includes(action)) {
			const is_change = action !== this.#action

			if(is_change && action !== 'Export') {
				if(this.#action === 'Import') {
					if(action !== 'Import') {
						this.#nodes.import_file.root.setAttribute('hidden', '')
					}
					this.reset_import()
				}

				if(this.#action) this.#nodes.action_select[this.#action].removeAttribute('active')
				this.#nodes.action_select[action].setAttribute('active', '')
				this.#action = action
			}

			;({
				Import: () => {
					if(this.#nodes.import_file.root.hasAttribute('hidden')) {
						this.#nodes.import_file.root.removeAttribute('hidden')
					}
					if(is_change) this.#data = []
					this.reset_preview()
					this.preview_data()
				},
				Modify: async () => {
					this.reset_preview()
					await this.select_data()
					this.preview_data() 
				},
				Export: async () => {
					this.export_data()
				}
			})[action]()
		}
	}

	get query() {
		return Object.assign({}, this.#query)
	}
	set query(query) {
		if(query) {
			this.#query = query
			if(this.#action !== 'Import') this.select_data()
			this.preview_data()
		}
	}

	get data() {
		return Object.assign([], this.#data)
	}
	set data(value) {}

	get headers() {
		return ['_id', ...Object.keys(this.#models[this.#model].model.schema.obj)]
	}
	set headers(value) {}

	reset_import() {
		this.#nodes.import_file.form.reset()
	}

	reset_preview() {
		this.#nodes.preview.root.setAttribute('hidden', '')
		this.#nodes.confirm_select.root.setAttribute('hidden', '')
		this.#nodes.preview.root.innerHTML = ''
	}

	async select_data() {
		if(this.#model !== 'Shopify') {
			await this.#mongoose.connect()

			this.#data = await this.#models[this.#model].model.find(this.#query)

			await this.#mongoose.connection.close()
		} else {
			this.#model = 'Shopify_Export'
			this.#data = []

			await this.#mongoose.connect()

			const blends = await this.#models.Blend.model.find(this.#query)
			const products = await this.#models.Product.model.find(this.#query)

			await this.#mongoose.connection.close()

			const models = {}

			for(const Product of products) {
				models.Product = Product

				await this.#mongoose.connect()

				const variants = await this.#models.Variant.model.find(Object.assign({}, this.#query, { Handle: models.Product.Handle }))

				this.#mongoose.connection.close()

				for(const Blend of blends) {
					models.Blend = Blend

					for(const variant_index in variants) {
						models.Variant = variants[variant_index]

						const record = {
							reference: { 
								Blend: models.Blend._id,
								Product: models.Product._id,
								Variant: models.Variant._id
							}
						}
						if(!+variant_index) for(const header of Object.keys(models.Product.schema.obj)) record[header] = models.Product[header]
						for(const header of Object.keys(models.Variant.schema.obj)) record[header] = models.Variant[header]
						for(const header of Object.keys(this.#models.Shopify.model.schema.obj)) {
							if(!/Format/.test(header) || !record[header]) continue

							const target = header.replace(/ Format$/, '')

							record[target] = new Function('models', "return `" + record[header] + "`")(models)

							if(target === 'Handle') {
								record[target] = record[target].toLowerCase().replace(/\s+/g, '-')
							}
						}

						this.#data.push(new this.#models.Shopify_Export.model(record))
					}
				}
			}
		}		
	}

	async preview_data() {
		this.reset_preview()

		if(!this.data.length) return

		const insert_row = async (record) => {
			const is_header = !record

			const table_row = this.#nodes.preview.root.insertRow(-1)

			if(is_header) table_row.insertCell(-1)
			else {
				const delete_cell = Object.assign(table_row.insertCell(-1), { style: 'padding: 0' })
				const delete_button = Object.assign(delete_cell.appendChild(document.createElement('button')), { innerHTML: "&#128465;", className: 'delete-button' })
				delete_button.addEventListener('click', async () => {
					table_row.remove()

					if(record.isNew) {
						console.log(`Deleting: (new document) ${record.Title}`)
						delete this.#data[index]
					} else {
						await this.#mongoose.connect();

						const { model, unique } = this.#models[this.#model]

						console.log(`Deleting: (${record._id}) ${record.Title}`)
						const result = await model.deleteOne({ _id: record._id })
						console.log(`Result: ${result.ok ? '[OK]' : '[!!]'}`)

						this.#mongoose.connection.close()
					}

					if(!this.#data.length) this.reset_preview()
				})
			}

			for(let header of this.headers) {
				const cell = table_row.insertCell(-1)
				const flex = Object.assign(cell.appendChild(document.createElement('div')), { className: 'flex' })
				const node = Object.assign(flex.appendChild(document.createElement('div')), { textContent: is_header ? header : record[header], contentEditable: !is_header && header !== '_id' ? true : false })

				if(!is_header) {
					Object.defineProperty(record, header, {
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

			return table_row
		} 

		const header_row = await insert_row()

		for(let index in this.#data) await insert_row(this.#data[index])

		this.#nodes.preview.root.removeAttribute('hidden')
		this.#nodes.confirm_select.root.removeAttribute('hidden')
	}

	process_data() {
		const processed = {}

		if(this.#model === 'Shopify') {
			processed.Product = []
			processed.Variant = []

			for(const record of this.#data) {
				if(record.Title !== '') {
					processed.Product.push(record)
				}
				processed.Variant.push(record)
			}
		} else {
			processed[this.#model] = this.#data
		}

		return processed
	}

	flatten_data(obj) {
		const flat = []
		for(let header of this.headers) flat[header] = obj[header]
		return flat
	}

	async save_data() {
		const { model, unique } = this.#models[this.#model]

		const progress_indicator = this.#nodes.progress.indicator

		for(let ai = 0, al = this.#data.length; ai < al; ++ai) {
			progress_indicator.progress = parseInt((ai + 1) * 100 / al)

			const record = this.flatten_data(this.#data[ai])
			
			await this.#mongoose.connect();

			const condition = record._id ? { _id: record._id } : (unique.length ? { $and: unique.map(e => ({ [e]: record[e] })) } : null)
			const query = condition ? await model.findOne(condition).exec() : null
			const name = record['Variant SKU'] || record['Variant SKU Format'] || record.Title

			if(query) {
				console.log(`Saving ${this.#model}: (${query._id}) "${name}"`)

				await query.overwrite(record)
				const result = await query.save()

				console.log(`Result: ${!result.errors ? '[OK]' : '[!!]'}`)
			} else {
				console.log(`Saving ${this.#model}: (new document) "${name}"`)

				delete record._id
				const reference = new model(record)
				const result = await reference.save()

				console.log(`Result: ${!result.errors ? '[OK]' : '[!!]'}`)
			}

			await this.#mongoose.connection.close()
		}

		progress_indicator.progress = 0
	}

	async stringify_data() {
		const stringified = await new Promise(resolve => this.#csv_stringify(this.#data, { columns: Object.keys(this.#models[this.#model].model.schema.obj), header: true }, (err, output) => resolve(output)))
		return stringified
	}

	async export_data() {
		const stringified = await this.stringify_data()

        const anchor = document.createElement('a');
        anchor.href = `data:text/csv,${encodeURIComponent(stringified)}`
        anchor.download = 'Export.csv';        
        document.body.appendChild(anchor);
        anchor.click();        
        document.body.removeChild(anchor);
	}
}
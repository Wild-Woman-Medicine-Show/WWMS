module.exports = {
	title: 'Export',
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
		}
	]
}
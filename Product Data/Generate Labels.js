var globals = {}

function is_folder(folder) {
	var is_folder = false

	try {
		folder.getFiles('*')
		is_folder = true
	} catch(e) {}

	return is_folder
}

function generate_file_name() {
	var blend = globals.template.variables.getByName('Title').pageItems[0].contents.replace('/',' ')
	var line = globals.template.variables.getByName('Line').pageItems[0].contents
	return globals.template_name.replace(line, line + ' - ' + blend)
}

function export_template() {
	var output_eps_target = new File(generate_file_name().replace('Templates', 'Labels').replace(".ai", '.eps'))
	var output_eps_folder = new Folder(output_eps_target.path)
	if(!output_eps_folder.exists) output_eps_folder.create()

	var output_png_target = new File(generate_file_name().replace('Templates', 'Images').replace(".ai", '.png'))
	var output_png_folder = new Folder(output_png_target.path) 
	if(!output_png_folder.exists) output_png_folder.create()

	globals.cutline.hidden = true

	globals.template.exportFile(output_png_target, ExportType.PNG24)

	globals.cutline.hidden = false

	var saveopts = new EPSSaveOptions()
	saveopts.cmykPostScript = true
    saveopts.embedAllFonts = true
    saveopts.embedLinkedFiles = true

	globals.template.saveAs(output_eps_target, saveopts)
}

function iterate_datasets(cb) {
	var datasets = globals.template.dataSets
	if(datasets.length) {
		for(var index = datasets.length - 1; index > -1; --index) {
			datasets[index].display()
			cb()
		}
	} else {
		cb()
	}
}

function iterate_directory(folder) {
	if(is_folder(folder)) {
		var directory = folder.getFiles("*")

		for(var index = directory.length - 1; index > -1; --index) {
			iterate_directory(directory[index])
		}
	} else if(/\.ai$/.test(folder.name) > -1) {
	    globals.template = app.open(folder)
	    globals.template_name = globals.template.fullName.toString()

	    var items = globals.template.pageItems
		globals.cutline = {}
		if(items) globals.cutline = items.getByName("Cutline")

		iterate_datasets(export_template)

		globals.template.close(SaveOptions.DONOTSAVECHANGES)
	}
}

(function main() {
	globals.folder = new Folder('~/WWMS/Product Templates').selectDlg("Select input folder")
	if(globals.folder) iterate_directory(globals.folder)
})()
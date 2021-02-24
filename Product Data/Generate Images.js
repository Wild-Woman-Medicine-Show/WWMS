function remove_cutline(doc) {
	var items = doc.pageItems
	if(!items) return

	var cutline = items.getByName("Cutline")
	cutline.remove()
}

function get_template_data(doc) {
	var split = doc.name.substring(0, doc.name.lastIndexOf('.')).split(' - ')
	return {
		type: split[1],
		size: split[2],
		line: split[3],
		blend: 5 in split ? split[4] : null,
		position: 5 in split ? split[5] : split[4]
	}
}

function get_output_name(doc, data) {
	var blend = data.blend
	if(doc.variables.getByName('Title')) blend = doc.variables.getByName('Title').pageItems[0].contents.replace('/',' ')
	return "WWMS" + 
           " - " + data.type + 
           " - " + data.size + 
           " - " + data.line + 
           (data.blend ? " - " + data.blend : "") +
           (data.position ? " - " + data.position : "")
}
function get_output_folder(folder) {
	return new Folder(folder.absoluteURI.replace('Template', 'Image'))
}

function is_folder(folder) {
	var is_folder = false
	try {
		folder.getFiles('*')
		is_folder = true
	} catch(e) {}
	return is_folder
}

function export_template(template, dataset, data) {
	dataset.display()
	var output = get_output_folder(new Folder(template.path))
	if(!output.exists) output.create()
	template.exportFile(
		new File(output.absoluteURI + "/" + get_output_name(template, data) + ".png"), 
		ExportType.PNG24
	)
}

function iterate_datasets(template, datasets, data, cb) {
	if(datasets.length) {
		for(var index = datasets.length - 1; index > -1; --index) {
			cb(template, datasets[index], data)
		}
	} else {
		cb(template, { display: function() {} }, data)
	}
}

function iterate_directory(folder) {
	if(is_folder(folder)) {
		var directory = folder.getFiles("*")

		for(var index = directory.length - 1; index > -1; --index) {
			iterate_directory(directory[index])
		}
	} else if(/\.ai$/.test(folder.name) > -1) {
	    var template = app.open(folder)

		remove_cutline(template)

		iterate_datasets(template, template.dataSets, get_template_data(template), export_template)

		template.close(SaveOptions.DONOTSAVECHANGES)
	}
}

(function main() {
	var input = new Folder('~/WWMS/Product Templates').selectDlg("Select input folder")
	if(!input) return {}
	iterate_directory(input)
})()
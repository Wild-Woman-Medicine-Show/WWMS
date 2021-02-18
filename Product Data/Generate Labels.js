function get_template_data(doc) {
	var split = doc.name.substring(0, doc.name.lastIndexOf('.')).split(' - ')
	return {
		type: split[1],
		size: split[2],
		line: split[3],
		position: split[4]
	}
}

function get_output_name(doc, data) {
	return "WWMS" + 
           " - " + data.type + 
           " - " + data.size + 
           " - " + data.line + 
           " - " + doc.variables.getByName('Title').pageItems[0].contents.replace('/',' ') + 
           (data.position ? " - " + data.position : "")
}

function query_folders() {
	var base = new Folder(new Folder().path)
	var folders = {
		input: base.selectDlg("Select input folder"),
	    output: base.selectDlg("Select output folder")
	}
	return folders
}

(function main() {
	var folders = query_folders()
	if(!folders.input || !folder.output) return

	var templates = folders.input.getFiles("*.ai")
	if(!templates) return

	for(var ai = templates.length - 1; ai > -1; --ai) {
	    var template = app.open(templates[ai])
	    var data = get_template_data(template)
		var datasets = template.dataSets

		for(var bi = datasets.length - 1; bi > -1; --bi) {
			datasets[bi].display()
			template.saveAs(
				new File(output_folder.absoluteURI + "/" + get_output_name(template, data) + ".eps"), 
				Object.assign(new EPSSaveOptions(), {
					cmykPostScript: true,
					embedAllFonts: true,
					embedLinkedFiles: true
				})
			)
		}

		template.close(SaveOptions.DONOTSAVECHANGES)
	}
})()
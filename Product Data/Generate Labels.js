(function main() {
	var template_folder = new Folder(new Folder().path)
	var output_folder = template_folder.selectDlg("Select output folder")
	var templates = template_folder.getFiles("*.ai")
	if(!templates) return

	for(var ai = templates.length - 1; ai > -1; --ai) {
	    var template = app.open(templates[ai])
		var datasets = template.dataSets
		var variables = template.variables
		var template_split = template.name.substring(0, template.name.lastIndexOf('.')).split(' - ')
		var template_data = {
			type: template_split[1],
			size: template_split[2],
			line: template_split[3],
			position: template_split[4]
		}
		for(var bi = datasets.length - 1; bi > -1; --bi) {
			datasets[bi].display()
			var title = variables.getByName('Title').pageItems[0].contents.replace('/',' ')
			var filename = "WWMS" + 
			               " - " + template_data.type + 
			               " - " + template_data.size + 
			               " - " + template_data.line + 
			               " - " + title + 
			               (template_data.position ? " - " + template_data.position : "") + ".eps"
			filename = output_folder.absoluteURI + "/" + filename
			var output = new File(filename)
			var saveOpts = new EPSSaveOptions();
			saveOpts.cmykPostScript = true;
			saveOpts.embedAllFonts = true;
			saveOpts.embedLinkedFiles = true;
			template.saveAs(output, saveOpts)
		}
		template.close()
	}
})()
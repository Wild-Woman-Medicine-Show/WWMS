var template_folder = new Folder("%USERPROFILE%").selectDlg("Select template folder")
var output_folder = new Folder("%USERPROFILE%").selectDlg("Select output folder")
var templates = template_folder.getFiles("*.ai")

for(var ai = templates.length - 1; ai > -1; --ai) {
    var template = app.open(templates[ai])
	var datasets = template.dataSets
	var variables = template.vaiables
	var template_split = template.name.split(' - ')
	var template_data = {
		type: template_split[1],
		size: template_split[2],
		line: template_split[3],
		position: template_split[4]
	}
	for(var bi = datasets.length - 1; bi > -1; --bi) {
		datasets[i].display()
		var name = variables.getByName('Title')
		prompt("WWMS - " + template_data.type + " - " + template_data.size + " - " + template_data.line + " - " + name + (template_data.position ? " - " + template_data.position : "") + ".eps")
		//template.saveAs(output_root + "")
		break
	}
	break
}
const mongoose = require('mongoose');
const schemas = {
	blend: new mongoose.Schema({
		'Line': String,
		'Title': String,
		'Description': String,
		'Subtitle_1': String,
		'#Subtitle_1_Visible': String,
		'Subtitle_2': String,
		'#Subtitle_2_Visible': String,
		'@Image': String,
		'Oils': String,
	})
}
module.exports = { Blend: mongoose.model('Blend', schemas.blend) }
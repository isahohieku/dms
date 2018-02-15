var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

// User Schema
var FolderSchema = mongoose.Schema({
	folderName: {
		type: String,
		required: true,
	},
	dateCreated: {
		type: Date,
    	default: Date.now
    },
    createdBy: {
        type: String,
        required: true
    },
    files:{
        type: Array,
    },
    trash:{
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Folder', FolderSchema);
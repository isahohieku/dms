var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

// User Schema
var FileSchema = mongoose.Schema({
	fileName: {
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
    folder:{
        type: String,
        required: true,
        default: 'Unknown'
    },
    upload_name:{
        type: String,
        required: true
    },
    file_size: {
        type: String,
        required : true
    },
    mime_type: {
        type: String,
        required: true
    },
    trash: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('File', FileSchema);
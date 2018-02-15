
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcryptjs');

// User Schema
var PersonalSchema = mongoose.Schema({
	firstname: {
		type: String,
		required: true,
	},
	lastname: {
		type: String,
    	required: true 
    },
    authentication_id: {
        type: String,
        required: true
    },
    avatarLink: {
        type: String,
        default: 'no_image.png',
    },
    dateAdded:{
        type: Date,
        default: Date.now
    },
    status: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Personal', PersonalSchema);
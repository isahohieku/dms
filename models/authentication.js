var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

// User Schema
var AuthenticationSchema = mongoose.Schema({
	category: {
		type:String,
		required: true
	},
	password: {
		type: String,
		required: true,
		bcrypt: true
	},
	email: {
		type: String,
    	required: true 
	},
	date: {
		type: Date,
		default: Date.now
	},
	status: {
		type: Boolean,
		default: false
	}
});

module.exports = mongoose.model('Authentication', AuthenticationSchema);




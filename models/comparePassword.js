const bcrypt = require('bcryptjs');

//Compare Password
//module.exports =  bcrypt.compare(Password, Hash)
module.exports.compare = function(candidatePassword, hash, callback){
	bcrypt.compare(candidatePassword, hash, function(err, isMatch) {
		if(err){
			console.log(err);
		}
    	if(err) throw err;
    	callback(null, isMatch);
	});
}
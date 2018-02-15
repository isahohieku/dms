const express = require('express');
const router = express.Router();
const multer  = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const comparePassword = require('../models/comparePassword');

const app = express()
const personalModel = require('../models/personal');
const authenticationModel = require('../models/authentication');
const folderModel = require('../models/folders');
const fileModel = require('../models/files');
const expressValidator = require('express-validator');

const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './avatar');
    },
    filename: function (req, file, cb) {
        crypto.pseudoRandomBytes(16, function (err, raw) {
            cb(null, raw.toString('hex') + Date.now() + path.extname(file.originalname));
        });
    }
});

const uploadsStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './uploads');
    },
    filename: function (req, file, cb) {
        crypto.pseudoRandomBytes(16, function (err, raw) {
            cb(null, raw.toString('hex') + Date.now() + path.extname(file.originalname));
        });
    }
});

const upload = multer({ storage: uploadsStorage});
const avatar = multer({ storage: avatarStorage });

const bodyParser = require('body-parser');
const methodOverride = require('method-override');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(methodOverride(function(req, res){
      if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method
        delete req.body._method
        return method
      }
}));

//Ensure Login
function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
		//req.flash('error_msg','You are not logged in');
		res.redirect('/');
	}
}

const db_error_message = 'The was an error connecting to the database';

//Logout

router.get('/logout', function(req, res, next){
    req.logout();
    
    res.clearCookie('admin');
    res.clearCookie('personal_id');
    res.clearCookie('name');
    res.clearCookie('avatar');
	res.redirect('/');
});

//Search

router.post('/search', function(req, res, next){
	req.checkBody('search', 'You must enter a Search').notEmpty().trim().isAlphanumeric();

	let errors = req.validationErrors();

	if (errors){
		console.log(errors);
	}
	let search = req.body.search;
	let queryUser = { $or: [{firstname: search}, {lastname: search}]};

	personalModel.find(queryUser, function(err, users){
		if (err){
			console.log(err);
		}

		console.log(users);

		fileModel.find({fileName: search}, function(err, files){
			if (err){
				console.log(err);
			}

			folderModel.find({folderName: search}, function(err, folders){
				if (err){
					console.log(err);
				}

				res.render('search', {'users': users, 'files': files, 'folders': folders});
			});
		});
	});

});


//Delete Multiple Files
function deleteFiles(files, callback){
    var i = files.length;
    files.forEach(function(filepath){
      fs.unlink('uploads/'+filepath, function(err) {
        i--;
        if (err) {
          callback(err);
          return;
        } else if (i <= 0) {
          callback(null);
        }
      });
    });
  }


//Dashboard Routes
router.route('/dashboard')
    //Route to the page
    .get(ensureAuthenticated, function(req, res, next){
        
        let avatar = req.cookies.avatar;
        let query = {trash: false};
        fileModel.find(query).limit(20).sort({date: -1}).exec(function(err, files){
            if (err){
                //res.render('dashboard', {'message': db_error_message });
                console.log(err);
            }

            if(files){
                 //let files = files;
            }

            folderModel.find({}).limit(20).sort({date: -1}).exec(function(err, folders){
                if (err){
                    //res.render('dashboard', {'message': db_error_message});
                    console.log(err);
                }

                if(folders){
                    res.render('dashboard', {folders:folders, files: files, avatar: avatar, category: req.cookies.admin});
                }
            })
        });
    })
    
;

//Profile Routes
router.route('/profile')
    //Route to the page
    .get(ensureAuthenticated, function(req, res, next){
        if(req.cookies.admin){
            let admin = true;
        }
        else{
            let admin = false;
        }
		let id = req.cookies.personal_id;
		let avatar = req.cookies.avatar;
        personalModel.findById(id, function(err, user){
            if (err){
                res.render('error', {'message': db_error_message });
            }

            if(user){
                res.render('profile', {'user': user, avatar: avatar, category: req.cookies.admin});
            }
        });
    })
    
    //Route to change Avatar
    .post(avatar.single('avatar'), function(req, res, next){
        let avatarName = req.file.filename;
		let personal_id = req.cookies.personal_id;
		
		

        let update = {
            avatarLink: avatarName
        };

        personalModel.findByIdAndUpdate(personal_id, {$set: update}, {new: true}, function(err, avatar){
            if (err){
                //res.render('profile', {'message': db_error_message });
                console.log(err);
            }

            if (avatar){
                res.redirect('/profile');
            }
        })


    })
;

//Modify Password Routes
router.route('/modify_password')
    .post(function(req, res, next){
        req.checkBody('old_password', 'Password Required').notEmpty();
        req.checkBody('new_password', 'Password required').notEmpty().isLength({min:4}).trim();
        req.checkBody('confirm_password', 'Password must match').equals(req.body.confirm_password);

        let id = req.cookies.personal_id;
        
        let errors = req.validationErrors();

        if(errors){
            console.log(errors);
            //res.render('profile',{'errors': errors});
        }

        let password_check = req.body.old_password;
        console.log(password_check);
        console.log(id);
        console.log('lie');

        personalModel.findById(id, function(err, auth){
            console.log
            if (err){
                //res.render('profile', {'message': db_error_message});
                console.log('Err');
            }

            if(auth){
                authenticationModel.findById(auth.authentication_id, function(err, auth_id){
                    if (err){
                        console.log(err);
                    }

                    if (auth_id){
                        comparePassword.compare(password_check, auth_id.password, function(err, isMatch){
                            if(err){
                                //res.render('profile', {'message': db_error_message});
                                console.log(err);
                            };
        
                            if(isMatch){
                                console.log(isMatch);
                                //return done(null, user);
                                let password = req.body.new_password
        
                                bcrypt.genSalt(10, function(err, salt){
                                    bcrypt.hash(password, salt, function(err, hash){
                                        let query = {password: hash}
                                        authenticationModel.findByIdAndUpdate(auth.authentication_id, {$set : query}, {new: true}, function(err, password){
                                            if (err){
                                                //res.render('profile', {'message': db_error_message });
                                                console.log(err);
                                            }

                                            if(password){
                                                res.redirect('/profile');
                                                console.log('password Modified');
                                            }
                                            
                                        });
                                    });
                                });
                            }
                        });
                    }
                });
            }
        });
    })
;

//Add Folder Routes
router.route('/folder/add')
    .post(function(req, res, next){
        let folderName = req.body.foldername;
        let author = req.cookies.name;
        let query = {folderName: folderName, createdBy: author};
        folderModel.findOne(query, function(err, folder){
            if (err){
                //res.render('error', {'message': db_error_message });
                console.log(err);
            }

            if(folder){
                //res.render('error', {'message' : 'You already have a folder named '+ folder.folderName});
                console.log('Folder exist');
            }
            else{
                let newFolder = new folderModel(query);

                newFolder.save(function(err, newfolder){
                    if(err){
                        //res.render('dashboard', {'message' : 'There was an error creating '+ folder.folderName + ' folder!'});
                        console.log(err);
                    }

                    if(newfolder){
                        res.redirect('/dashboard');
                    }
                });
            }
        })
    })
;

//Add File Routes
router.route('/file/add')
    .post(upload.single('fileName'), function(req, res, next){
        let name = req.body.name;
        let upload_name = req.file.filename;
        let mime = req.file.mimetype;
        let size = req.file.size;
        let author = req.cookies.name;
        let folder = req.body.folderName
        let query = {
            fileName: name, 
            createdBy: author, 
            folder: folder,
            upload_name: upload_name,
            file_size: size,
            mime_type: mime
        }
        console.log(query);
        fileModel.findOne(query, function(err, file){
            if (err){
                //res.render('dashboard', {'message': db_error_message });
                console.log(err);
            }

            if(file){
                //res.render('dashboard', {'message' : 'You already have a file named '+ file.fileName});
                console.log('File Exist')
            }
            else{
                let newFile = new fileModel(query);
                

                newFile.save(function(err, newFile){
                    if(err){
                        //res.render('error', {'message' : 'There was an error Uploading '+ newFile.fileName + '!'});
                        console.log(err);
                    }

                    if(newFile){
                        res.redirect('/dashboard');
                    }
                });
            }
        })
    })
;

//Delete Document Routes
router.route('/file/:id')
    //Route to the page
    .post(function(req, res, next){
        let id = req.param.id;
        fileModel.findByIdAndRemove(id, function(err, file){
            if (err){
                //res.render('error', {'message': db_error_message });
                console.log(err);
            }

            if (file){
                res.redirect('/collection');
            }
        });
    })
;
    
//View Collections Routes
router.route('/collection')
    //Route to the page
    .get(ensureAuthenticated, function(req, res, next){
        if(req.cookies.admin){
            let admin = 'true';
        }
        else{
            let admin = 'false';
        }
        let avatar = req.cookies.avatar;
        let name = req.cookies.name;
        let query = { createdBy: name, trash: false }
        fileModel.find(query, function(err, files){
            if (err){
                //res.render('error', {'message': db_error_message });
                console.log(err);
            }

            folderModel.find(query, function(err, folders){
                if (err){
                    //res.render('error', {'message': db_error_message });
                    console.log(err);
                }
                
                res.render('collection', {'files': files, 'folders': folders, 'avatar': avatar, category: req.cookies.admin});
            });
        });
    })
;

//View Document Routes
router.route('/file/:id')
    //Route to the page
    .get(ensureAuthenticated,function(req, res, next){
        if(req.cookies.admin){
            let admin = true;
        }
        else{
            let admin = false;
        }
        let id = req.param.id;
        fileModel.findById(id, function(err, file){
            if (err){
                res.render('error', {'message': db_error_message });
            }

            if (file){
                res.render('file', {'files': file, 'admin': admin});
            }
        });
    })
;

//View User Routes
router.route('/user/:id')
    //Route to the page
    .get(ensureAuthenticated,function(req, res, next){
        if(req.cookies.admin){
            let admin = true;
        }
        else{
            let admin = false;
        }

        let id = req.param.id;
        personalModel.findById(id, function(err, user){
            if (err){
                res.render('error', {'message': db_error_message });
            }

            if (user){
                res.render('user', {'files': user, admin: admin});
            }
        });
    })
;

//Search Routes
router.route('/search')
    //Route to the page
    .post(function(req, res, next){
        let search = req.body.search;
        let queryUser = { $or : [{'firstname': search, 'lastname': search  }]};
        personalModel.find(query, function(err, users){
            if (err){
                res.render('error', {'message': db_error_message });
            }

            let queryFolder = {folderName: search}
            folderModel.find(queryFolder, function(err, folders){
                if (err){
                    res.render('error', {'message': db_error_message });
                }
                
                let queryFiles = {fileName: search}
                folderModel.find(queryFiles, function(err, files){
                    if (err){
                        res.render('error', {'message': db_error_message });
                    }

                    if(users || folders || files){
                        res.render('search', {'files': files, 'folders': folders, users: users});
                    }
                    
                });
            });

        });
    })
;

//Delete Folder Routes
router.route('/folder/:id')
    //Route to the page
    .delete(function(req, res, next){
        let id = req.params.id;
        folderModel.findByIdAndRemove(id, function(err, folder){
            if (err){
                res.render('error', {'message': db_error_message });
            }

            if (folder){
                query = {folder: folder.folderName};
                fileModel.find(query,function(err, file){

                    if(err){
                        console.log(err);
                    }

                    let files = [];
                    file.forEach(function(element){
                        files.push(element.upload_name);
                    });

                    console.log(files);

                    fileModel.remove(query, function(err){
                        if (err){
                            console.log(err);
                        }

                        deleteFiles(files, function(err) {
                            if (err) {
                                console.log(err);
                            } else {
                                console.log('all files removed');
                            }
                        });

                    })

                    

                });
                //console.log('Deleted');
                res.redirect('/collection');
               
            }
        });
    })
;

//Delete Files Routes
router.route('/file/:id')
    //Route to the page
    .delete(function(req, res, next){
        let id = req.params.id;
        fileModel.findByIdAndRemove(id, function(err, file){
            if (err){
                console.log(err);
                //res.render('error', {'message': db_error_message });
            }

            if (file){

                fs.unlink('uploads/'+file.fileName, function(err){
                    if(err){
                        console.log('Error Deleting');
                    }

                    //console.log('Deleted');
                    res.redirect('/collection');
                });

                //res.location('back');
                
            }
        });
    })
;


//Trash FIle Route

router.route('/file/trash/:id')
    //Route to the page
    .put(function(req, res, next){
        let id = req.params.id;
        let query = {trash: true};
        fileModel.findByIdAndUpdate(id, query, function(err, file){
            if (err){
                console.log(err);
            }

            res.redirect("/dashboard");
        });
    })
;

//Trash Folder Route

router.route('/folder/trash/:id')
    //Route to the page
    .put(function(req, res, next){
        let id = req.params.id;
        let query = {trash: true};
        folderModel.findByIdAndUpdate(id, query, function(err, folder){
            if (err){
                console.log(err);
            }

            res.redirect("/dashboard");
        });
    })
;


//Trash
router.route('/trash')
    //Route to the page
    .get(ensureAuthenticated, function(req, res, next){

        if(req.cookies.admin){
            let admin = true;
        }
        else{
            let admin = false;
        }
        let avatar = req.cookies.avatar;
        let name = req.cookies.name;
        let query = {trash: true, createdBy: name};
        folderModel.find(query, function(err, folders){
            if (err){
                console.log(err);
            }

            fileModel.find(query, function(err, files){
                if (err){
                    console.log(err);
                }
                res.render("trash", {avatar: avatar, files: files, folders: folders, title: 'Trash', admin:admin});
            });

            
        });
    });
;

module.exports = router;

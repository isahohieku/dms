
const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const personalModel = require('../models/personal');
const authenticationModel = require('../models/authentication');
const folderModel = require('../models/folders');
const fileModel = require('../models/files');
const createUser = require('../models/encryptPassword');
const expressValidator = require('express-validator');

const methodOverride = require('method-override');
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(methodOverride(function(req, res){
      if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        // look in urlencoded POST bodies and delete it
        var method = req.body._method
        delete req.body._method
        return method
      }
}));

const db_error_message = 'The was an error connecting to the database';

//Ensure Login
function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
		//req.flash('error_msg','You are not logged in');
		res.redirect('/');
	}
}


//Create a User
router.route('/create_user')
  .get(ensureAuthenticated, function(req, res, next) {

    if (req.cookies.admin === 'Admin'){
        res.render('admin/create_user', {avatar: req.cookies.avatar});
    }
    else{
        res.send('Not Authorized to view this page');
    }
    
  })

  .post(function(req, res, next){
    req.checkBody('email', 'Email Required').isEmail().notEmpty().trim();
    req.checkBody('category', 'Category Required').notEmpty().trim();
    req.checkBody('password', 'password required').notEmpty().trim().isLength({min:4});
    req.checkBody('password2', 'Password Must Match'). trim().notEmpty().equals(req.body.password);
    req.checkBody('firstname', 'Firstname must Contain only alphabets').trim().notEmpty().isAlpha();
    req.checkBody('lastname', 'Last name must contain only alphabets').trim().notEmpty().isAlpha();;

    var errors = req.validationErrors();

    if (errors){
      //res.render('admin/create_user', {'errors': errors});
      console.log(errors);
    }
    else{
      var userAuth = {
        'email': req.body.email,
        'password': req.body.password,
        'category': req.body.category
      }
    }
    authenticationModel.findOne({email:req.body.email}, function(err, email){
      if(err){
        //res.render('error', {'message': db_error_message});
        console.log(err);
      }

      if(email){
        console.log('email taken');
        res.render('admin/create_user',{'message': 'Email already taken'});
        
      }
      else{

        var newUserAuth = new authenticationModel(userAuth);
        
        //Create auth
        createUser(newUserAuth, function(err, Auth){
          if (err){
            //res.render('error', {'message': db_error_message});
            console.log(err);
          }

          console.log(newUserAuth);

          var userPersonal = {
            'authentication_id': Auth._id,
            'firstname': req.body.firstname,
            'lastname': req.body.lastname
          };

          var newUserPersonal = new personalModel(userPersonal);
          newUserPersonal.save(function(err, Personal){
            if (err){
              //res.render('error', {'message': db_error_message});
              console.log(err);
            }

            if(Personal){
              res.redirect('/admin/create_user');
            }
          });
        });

      }
    });
  })
;


//Manage Users Route
router.route('/manager')
  .get(ensureAuthenticated, function(req, res, next){
    if (!req.cookies.admin === 'Admin'){
        res.send('Not Authorized to view this page');
    }
    
      let avatar = req.cookies.avatar;
      personalModel.find({}, function(err, users){
        if (err){
          console.log(err);
        }

        //console.log(users);
        authenticationModel.find({}, function(err, auth){
          if(err){
            console.log(err);
          }
          let all_users = [];

          auth.forEach(function(authentication){

            all_users.push({
              id : authentication._id,
              status : authentication.status,
              category :authentication.category,
              name: '',
              date:''
            });
              
          });

          //console.log(users[1].firstname);

            for(var i = 0; i< users.length; i++){
              all_users[i].name = users[i].firstname+' '+users[i].lastname;
              all_users[i].date = users[i].dateAdded
            }

            // all_user[0].name = users[0].firstname+' '+users[0].lastname;
            // all_user[0].date = users[0].dateAdded;

            //console.log(users[0].firstname);

          //console.log(all_users);

            res.render('admin/manage',{'all_users': all_users, 'avatar': avatar, category: req.cookies.admin});
        })

        
      })
  });


//Suspend Route
router.route('/suspend/:id')
  .put(function(req, res, next){

    let id = req.params.id;

    authenticationModel.findById(id, function(err, user){
      if (err){
        console.log(err);

      }

      if(user.status == false){
        authenticationModel.findByIdAndUpdate(id, {status: true}, function(err, success){
          if (err){
            console.log(err);
          }

          res.redirect('/admin/manager');
        })
      }

      else{
        authenticationModel.findByIdAndUpdate(id, {status: false}, function(err, success){
          if (err){
            console.log(err);
          }

          res.redirect('/admin/manager');
        })
      }
    })

  })
;

//Delete User Route

router.route('/delete/:id')
  .delete(function(req, res, next){

    let id = req.params.id;

    authenticationModel.findByIdAndRemove(id, function(err, user){
      if (err){
        console.log(err);
      }

      personalModel.findOneAndRemove({authentication_id : id}, function(err, user){
        if (err){
          console.log(err);
        }
      });

      res.redirect('/admin/manager');
    });

  })
;

//All folders
router.route('/folders/all')
  .get(ensureAuthenticated, function(req, res, next){
      if(!req.cookies.admin ==="Admin"){
          res.send("Not Authorized to view this page")
      }

      let avatar = req.cookies.avatar;

      folderModel.find({}, function(err, folders){
          if(err){
              console.log(err);
          }

          res.render('admin/folders',{title: 'Folders', folders: folders, avatar: avatar, category: req.cookies.admin});
      })

  })
;

//All Files
router.route('/files/all')
  .get(ensureAuthenticated, function(req, res, next){
      if(!req.cookies.admin ==="Admin"){
          res.send("Not Authorized to view this page")
      }

      let avatar = req.cookies.avatar;

      fileModel.find({}, function(err, files){
          if(err){
              console.log(err);
          }

          res.render('admin/files',{title: 'Files', files: files, avatar: avatar, category: req.cookies.admin});
      })

  })
;

module.exports = router;

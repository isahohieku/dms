const express = require('express');
const expressValidator = require('express-validator');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Authentication = require('./models/authentication');
const comparePassword = require('./models/comparePassword');
const PersonalModel = require('./models/personal');
const flash = require('connect-flash');


const index = require('./routes/index');
//const users = require('./routes/users');
const administrator = require('./routes/admin');

const db = require('./models/db');

const app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '/node_modules/jquery/dist')));
app.use(express.static(path.join(__dirname, '/node_modules/popper.js/dist/umd')));
app.use(express.static(path.join(__dirname, '/node_modules/bootstrap/dist')));
app.use(express.static(path.join(__dirname, '/node_modules/font-awesome/')));
app.use(express.static(path.join(__dirname, 'avatar')));

app.use(require('cookie-parser')());
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());




// Express Validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

app.use('/', index);
//app.use('/users', users);
app.use('/admin', administrator);

passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password'
  },
  function(username, password, done) {
    Authentication.findOne({ email: username }, function(err, user) {
      if (err) { console.log(err); return done(err); }
      if (!user) {
        console.log("Not User");
        return done(null, false, { message: 'Incorrect username.' });
      }
      comparePassword.compare(password, user.password, function(err, isMatch){
        if(err) throw err;
        if(isMatch){
          console.log(isMatch);
          return done(null, user);
        } 
        else {
          console.log("wrong Password");
          return done(null, false, {message: 'Invalid password'});
        }
      });
    });
  }
));



app.get('/', function(req, res, next){
  res.render('index');
});

app.post('/', passport.authenticate('local'), function(req, res,){
  if(req.user.category === 'Admin'){
    res.cookie('admin', req.user.category, { expires: new Date(Date.now() + 3600000), httpOnly: true});
  };

  if(req.user.status === true){
    //req.flash('message', 'Your Account has Being Suspended');
    //console.log(sessionFlash.message);
    res.redirect('/');
  }
  else{
    PersonalModel.findOne({authentication_id: req.user._id}, function(err, personal){
      if (err){ console.log(err);}
  
      if(personal){
        let full_name = personal.firstname + ' ' + personal.lastname;
        res.cookie('name', full_name,{ expires: new Date(Date.now() + 3600000), httpOnly: true});
        res.cookie('personal_id', personal._id, { expires: new Date(Date.now() + 3600000), httpOnly: true});
        res.cookie('avatar', personal.avatarLink, { expires: new Date(Date.now() + 3600000), httpOnly: true});
        
  
        res.redirect('/dashboard');
      }
    });
  }
});


passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  Authentication.findById(id, function (err, user) {
    done(err, user);
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

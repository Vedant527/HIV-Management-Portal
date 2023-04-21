// Import required libraries
const express = require('express');
const admin = require('firebase-admin');
const session = require('express-session');
const crypto = require('crypto');

// Initialize the Express app
const app = express();

// Initialize Firebase Admin SDK with your service account credentials
const serviceAccount = require('./pass.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://hiv-management-db-default-rtdb.firebaseio.com/'
});

// Set the view engine to EJS and configure the views directory
app.set('view engine', 'ejs');
app.set('views', './views');

// Start the server
const port = process.env.PORT || 3003;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Setup Express Session
app.use(session({
  secret: crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false
}));

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// LOGIN PAGE
app.get('/', (req, res) => {
  if (req.session.userId != null) {
    res.render('home');
  } else {
    res.render('login');
  }
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.render('login', { message: 'Please provide an email and password' });
    }
  
    admin.auth().getUserByEmail(email)
      .then((userRecord) => {
        const uid = userRecord.uid;
        req.session.userId = uid;
        return admin.auth().createCustomToken(uid)
          .then((customToken) => {
            return res.render('home', { token: customToken });
          })
          .catch((error) => {
            console.log(error);
            return res.render('login', { message: 'Error creating custom token' });
          });
      })
      .catch((error) => {
        console.log(error);
        return res.render('login', { message: 'User not found' });
      });
  });

  // SIGNUP PAGE
  app.get('/signup', (req, res) => {
    res.render('signup');
  });

  app.post('/signup', async (req, res) => {
    const { email, username, password } = req.body;
    try {
      // Create a new user account in Firebase Authentication
      const userRecord = await admin.auth().createUser({
        email,
        password
      });
      
      // Store the user's email, username, and password in the Firebase Realtime Database
      await admin.database().ref('users').child(userRecord.uid).set({
        email,
        username,
        password
      });
  
      res.send('User account created successfully!');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error creating user account');
    }
  });

  // EXERCISE PAGE
  app.get('/exercise', function(req, res) {
    if (req.session.userId == null) {
      res.render('login');
    }
    res.render('exercise');
  });

  app.post('/exercise', function(req, res) {
    const exercise = req.body.exercise;
    const date = req.body.date;
    const length = req.body.length;
    const calories = req.body.calories;
  
    //store data in database
    const currUser = req.session.userId;
    admin.database().ref('users').child(currUser).push({
      exercise: exercise,
      date: date,
      length: length,
      calories: calories
    });
    res.render('exercise');
  });

  app.get('/appointments', function(req, res) {
    if (req.session.userId == null) {
      res.render('login');
    }
    res.render('appointments');
  });
  app.post('/appointments', function(req, res) {
    const type = req.body.type;
    const date = req.body.date;
    const time = req.body.time;


    const currUser = req.session.userId;
    admin.database().ref('users').child(currUser).push({
      type: type,
      date: date,
      time: time,
    });
    res.render('appointments');
  });
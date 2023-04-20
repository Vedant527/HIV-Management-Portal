// Import required libraries
const express = require('express');
const admin = require('firebase-admin');

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

// Define a route for the login page
app.get('/', (req, res) => {
  res.render('login');
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.render('login', { message: 'Please provide an email and password' });
    }
  
    admin.auth().getUserByEmail(email)
      .then((userRecord) => {
        const uid = userRecord.uid;
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
  app.get('/exercise', function(req, res) {
    res.render('exercise');
  });
  app.post('/exercise', function(req, res) {
    const exercise = req.body.exercise;
    const date = req.body.date;
    const length = req.body.length;
    const calories = req.body.calories;
  
    //store data in database
  });
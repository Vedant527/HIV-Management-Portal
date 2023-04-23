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
const port = process.env.PORT || 3007;
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
    res.render('login', { message: null});
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
        const errorMessage = 'Incorrect username or password. Please try again.';
        return res.render('login', { message: errorMessage });
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
      res.render('login', { message: null});
    }
    res.render('exercise', { totalCalories: 0 });
  });
  async function getTotalCalories(currUser) {
    return new Promise(async (resolve, reject) => {
      let totalCalories = 0;
      const uidRef = await admin.database().ref(`users/${currUser}`);
      uidRef.once("value").then(async (snapshot) => {
        snapshot.forEach(async (uidSnapshot) => {
          const uid = uidSnapshot.key;
          const caloriesRef = await admin.database().ref(`users/${currUser}/${uid}/calories`);
          caloriesRef.once("value").then((snapshot) => {
            const fieldValue = snapshot.val();
            if(fieldValue != null && Number.isInteger(parseInt(fieldValue))) {
              totalCalories += parseInt(fieldValue);
              console.log(totalCalories);
            }
          });
        });
      }).then(() => {
        console.log(totalCalories);
        resolve(totalCalories);
      }).catch((err) => {
        reject(err);
      });
    });
  }
  app.post('/exercise', async (req, res) => {
    const exercise = req.body.exercise;
    const date = req.body.date;
    const length = req.body.length;
    const calories = req.body.calories;
  
    //store data in database
    const currUser = req.session.userId;
    await admin.database().ref('users').child(currUser).push({
      exercise: exercise,
      date: date,
      length: length,
      calories: calories
    });
    const totalCalories = await getTotalCalories(currUser);
    console.log(totalCalories);
    res.render('exercise', { totalCalories: totalCalories });
  });

  app.get('/appointments', function(req, res) {
    if (req.session.userId == null) {
      res.render('login', { message: null});
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

  app.get('/diet', async (req, res) => {
    const currUser = req.session.userId;
    const mealsRef = admin.database().ref(`meals/${currUser}`);
    const snapshot = await mealsRef.once('value');
  
    const meals = [];
    snapshot.forEach((mealSnapshot) => {
      const meal = mealSnapshot.val();
      meal.key = mealSnapshot.key;
      meals.push(meal);
    });
  
    meals.sort((a, b) => a.date.localeCompare(b.date));
    res.render('diet', { meals: meals });
  });
  
  app.post('/diet', async (req, res) => {
    const currUser = req.session.userId;
    const mealType = req.body['meal-type'];
    const foodItem = req.body['food-item'];
    const mealDate = req.body['meal-date'];

    // Retrieve calorie count for the selected food item from the database
    admin.database().ref('foods').child(foodItem).once('value').then((snapshot) => {
      const calories = 100;

      // Save the meal data to the database
      admin.database().ref('meals').child(currUser).push({
        mealType: mealType,
        foodItem: foodItem,
        date: mealDate,
        calories: calories
      });

    });
    const mealsRef = admin.database().ref(`meals/${currUser}`);
    const snapshot = await mealsRef.once('value');
  
    const meals = [];
    snapshot.forEach((mealSnapshot) => {
      const meal = mealSnapshot.val();
      meal.key = mealSnapshot.key;
      meals.push(meal);
    });
  
    meals.sort((a, b) => a.date.localeCompare(b.date));
    res.render('diet', { meals: meals });
  });
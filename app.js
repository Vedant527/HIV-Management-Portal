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
//save custom token var
let saveCustomToken;
// Set the view engine to EJS and configure the views directory
app.set('view engine', 'ejs');
app.set('views', './views');

// Start the server
const port = process.env.PORT || 3000;
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
    const username = req.session.username;
    res.render('home', { username: username });
  } else {
    res.render('login', { message: null});
  }
});

// app.post('/login', (req, res) => {
//   const { email, password } = req.body;
//   if (!email || !password) {
//     return res.render('login', { message: 'Please provide an email and password' });
//   }
//   admin.auth().getUserByEmail(email)
//     .then((userRecord) => {
//       const uid = userRecord.uid;
//       admin.database().ref(`users/${uid}/password`).once('value')
//         .then((snapshot) => {
//           const actualPassword = snapshot.val();
//           if (password !== actualPassword) {
//             const errorMessage = 'Incorrect password. Please try again.';
//             return res.render('login', { message: errorMessage });
//           }
//           req.session.userId = uid;
//           return admin.auth().createCustomToken(uid)
//             .then((customToken) => {
//               saveCustomToken = customToken;
//               return res.render('home', { token: customToken });
//             })
//             .catch((error) => {
//               console.log(error);
//               return res.render('login', { message: 'Error creating custom token' });
//             });
//         })
//         .catch((error) => {
//           console.log(`Error retrieving password: ${error.message}`);
//           const errorMessage = 'Incorrect username or password. Please try again.';
//           return res.render('login', { message: errorMessage });
//         });
//     })
//     .catch((error) => {
//       console.log(error);
//       const errorMessage = 'Incorrect username. Please try again.';
//       return res.render('login', { message: errorMessage });
//     });
// });



app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.render('login', { message: 'Please provide an email and password' });
  }
  admin.auth().getUserByEmail(email)
    .then((userRecord) => {
      const uid = userRecord.uid;
      admin.database().ref(`users/${uid}`).once('value')
        .then((snapshot) => {
          const userData = snapshot.val();
          const actualPassword = userData.password;
          if (password !== actualPassword) {
            const errorMessage = 'Incorrect password. Please try again.';
            return res.render('login', { message: errorMessage });
          }
          req.session.userId = uid;
          return admin.auth().createCustomToken(uid)
            .then((customToken) => {
              saveCustomToken = customToken;
              return res.render('home', { 
                token: customToken, 
                username: userData.username 
              });
            })
            .catch((error) => {
              console.log(error);
              return res.render('login', { message: 'Error creating custom token' });
            });
        })
        .catch((error) => {
          console.log(`Error retrieving user data: ${error.message}`);
          const errorMessage = 'Incorrect username or password. Please try again.';
          return res.render('login', { message: errorMessage });
        });
    })
    .catch((error) => {
      console.log(error);
      const errorMessage = 'Incorrect username. Please try again.';
      return res.render('login', { message: errorMessage });
    });
});



// SIGNUP PAGE
app.get('/signup', (req, res) => {
  res.render('signup', {message: null});
});

app.post('/signup', async (req, res) => {
  const { email, username, password } = req.body;
  try { 
    // see if account exists
    try {
      await admin.auth().getUserByEmail(email).then(() => {
        // Email is already registered
        res.render('signup', { message: 'Email is already registered' });
      })
    } catch (e) {
    }
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

    res.render('login', { message: 'Account created successfully' });
  } catch (error) {
    console.error(error);
    res.render('signup', { message: 'Email is already registered' });
  }
});


  // HOME PAGE
  
app.get('/home', (req, res) => {
  if (req.session.userId != null) {
    const uid = req.session.userId;
    admin.database().ref(`users/${uid}/username`).once('value')
      .then((snapshot) => {
        const username = snapshot.val();
        res.render('home', { username: username });
      })
      .catch((error) => {
        console.log(`Error retrieving username: ${error.message}`);
        res.render('home', { username: null });
      });
  } else {
    res.render('login', { message: null });
  }
});






  
  




// EXERCISE PAGE
app.get('/exercise', function(req, res) {
  if (req.session.userId == null) {
    res.render('login', { message: "Login to access the exercise page!"});
  } else {
    const currUser = req.session.userId;
    const events = [];

    admin.database().ref('users').child(currUser).orderByChild('date').on('value', function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        const childData = childSnapshot.val();
        const event = {
          title: childData.exercise,
          start: childData.date
        };
        if (childData.exercise) {
          events.push(event);
          // event['calories'] = childData.calories;
        }
        if (childData.length) {
          event['length'] = childData.length;
        }
        // events.push(event);
      });
      res.render('exercise', {events: events});
    });
  }
});

app.post('/exercise', function(req, res) {
  const exercise = req.body.exercise;
  const date = req.body.date;
  const length = req.body.length;
  // const calories = req.body.calories;

  //store data in database
  const currUser = req.session.userId;
  admin.database().ref('users').child(currUser).push({
    exercise: exercise,
    date: date,
    length: length
    // calories: calories
  });
  res.redirect('/exercise');
});



// APPOINTMENTS PAGE
app.get('/appointments', function(req, res) {
  if (req.session.userId == null) {
    res.render('login', { message: "Login to access the appointments page!"});
  } else {
    const currUser = req.session.userId;
    const userRef = admin.database().ref('users').child(currUser);

    userRef.orderByChild('type').on('value', function(snapshot) {
      const appointments = [];
      snapshot.forEach(function(childSnapshot) {
        const childData = childSnapshot.val();
        if (childData.hasOwnProperty('type') && childData.hasOwnProperty('date') && childData.hasOwnProperty('time')) {
          appointments.push(childData);
        }
      });
      var message = '';
      res.render('appointments', { appointments: appointments, message: message });
    });
  }
});

app.post('/appointments', function(req, res) {
  const type = req.body.type;
  const date = req.body.date;
  const time = req.body.time;
  const currUser = req.session.userId;
  const appointmentsRef = admin.database().ref('users').child(currUser);
  let exists = false;

  appointmentsRef.orderByChild('date').equalTo(date).once('value', function(snapshot) {
    snapshot.forEach(function(childSnapshot) {
      const childData = childSnapshot.val();
      if (childData.hasOwnProperty('type') && childData.hasOwnProperty('date') && childData.hasOwnProperty('time')) {
        if (childData.type === type && childData.time === time && childData.date === date) {
          exists = true;
        }
      }
    });
    if (exists) {
      const appointments = [];
      appointmentsRef.orderByChild('date').on('value', function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
          const childData = childSnapshot.val();
          if (childData.hasOwnProperty('type') && childData.hasOwnProperty('date') && childData.hasOwnProperty('time')) {
            appointments.push(childData);
          }
        });
        res.render('appointments', { appointments: appointments, message: "Appointment already exists" });
      });
    } else {
      appointmentsRef.push({
        type: type,
        date: date,
        time: time,
      }, function(error) {
        if (error) {
          console.log("Error adding appointment:", error);
        } else {
          const appointments = [];
          appointmentsRef.orderByChild('date').on('value', function(snapshot) {
            snapshot.forEach(function(childSnapshot) {
              const childData = childSnapshot.val();
              if (childData.hasOwnProperty('type') && childData.hasOwnProperty('date') && childData.hasOwnProperty('time')) {
                appointments.push(childData);
              }
            });
            res.render('appointments', { appointments: appointments, message: "Appointment successfully created" });
          });
        }
      });
    }
  });
});


// DIET PAGE
app.get('/diet', function(req, res) {
  if (req.session.userId == null) {
    res.render('login', { message: "Login to access the diet page!"});
  } else {
    const currUser = req.session.userId;
    const events = [];

    admin.database().ref('users').child(currUser).orderByChild('date').on('value', function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        const childData = childSnapshot.val();
        const event = {
          title: childData.type,
          start: childData.date,
        };
        if (childData.servings) {
          events.push(event);
        }
        if (childData.servings) {
          event['servings'] = childData.servings;
          event['dish'] = childData.dish;
        }
      });
      res.render('diet', {events: events});
    });
  }
});

app.post('/diet', function(req, res) {
  const type = req.body.type;
  const date = req.body.date;
  const dish = req.body.dish;
  const servings = req.body.servings;
  // const calories = req.body.calories;

  //store data in database
  const currUser = req.session.userId;
  admin.database().ref('users').child(currUser).push({
    type: type,
    date: date,
    dish: dish,
    servings: servings
    // calories: calories
  });
  res.redirect('/diet');
});
app.post('/homepage', (req, res) => {
  // req.session.destroy(err => {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     return res.render('home');
  //   }
  // });
  res.redirect('/home')
});
app.post('/logout', (req, res) => {
  req.session.userId = null;
  req.session.destroy(err => {
    if (err) {
      console.log(err);
    } else {
      return res.render('login', { message: "You are now logged out!"});
    }
  });
});
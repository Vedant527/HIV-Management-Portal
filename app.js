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
app.get('/', async (req, res) => {
  if (req.session.userId != null) {
    const username = req.session.username;
    const userRef = admin.database().ref('users').child(uid);
    const uid = req.session.userId;
    const snapshot = await admin.database().ref(`users/${uid}/username`).once('value');
    const appointments = []; 
      userRef.orderByChild('type').on('value', function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
            const childData = childSnapshot.val();
            if (childData.hasOwnProperty('type') && childData.hasOwnProperty('date') && childData.hasOwnProperty('time')) {
                appointments.push(childData);
            }
        });
        var message = '';   
      });
      x = true;
      const currentDate = new Date(); // get current date
      const final = appointments.length ? appointments.reduce((r, o) => o.date < r.date && o.date > currentDate ? o : r): null; 
    return res.render('home', { username: username, final:final, appointments:appointments });
  } else {
    return res.render('login', { message: null});
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.render('login', { message: 'Please provide an email and password' });
  }
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;
    const snapshot = await admin.database().ref(`users/${uid}`).once('value');
    const userData = snapshot.val();
    const actualPassword = userData.password;
    const username = req.session.username;
    const userRef = admin.database().ref('users').child(uid);
    const appointments = []; 


    if (password !== actualPassword) {
      const errorMessage = 'Incorrect password. Please try again.';
      return res.render('login', { message: errorMessage });
    }

    req.session.userId = uid;
    // const appointments = [
    //   { type: 'Doctor', date: '2023-05-01', time: '10:00 AM' },
    //   { type: 'Lab', date: '2023-05-15', time: '11:00 AM' },
    //   { type: 'Doctor', date: '2023-06-01', time: '09:00 AM' }
    // ];
    userRef.orderByChild('type').on('value', function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
          const childData = childSnapshot.val();
          if (childData.hasOwnProperty('type') && childData.hasOwnProperty('date') && childData.hasOwnProperty('time')) {
              appointments.push(childData);
          }
      });
      var message = '';   
    });
    const customToken = await admin.auth().createCustomToken(uid);
    saveCustomToken = customToken;
    const currentDate = new Date(); // get current date
    const final = appointments.length ? appointments.reduce((r, o) => o.date < r.date && o.date > currentDate ? o : r): null; 
    return res.render('home', { 
      token: customToken, 
      username: userData.username,
      final: final,
      appointments:appointments
    });
  } catch (error) {
    console.log(error);
    const errorMessage = 'Incorrect email or password. Please try again.';
    return res.render('login', { message: errorMessage });
  }
});



// SIGNUP PAGE
app.get('/signup', (req, res) => {
  return res.render('signup', {message: null});
});

app.post('/signup', async (req, res) => {
  const { email, username, password } = req.body;
  try { 
    // see if account exists
    try {
      await admin.auth().getUserByEmail(email).then(() => {
        // Email is already registered
        return res.render('signup', { message: 'Email is already registered' });
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

    return res.render('login', { message: 'Account created successfully' });
  } catch (error) {
    console.error(error);
    return res.render('signup', { message: 'Email is already registered' });
  }
});


  // HOME PAGE
  
app.get('/home', async (req, res) => {
  const uid = req.session.userId;
  const snapshot = await admin.database().ref(`users/${uid}/username`).once('value');
  const username = snapshot.val();
  const userRef = admin.database().ref('users').child(uid);
  const appointments = []; 
  if (req.session.userId != null) {
    try {
      userRef.orderByChild('type').on('value', function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
            const childData = childSnapshot.val();
            if (childData.hasOwnProperty('type') && childData.hasOwnProperty('date') && childData.hasOwnProperty('time')) {
                appointments.push(childData);
            }
        });
        var message = '';   
      });
      const currentDate = new Date(); // get current date
      const final = appointments.length ? appointments.reduce((r, o) => o.date < r.date && o.date > currentDate ? o : r): null; 
    return res.render('home', { username: username, final:final, message:message, appointments:appointments });
    } catch (error) {
      userRef.orderByChild('type').on('value', function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
            const childData = childSnapshot.val();
            if (childData.hasOwnProperty('type') && childData.hasOwnProperty('date') && childData.hasOwnProperty('time')) {
                appointments.push(childData);
            }
        });
        var message = '';   
      });
      console.log(`Error retrieving username: ${error.message}`);
      const currentDate = new Date(); // get current date
      const final = appointments.length ? appointments.reduce((r, o) => o.date < r.date && o.date > currentDate ? o : r): null; 
      return res.render('home', { username: null, final:final, appointments:appointments });
    }
  } else {
    return res.render('login', { message: null });
  }
});



// EXERCISE PAGE
app.get('/exercise', async function(req, res) {
  if (req.session.userId == null) {
    return res.render('login', { message: "Login to access the exercise page!"});
  } else {
    try {
      const currUser = req.session.userId;
      const events = [];
      
      const snapshot = await admin.database().ref('users').child(currUser).orderByChild('date').once('value');
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
      return res.render('exercise', {events: events});
    } catch (error) {
      console.log("Error:", error);
      return res.status(500).send("Error getting exercise events");
    }
  }
});

app.post('/exercise', async function(req, res) {
  const exercise = req.body.exercise;
  const date = req.body.date;
  const length = req.body.length;
  // const calories = req.body.calories;

  //store data in database
  const currUser = req.session.userId;
  await admin.database().ref('users').child(currUser).push({
    exercise: exercise,
    date: date,
    length: length
    // calories: calories
  });
  return res.redirect('/exercise');
});

app.post('/delete-event', async (req, res) => {
  const exercise = req.body.exercise;
  const date = req.body.date;
  const length = req.body.length;
  const currUser = req.session.userId;
  const eventRef = admin.database().ref('users').child(currUser);

  await new Promise((resolve, reject) => {
    eventRef.orderByChild('date').on('value', function(snapshot) {
      snapshot.forEach(function(childSnapshot) {
        const childData = childSnapshot.val();
        if (childData.hasOwnProperty('exercise') && childData.hasOwnProperty('date') && childData.hasOwnProperty('length')) {
          if (childData.exercise === exercise && childData.length === length && childData.date === date) {
            const eventRef2 = admin.database().ref(`users/${currUser}/${childSnapshot.key}`);
            eventRef2.remove();
          }
        }
      });
      resolve();
    });
  });

  const events = [];

  await new Promise((resolve, reject) => {
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
      resolve();
    });
  });

  res.render('exercise', { events: events });
});



// APPOINTMENTS PAGE
app.get('/appointments', async function(req, res) {
  if (req.session.userId == null) {
    return res.render('login', { message: "Login to access the appointments page!"});
  } else {
    try {
      const currUser = req.session.userId;
      const userRef = admin.database().ref('users').child(currUser);

      const snapshot = await userRef.orderByChild('type').once('value');
      const appointments = [];
      snapshot.forEach(function(childSnapshot) {
        const childData = childSnapshot.val();
        if (childData.hasOwnProperty('type') && childData.hasOwnProperty('date') && childData.hasOwnProperty('time')) {
          appointments.push(childData);
        }
      });
      var message = '';
      return res.render('appointments', { appointments: appointments, message: message });
    } catch (error) {
      console.log("Error:", error);
      return res.status(500).send("Error getting appointments");
    }
  }
});

app.post('/appointments', async function(req, res) {
  const type = req.body.type;
  const date = req.body.date;
  const time = req.body.time;
  const currUser = req.session.userId;
  const appointmentsRef = admin.database().ref('users').child(currUser);
  let exists = false;

  try {
    const snapshot = await appointmentsRef.orderByChild('date').equalTo(date).once('value');
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
      const snapshot = await appointmentsRef.orderByChild('date').once('value');
      snapshot.forEach(function(childSnapshot) {
        const childData = childSnapshot.val();
        if (childData.hasOwnProperty('type') && childData.hasOwnProperty('date') && childData.hasOwnProperty('time')) {
          appointments.push(childData);
        }
      });
      return res.render('appointments', { appointments: appointments, message: "Appointment already exists" });
    } else {
      await appointmentsRef.push({
        type: type,
        date: date,
        time: time,
      });

      const appointments = [];
      const snapshot = await appointmentsRef.orderByChild('date').once('value');
      snapshot.forEach(function(childSnapshot) {
        const childData = childSnapshot.val();
        if (childData.hasOwnProperty('type') && childData.hasOwnProperty('date') && childData.hasOwnProperty('time')) {
          appointments.push(childData);
        }
      });

      return res.render('appointments', { appointments: appointments, message: "Appointment successfully created" });
    }
  } catch (error) {
    console.log("Error:", error);
    return res.status(500).send("Error adding appointment");
  }
});

app.post('/appointments/delete', async (req, res) => {
  const type = req.body.type;
  const date = req.body.date;
  const time = req.body.time;
  const currUser = req.session.userId;
  const appointmentsRef = admin.database().ref('users').child(currUser);

  await appointmentsRef.orderByChild('date').equalTo(date).once('value', function(snapshot) {
    snapshot.forEach(function(childSnapshot) {
      const childData = childSnapshot.val();
      if (childData.hasOwnProperty('type') && childData.hasOwnProperty('date') && childData.hasOwnProperty('time')) {
        if (childData.type === type && childData.time === time && childData.date === date) {
          const appointmentsRef2 = admin.database().ref(`users/${currUser}/${childSnapshot.key}`);
          appointmentsRef2.remove();
        }
      }
    });
  });
  
  const appointments = [];
  await appointmentsRef.orderByChild('date').on('value', function(snapshot) {
    snapshot.forEach(function(childSnapshot) {
      const childData = childSnapshot.val();
      if (childData.hasOwnProperty('type') && childData.hasOwnProperty('date') && childData.hasOwnProperty('time')) {
        appointments.push(childData);
      }
    });
  });
  
  return res.render('appointments', { appointments: appointments, message: "Appointment successfully deleted" });
});

// DIET PAGE
app.get('/diet', async function(req, res) {
  if (req.session.userId == null) {
    return res.render('login', { message: "Login to access the diet page!"});
  } else {
    const currUser = req.session.userId;
    const events = [];

    await admin.database().ref('users').child(currUser).orderByChild('date').once('value', function(snapshot) {
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
      return res.render('diet', {events: events});
    });
  }
});

app.post('/diet', async function(req, res) {
  const type = req.body.type;
  const date = req.body.date;
  const dish = req.body.dish;
  const servings = req.body.servings;
  // const calories = req.body.calories;

  //store data in database
  const currUser = req.session.userId;
  await admin.database().ref('users').child(currUser).push({
    type: type,
    date: date,
    dish: dish,
    servings: servings
    // calories: calories
  });
  return res.redirect('/diet');
});

app.post('/delete-dietEvent', async (req, res) => {
  const type = req.body.type;
  const date = req.body.date;
  const dish = req.body.dish;
  const servings = req.body.servings;
  const currUser = req.session.userId;
  const eventRef = admin.database().ref('users').child(currUser);
  
  try {
    await new Promise((resolve, reject) => {
      eventRef.orderByChild('date').on('value', function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
          const childData = childSnapshot.val();
          if (childData.hasOwnProperty('dish') && childData.hasOwnProperty('date') && childData.hasOwnProperty('servings') && childData.hasOwnProperty('type')) {
            if (childData.dish === dish && childData.date === date && childData.servings === servings && childData.type === type) {
              const eventRef2 = admin.database().ref(`users/${currUser}/${childSnapshot.key}`);
              eventRef2.remove(() => {
                resolve();
              });
            }
          }
        });
      });
    });

    const events = [];
    await new Promise((resolve, reject) => {
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
        resolve();
      });
    });
    return res.render('diet', {events: events});
  } catch (err) {
    console.log(err);
  }
});

app.post('/logout', async (req, res) => {
  req.session.userId = null;
  try {
    await new Promise((resolve, reject) => {
      req.session.destroy(err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    return res.render('login', { message: "You are now logged out!"});
  } catch (err) {
    console.log(err);
  }
});
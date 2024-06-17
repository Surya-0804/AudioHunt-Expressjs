require('dotenv').config();
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');
const {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  db,
  setDoc,
  doc,
  getDoc
} = require('./firebaseConfig');

const generateSecretKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
  secret: generateSecretKey(),
  resave: false,
  saveUninitialized: true
}));

// Define routes
app.get('/', (req, res) => {
  res.render('home');
});

app.get('/navbar', (req, res) => {
  res.render('_navbar.ejs');
});

app.get('/search', (req, res) => {
  res.render('search', { results: undefined });
});

app.post('/search', async (req, res) => {
  const { query } = req.body;

  try {
    const response = await axios.get('http://ws.audioscrobbler.com/2.0/', {
      params: {
        method: 'track.search',
        api_key: process.env.LASTFM_API_KEY,
        format: 'json',
        track: query
      }
    });

    if (response.data?.results?.trackmatches?.track) {
      let tracks = Array.isArray(response.data.results.trackmatches.track)
        ? response.data.results.trackmatches.track
        : [response.data.results.trackmatches.track];

      tracks = tracks.filter(track => track.name.toLowerCase().includes(query.toLowerCase()));

      res.render('search', { results: tracks });
    } else {
      res.render('search', { results: [] });
    }
  } catch (error) {
    console.error(error);
    res.render('search', { results: [] });
  }
});

app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/signup', async (req, res) => {
  const { name, email, password, confirmPassword, terms } = req.body;

  if (!terms) {
    return res.render('signup', { error: 'You must agree to the terms and conditions.' });
  }

  if (password !== confirmPassword) {
    return res.render('signup', { error: 'Passwords do not match.' });
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });

    await setDoc(doc(db, 'users', userCredential.user.uid), {
      name: name,
      email: email,
      uid: userCredential.user.uid
    });

    res.redirect('/dashboard');
  } catch (error) {
    res.render('signup', { error: error.message });
  }
});

app.get('/dashboard', async (req, res) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        res.render('dashboard', { userName: userDoc.data().name });
      } else {
        res.render('dashboard', { userName: 'Guest' });
      }
    } catch (error) {
      res.render('dashboard', { userName: 'Guest', error: error.message });
    }
  } else {
    res.render('dashboard', { userName: 'Guest' });
  }
});

app.get('/about', (req, res) => {
  res.render('about'); // Renders the about.ejs view
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    res.redirect('/dashboard');
  } catch (error) {
    res.render('login', { error: error.message });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).send('Internal Server Error');
    }
    res.redirect('/login');
  });
});

// API routes
app.get('/api/music', async (req, res) => {
  const { query } = req.query;

  try {
    let endpoint = 'chart.gettoptracks';

    if (query) {
      endpoint = 'track.search';
    }

    const response = await axios.get('http://ws.audioscrobbler.com/2.0/', {
      params: {
        method: endpoint,
        api_key: process.env.LASTFM_API_KEY,
        format: 'json',
        ...req.query
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching music data:', error);
    res.status(500).json({ error: 'Error fetching music data' });
  }
});

app.post('/api/music', async (req, res) => {
  const { query } = req.body;

  try {
    let endpoint = 'chart.gettoptracks';

    if (query) {
      endpoint = 'track.search';
    }

    const response = await axios.get('http://ws.audioscrobbler.com/2.0/', {
      params: {
        method: endpoint,
        api_key: process.env.LASTFM_API_KEY,
        format: 'json',
        ...req.body
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching music data:', error);
    res.status(500).json({ error: 'Error fetching music data' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;

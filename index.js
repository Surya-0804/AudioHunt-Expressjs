const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, db, setDoc, doc, getDoc } = require('./firebaseConfig'); 

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));

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

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    res.redirect('/dashboard');
  } catch (error) {
    res.render('login', { error: error.message });
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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

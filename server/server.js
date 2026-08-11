const express = require('express');
const axios = require('axios');
const path = require('path');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const apiKey = process.env.API_KEY;
const baseUrl = 'https://api.spoonacular.com/';

// --- Security headers: must come before static + routes ---
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        baseUri: ["'none'"],
        objectSrc: ["'none'"],
        manifestSrc: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: false, // enable later only if you confirm nothing breaks
  })
);

app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), camera=(), microphone=(), payment=(), usb=()'
  );
  next();
});
// --- end security headers ---

app.use(express.static(path.join(__dirname, '../client/dist')));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

function errorHandler(err, req, res, next) {
  console.error(`Error occurred: ${err.message}`);
  console.error(`Stack trace: ${err.stack}`);
  console.error(`Request URL: ${req.url}`);

  if (err.response && err.response.status) {
    res.status(err.response.status);
    if (err.response.status === 402) {
      res.send('API Limit reached, try again later');
    } else {
      res.send(`Error ${err.response.status}: ${err.response.data.message || 'An error occurred'}`);
    }
  } else {
    res.status(500).send('Something went wrong, try again later');
  }
}

// Endpoint to get recipes
app.get('/api/recipes', async (req, res, next) => {
  const { ingredients, diet, intolerances } = req.query;
  const numberOfResults = 25;

  try {
    const response = await axios.get(`${baseUrl}recipes/complexSearch`, {
      params: {
        apiKey,
        includeIngredients: ingredients,
        diet,
        intolerances,
        number: numberOfResults,
      },
    });
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

// Endpoint to get a single recipe's details
app.get('/api/recipes/:id', async (req, res, next) => {
  const recipeId = req.params.id;

  try {
    const response = await axios.get(`${baseUrl}recipes/${recipeId}/information`, {
      params: { apiKey },
    });
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

// Endpoint to retrieve autocomplete suggestions
app.get('/api/autocomplete', async (req, res, next) => {
  const { query } = req.query;
  const numberOfResults = 5;

  try {
    const response = await axios.get(`${baseUrl}food/ingredients/autocomplete`, {
      params: { apiKey, query, number: numberOfResults },
    });
    res.json(response.data);
  } catch (error) {
    next(error);
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// error handler must be LAST — after all routes including the catch-all
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
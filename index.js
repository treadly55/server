// --- 1. Get Your Tools ---
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis'); // <-- NEW: Google's main toolkit

const app = express();
const PORT = process.env.PORT || 3000;

// --- 2. Set Up Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- 3. Google Sheets Authentication ---
//    This block runs as soon as the server starts.
//    It reads the secret JSON from the Environment Variable.
//    It authorizes our "robot" to use Google Sheets.

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS), // Reads the secret key
  scopes: ['https://www.googleapis.com/auth/spreadsheets'], // Sets permission to "Sheets only"
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID; // Reads the Sheet ID you just added

console.log('Server authenticated with Google successfully.');

// --- 4. Define Your Server's Jobs (Endpoints) ---

/**
 * JOB #1: "Are you live?" check.
 */
app.get('/', (req, res) => {
  res.send('Server is live and running. Ready for tasks.');
});

/**
 * JOB #2: "Ping Website" task.
 */
app.get('/run-ping-job', async (req, res) => {
  const websiteToPing = 'https://hf-object-detect-three.onrender.com';
  console.log('--- Ping job started ---');
  try {
    await fetch(websiteToPing);
    console.log(`Successfully pinged ${websiteToPing}`);
    res.status(200).send('Ping successful!');
  } catch (error) {
    console.error(`Failed to ping ${websiteToPing}:`, error.message);
    res.status(500).send('Ping failed.');
  }
});

/**
 * JOB #3: "Form Data Receiver" (NEW GOOGLE SHEETS VERSION)
 */
app.post('/submit-form', async (req, res) => {
  console.log('--- Form data received! ---');
  
  // 1. Log to console
  console.log(req.body); 
  const { customer_name, customer_email } = req.body; // Get data from the form

  // 2. Prepare the data for Google Sheets
  //    It needs to be an "array of arrays", where each inner array is a new row.
  const newRow = [
    new Date().toISOString(), // Column A (Timestamp)
    customer_name,            // Column B (Name)
    customer_email            // Column C (Email)
  ];

  // 3. Send the data to the sheet!
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:C', // Assumes your sheet is named 'Sheet1'. Change if needed!
      valueInputOption: 'USER_ENTERED', // Acts like you typed the data in
      resource: {
        values: [newRow], // The array of arrays
      },
    });

    console.log('Data saved to Google Sheet successfully!');
    res.status(200).send('Form data received and saved to Google Sheet!');

  } catch (error) {
    console.error('Error saving to Google Sheet:', error);
    res.status(500).send('Form data received but could not be saved to Google Sheet.');
  }
});


// --- 5. Start The Server ---
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
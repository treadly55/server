// --- 1. Get Your Tools ---
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 2. Set Up Middleware ---
app.use(cors());
app.use(express.json()); // This is what parses the JSON body
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// --- 3. Google Sheets Authentication (Safer Version) ---
let googleAuthClient;
let SPREADSHEET_ID;

try {
  if (!process.env.GOOGLE_CREDENTIALS) {
    throw new Error('GOOGLE_CREDENTIALS environment variable is not set.');
  }
  if (!process.env.SPREADSHEET_ID) {
    throw new Error('SPREADSHEET_ID environment variable is not set.');
  }

  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

  googleAuthClient = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https.www.googleapis.com/auth/spreadsheets'],
  });

  SPREADSHEET_ID = process.env.SPREADSHEET_ID;

  console.log('Google Auth and Spreadsheet ID loaded successfully.');

} catch (error) {
  console.error('!!! FATAL GOOGLE AUTH ERROR !!!', error.message);
  console.error('This is likely an error in your Environment Variables. Server will run, but Google Sheets saving will be disabled.');
}

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
 * JOB #3: "Form Data Receiver" (NEW ROBUST VERSION)
 */
app.post('/submit-form', (req, res) => {
  console.log('--- Form data received! ---');
  
  // 1. Log to console (Core Task)
  console.log(req.body); 

  // 2. SEND RESPONSE IMMEDIATELY
  res.status(200).send('Form data received. Processing in background.');

  // 3. Run background tasks *after* responding
  saveData(req.body);
});

// This is the helper function to do the saving
async function saveData(data) {
  
  // --- 1. Get ALL 5 variables from the form data ---
  const { name, email, phone, message, timestamp } = data;

  // --- 2. Save to .txt file (using the form's timestamp) ---
  const dataToStore = `${timestamp || new Date().toISOString()}: ${JSON.stringify(data)}\n`;
  try {
    const filePath = path.join(__dirname, 'public', 'submissions.txt');
    await fs.mkdir(path.join(__dirname, 'public'), { recursive: true });
    await fs.appendFile(filePath, dataToStore);
    console.log('Data saved to submissions.txt');
  } catch (error) {
    console.error('Error saving to .txt file:', error.message);
  }

  // --- 3. Save to Google Sheets (using the form's timestamp) ---
  if (!googleAuthClient || !SPREADSHEET_ID) {
    console.error('Google Sheets saving skipped. Auth is not configured correctly.');
    return;
  }

  try {
    // 1. Create the new row array in the correct order
    //    We use the form's timestamp first, or a new one as a fallback.
    const newRow = [
      timestamp || new Date().toISOString(), // Column A (From form)
      name      || '',                      // Column B
      email     || '',                      // Column C
      phone     || '',                      // Column D
      message   || ''                       // Column E
    ];

    // 2. Get the Google Sheets client
    const sheets = google.sheets({ version: 'v4', auth: googleAuthClient });

    // 3. Send the data!
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:E', // Writing to 5 columns
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [newRow],
      },
    });
    console.log('Data saved to Google Sheet (fully mapped)!');
  } catch (error) {
    console.error('Error saving to Google Sheet:', error.message);
  }
}


// --- 5. Start The Server ---
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

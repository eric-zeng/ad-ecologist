import commandLineArgs from 'command-line-args';
import commandLineUsage, { OptionDefinition } from 'command-line-usage';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import 'source-map-support/register';
import saveScreenshot from './saveScreenshot';
// import { siteAllowList } from './siteAllowList';
import { detect } from 'detect-browser';

// Process and validate command line args
const optionDefinitions: OptionDefinition[] = [
  {
    name: 'pg_creds',
    type: String,
    defaultValue: path.resolve(__dirname, '../pg_creds.json'),
    description: 'File with postgres database credentials (default: server/pg_creds.json)'
  },
  {
    name: 'screenshot_dir',
    alias: 's',
    type: String,
    description: 'Directory where new screenshot files should be saved.'
  },
  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'Display this help message'
  }
];

const usageGuide = [
  {
    header: 'Ad Prices Server',
    content: 'Backend for ad prices study'
  },
  {
    header: 'Options',
    optionList: optionDefinitions
  }
];

const args = commandLineArgs(optionDefinitions);
const usage = commandLineUsage(usageGuide);

if (args.help) {
  console.log(usage);
  process.exit(0);
}

if (!args.screenshot_dir) {
  console.log('Missing argument: screenshot_dir');
  console.log(usage);
  process.exit(1);
}

if (!fs.lstatSync(args.screenshot_dir).isDirectory()) {
  console.log(`${args.screenshot_dir} is not a valid directory`);
  console.log(usage);
  process.exit(1);
}

if (!fs.existsSync(args.pg_creds)) {
  console.log(`Could not find a postgres credentials file at: ${args.pg_creds}`);
  console.log(usage);
  process.exit(1);
}

// Set up database connection
const pgCreds = JSON.parse(fs.readFileSync(args.pg_creds).toString());
const pg = new Pool(pgCreds);

// Set up server middleware
const app = express();
app.use(express.json({ limit: '20mb' }));
app.use('/js', express.static(path.join(__dirname, '../dist/js')));
app.use('/css', express.static(path.join(__dirname, '../dist/css')));
app.use('/img', express.static(path.join(__dirname, '../dist/img')));

async function isValidParticipant(req: Request, res: Response, next: NextFunction) {
  const extensionExists = await pg.query(
      `SELECT * FROM extension WHERE e_id=$1 AND participant_id IS NOT NULL`,
      [req.body.eID]);

  if (extensionExists.rowCount !== 0) {
    next();
  } else {
    const eid = req.body.eid ? `(eID = ${req.body.eID})` : '';
    console.log(`[${new Date().toLocaleString()}] Invalid eID ${eid} from ${req.ip}: ${req.method} ${req.path} `);
    res.status(403).send();
  }
}

function logEndpoint(req: Request, res: Response, next: NextFunction) {
  const eid = req.body.eid ? `(eID = ${req.body.eID})` : '';
  console.log(`[${new Date().toLocaleString()}] ${req.ip}: ${req.method} ${req.path} ${eid}`);
  next();
}

// Home page
app.get('/', logEndpoint, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/html/index.html'));
});

// page for extension installation instructions
app.get('/installationinstructions.html', logEndpoint, async (req, res) => {
  const browser = detect(req.get('user-agent'));
  switch (browser && browser.name) {
    case 'chrome':
      res.sendFile(path.join(__dirname, '../dist/html/installationinstructionschrome.html'));
      break;
    case 'edge-chromium':
      res.sendFile(path.join(__dirname, '../dist/html/installationinstructionsedge.html'));
      break;
    default:
      res.sendFile(path.join(__dirname, '../dist/html/browser_not_supported.html'))
  }
});

// page for privacy policy
app.get('/privacy.html', logEndpoint, async (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/html/privacy.html'));
});

app.post('/register', logEndpoint, async (req, res) => {
  try {
    console.log(`Prolific ID: ${req.body.prolificId}, Extension ID: ${req.body.extensionId}`);

    // First, check if the participant exists (should be pre-registered from
    // the earlier survey)
    const participant = await pg.query(
      `SELECT id, prolific_id FROM participant WHERE prolific_id=$1;`,
      [req.body.prolificId]);

    if (participant.rowCount === 0) {
      console.log(`No preregistered participant with Prolific ID ${req.body.prolificId}`);
      res.status(403).send();
      return;
    }
    // console.log(participant.rows[0]);

    // Second, check if this extension instance already eixsts
    const extensions = await pg.query(
      `SELECT e_id FROM extension WHERE participant_id=$1`,
      [participant.rows[0].id]);
    // console.log(extensions.rows);

    if (extensions.rows.findIndex(ext => ext.e_id === req.body.extensionId) !== -1) {
      console.log('Extension previously registered by participant');
      res.status(200).send();
      return;
    }

    const browser = detect(req.get('user-agent'));

    // Create new extension instance if it doesn't exist
    await pg.query(`INSERT INTO extension (e_id, participant_id, browser, os, browser_version) VALUES ($1, $2, $3, $4, $5)`,
      [req.body.extensionId, participant.rows[0].id, browser?.name, browser?.os, browser?.version]);
    console.log('Extension registered');
    res.status(200).send();
  } catch (e) {
    console.log(e);
    res.status(500).send();
  }
});

// app.get('/siteAllowList', (req, res) => {
//   res.json(siteAllowList);
// });

// Takes ad data from extension, saves the image data in a file, and the
// metadata in the database
app.post('/ad_data', logEndpoint, isValidParticipant, async (req, res) => {
  try {
    let extension_id = req.body.eID;
    let innerData = req.body.data;
    let pageID = req.body.pageLoadID;

    // Save ad metadata in a new row of |ad|
    const adQuery = await pg.query(`
      INSERT INTO ad (e_id, timestamp, parent_url, html, pages_id)
      VALUES ($1, NOW(), $2, $3, $4) RETURNING ID`,
      [extension_id, innerData.parentUrl, innerData.html, pageID]
    );
    const adId = adQuery.rows[0].id;

    // console.log(`Ad saved in database with id=${adId}`);

    // call method that returns array of bids, then iterate through
    // the bids to ad an entry for each bid
    if (innerData.bidResponses) {
      let bids = innerData.bidResponses;
      for (let bid of Object.keys(bids)) {
        await pg.query(`
        INSERT INTO bids (e_id, ad_id, cpm, currency, bidderCode,
        width, height, raw_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [extension_id, adId, bids[bid]['cpm'], bids[bid]['currency'],
            bids[bid]['bidderCode'],
            bids[bid]['width'], bids[bid]['height'], bids[bid]]);
      }
    }

    // now send winning bids or prebid winning bids
    // iterate through prebid winning bids if not empty
    if (innerData.prebidWinningBids) {
      let prebids = innerData.prebidWinningBids;
      await pg.query(`
      INSERT INTO winning_bids (e_id, ad_id, cpm, currency,
      bidderCode, width, height, rendered, raw_json)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [extension_id, adId, prebids['cpm'], prebids['currency'],
          prebids['bidderCode'], prebids['width'],
          prebids['height'], false, prebids]);
    }

    // iterate through winning if not empty, should only be max
    // of one winning
    if (innerData.winningBids) {
      let winningBids = innerData.winningBids;
      await pg.query(`
      INSERT INTO winning_bids (e_id, ad_id, cpm, currency,
      bidderCode, width, height, rendered, raw_json)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [extension_id, adId, winningBids['cpm'],
          winningBids['currency'], winningBids['bidderCode'],
          winningBids['width'], winningBids['height'], true,
          winningBids]);
    }
    res.status(200).json({ adId: adId });
  } catch (e) {
    console.log(e);
    res.status(500).send();
  }
});

app.post('/ad_screenshot_data', logEndpoint, isValidParticipant, async (req, res) => {
  let screenshotPath: string | undefined;
  if (req.body.screenshot) {
    try {
      screenshotPath = await saveScreenshot({
        saveDir: args.screenshot_dir,
        dataUrl: req.body.screenshot,
        imgHeight: req.body.height,
        imgWidth: req.body.width,
        adRect: req.body.rect
      });
      // console.log(`Screenshot saved at ${screenshotPath}`);
    } catch (e) {
      console.log('Error saving screenshot');
      console.log(e);
    }
  }

  try {
    await pg.query(`UPDATE ad SET screenshot=$1, html=$2 WHERE id=$3`,
      [screenshotPath, req.body.html, req.body.adId]);
    res.status(200).send();
  } catch (e) {
    console.log('Error updating ad with screenshot data');
    console.log(e);
    res.status(500).send();
  }
});


// log request/response events
app.post('/request_event_data', logEndpoint, isValidParticipant, async (req, res) => {
  try {
    let b  = req.body.data;
    let pageID = req.body.pageLoadID;
    for (let r of b) {
      await pg.query(`
      INSERT INTO request_event (top_url, request_url, request_id,
        referer_url, window_type, response_headers, response_code,
        resource_type, method, response_time, request_time, request_headers,
        pages_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
        to_timestamp($10 / 1000.0), to_timestamp($11 / 1000.0), $12, $13)`,
      [r.top_url, r.request_url, r.request_id, r.referer_url,
      r.window_type, JSON.stringify(r.response_headers), r.response_code, r.resource_type,
      r.method, r.response_time, r.request_time, JSON.stringify(r.request_headers),
      pageID]);
    }
    res.status(200).send();
  } catch (e) {
    console.log(e);
    res.status(500).send();
  }
});

// log when a cookie is set
app.post('/cookie_event_data', logEndpoint, isValidParticipant, async (req, res) => {
  try {
    let b = req.body.data;
    let pageID = req.body.pageLoadID;

    // might double check and make sure that user id doesn't already exist
    for (let c of b) {
      await pg.query(`
      INSERT INTO programmatic_cookie_event
      (top_url, setting_script_url, cookie_string, timestamp, pages_id)
      VALUES ($1, $2, $3, to_timestamp($4 / 1000.0), $5)`,
        [c.top_url, c.setting_script_url, c.cookie_string,
        c.timestamp, pageID]);
    }

    res.status(200).send();
  } catch (e) {
    console.log(e);
    res.status(500).send();
  }
});

// log when a page is visited and measurement is complete
app.post('/log_page_data', logEndpoint, isValidParticipant, async (req, res) => {
  try {
    // adds page_url and e_id and gives a serial id
    await pg.query(`INSERT INTO pages
      (id, page_url, e_id, cur_load, time_loaded)
      VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0))`,
        [req.body.pageLoadID, req.body.pageURL, req.body.eID,
        req.body.curLoad, req.body.timestamp]);

    res.status(200).send();
  } catch (e) {
    console.log(e);
    res.status(500).send();
  }
});

interface ExcludeReasons {
  tooPersonal: boolean,
  revealsHistory: boolean,
  incorrect: boolean,
  other: boolean,
  otherReason?: string,
  adDescription?: string
}
app.post('/exclude_reason_data', logEndpoint, isValidParticipant, async (req, res) => {
  try {
    const eID = req.body.eID;
    for (let entry of Object.entries(req.body.excludeReasons)) {
      let [adId, reasons] = entry as [string, ExcludeReasons];
      await pg.query(`INSERT INTO exclude_reason
          (e_id, ad_id, too_personal, reveals_history, incorrect, other_reason, ad_description)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [eID, adId, reasons.tooPersonal, reasons.revealsHistory,
            reasons.incorrect, reasons.otherReason, reasons.adDescription]);
    }
    res.status(200).send();
  } catch (e) {
    console.log(e);
    res.status(500).send();
  }
});

app.post('/relevance_survey_data', logEndpoint, isValidParticipant, async (req, res) => {
  try {
    const eID = req.body.eID;
    const responses = req.body.responses;
    await pg.query(`INSERT INTO relevance_survey
        (e_id, ad_id, is_blank, targeting_perception, relevance, retargeted, likely_to_click)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [eID, responses.adId, responses.isblank, responses.targetingPerception,
          responses.relevance, responses.retargeted, responses.likelyToClick]);
    res.status(200).send();
  } catch (e) {
    console.log(e);
    res.status(500).send();
  }
});


// Starts the database connection and server
pg.connect().then(() => {
  console.log('Connected to Postgres');
  app.listen(6800, () => {
    console.log('Server listening on port 6800');
  });
});
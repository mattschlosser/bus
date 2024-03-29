const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const moment = require('moment-timezone');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

let db_path = process.env.DB_PATH || './'
const db = new sqlite3.Database(db_path + 'temp2.db', sqlite3.OPEN_READONLY)
const app = express();
app.use(cors());
/**
 * Checks that the date is a formatted like YYYY-MM-DD
 * 
 * @param    {String}   date  A string representing a date
 * @returns  {Boolean}        True if properly formatted; else false
 */
function isValidDate(date) {
    return date.match(/\d{4}-\d{2}-\d{2}/)
}

/**
 * Checks that the time if formatted like HH:MM
 * 
 * @param   {String}   time  A string representing the time
 * @returns {Boolean}        True if properly formatted; else false. 
 */
function isValidTime(time) {
    return time.match(/\d{2}:\d{2}/)
}

function localEdmontonTimeToISO(date, time) {
    const d = new Date(moment.tz(`${date} ${time}`, "America/Edmonton").format());
    return d.toISOString();
}

/**
 * Gets the current location of all ETS electric buses from the database. 
 */
function getElectricBuses() {
    const date = moment.tz(moment(), "America/Edmonton");
    const least = date.clone().subtract(2, 'minutes');
    const electricOnly = true;
    return getAllBusesForTimeRange(least, date, electricOnly)
}

/**
 * 
 * Searches the database for locations of buses within a given time range.
 * 
 * @param    {moment}   least         A moment specifying the oldest time to search for buses
 * @param    {moment}   most          A moment specifying the newest time to search for buses
 * @param    {Boolean}  electricOnly  Whether to return only electric buses
 * @returns  {Promise}                An array of objects, each one representing a bus location.
 */
function getAllBusesForTimeRange(least, most, electricOnly = false) {
    return new Promise((res, rej) => {
        const sql = `
            SELECT * 
            FROM pos 
            WHERE timestamp>=strftime('%s', ?) 
            AND timestamp<=strftime('%s', ?) 
            AND CASE ? WHEN 1 THEN bus >= 7000 ELSE 1 END
            GROUP BY bus;`
        db.all(sql, least.format(), most.format(), electricOnly, (err, rows) => {
            if (err) {
                rej(err);
            }
            res(rows);
        })
    });
}

// send the map file background
app.get('/map', (req,res) => res.sendFile('./map2.png', {root: __dirname}))

// electric buses only 
app.get('/bus/electric', async (req, res) => {
    // get the current location of all electric buses
    try {
        rows = await getElectricBuses();
        res.json(rows);
    } catch(error) {
        console.error(error)
        res.sendStatus(500)
    }
});

app.get('/bus/now', (req, res) => {
    db.all("SELECT * FROm pos where timestamp > strftime('%s', datetime('now', '-2 minutes')) group by bus", [], (err, rows) => {
        if (err) {
            // rej(err);
            res.send(err);
            res.sendStatus(500);
        }
        res.send(rows);
    })
})

app.get('/bus/stats/speed/:bus', (req, res) => {
    db.all(`SELECT 
                avg(speed) as \`speed\`, 
                max(speed) as \`max\`, 
                strftime('%Y-%m-%d', datetime(timestamp, 'unixepoch', 'localtime')) as \`date\` 
            FROM 
                pos 
            WHERE
                timestamp > strftime('%s', datetime('now', '-4 days')) 
            AND bus = ?
            GROUP BY date;`, 
            [req.params.bus], 
            (err, rows) => {
                if (err) {
                    // res.send();
                    console.error(err);
                    res.sendStatus(500);
                } else {
                    res.send(rows);
                }
            }
    )
})

app.get('/bus/stats/speed', (req, res) => {
    db.all(`SELECT 
                avg(speed) as \`speed\`, 
                max(speed) as \`max\`, 
                strftime('%Y-%m-%d', datetime(timestamp, 'unixepoch', 'localtime')) as \`date\` 
            FROM 
                pos 
            WHERE
                timestamp > strftime('%s', datetime('now', '-4 days')) 
            GROUP BY date;`, 
            [], 
            (err, rows) => {
                if (err) {
                    // res.send();
                    console.error(err);
                    res.sendStatus(500);
                } else {
                    res.send(rows);
                }
            }
    )
})

app.get('/bus/stats/speed/:bus', (req, res) => {
    db.all(`SELECT 
                avg(speed) as \`speed\`, 
                max(speed) as \`max\`, 
                strftime('%Y-%m-%d', datetime(timestamp, 'unixepoch', 'localtime')) as \`date\` 
            FROM 
                pos 
            WHERE
                timestamp > strftime('%s', datetime('now', '-4 days')) 
            GROUP BY date
            ORDER BY date desc;`, 
            [], 
            (err, rows) => {
                if (err) {
                    // res.send();
                    console.error(err);
                    res.sendStatus(500);
                } else {
                    res.send(rows);
                }
            }
    )
})

// flexible API for wall-clock based searching
app.get('/bus/:date/:time/:spread?', async (req,res) => {
    //;
    try {
        let date = req.params.date;
        if (!isValidDate(date)) {
            throw "Bad date format";
        }
        let time = req.params.time;
        if (!isValidTime(time)) {
            throw "Bad time format";
        }
        const spread = req.params.spread || 2;
        const s = (spread % 5);

        const d = moment.tz(`${date} ${time}`, "America/Edmonton");
        const least = d.clone().subtract(s, 'minutes');
        const most = d.clone().add(s, 'minutes');
        try {
            rows = await getAllBusesForTimeRange(least, most)
            res.json(rows)
        } catch (err) {
            console.error(err)
            res.sendStatus(500);
        }
    } catch (e) {
        console.error(err);
        res.sendStatus(500);
    }
})

// load front-end file
// app.use('/', express.static(path.join(__dirname, 'dist')))
app.use(express.static(path.join(__dirname, 'dist')))
app.get('/*', (req,res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
})
// start the server
app.listen(8081);

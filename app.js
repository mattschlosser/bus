const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const moment = require('moment-timezone')
require('dotenv').config();
let db_path = process.env.DB_PATH || './'
const db = new sqlite3.Database(db_path + 'bus.db', sqlite3.OPEN_READONLY)
const app = express();

/**
 * Checks that the date is a formatted like YYYY-MM-DD
 * @param {String} date 
 * @returns {Boolean}
 */
function isValidDate(date) {
    return date.match(/\d{4}-\d{2}-\d{2}/)
}

/**
 * Checks that the time if formatted like HH:MM
 * @param {String} time 
 * @returns {Boolean}
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
 * @param {moment} least A moment specifying the oldest time to search for buses
 * @param {moment} most A moment specifying the newest time to search for buses
 * @param {Boolean} electricOnly Whether to return only electirc buses or not
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
        console.log(rows);
        res.json(rows);
    } catch(error) {
        console.error(error)
        res.sendStatus(500)
    }
});

// flexible API for wall-clock based searching
app.get('/bus/:date/:time/:spread?/:route?', (req,res) => {
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

        const route = req.params.route || 0;

        const isNoRoute = !route;
        const d = new Date(moment.tz(`${date} ${time}`, "America/Edmonton").format());
        const b = new Date(moment.tz(`${date} ${time}`, "America/Edmonton").format());
        const e = new Date(moment.tz(`${date} ${time}`, "America/Edmonton").format());
        b.setMinutes(d.getMinutes() - s);
        e.setMinutes(d.getMinutes() + s);
        db.all("select * from pos where timestamp>=strftime('%s', ?) and timestamp<=strftime('%s', ?) and (trip = ? or ?) group by bus;", 
        b.toISOString(), e.toISOString(), route, isNoRoute,
        (err, rows) => {
            res.json(rows)
        });
    } catch (e) {
        res.statusCode = 500;
        res.send(e)
    }
})

// load front-end file
app.get('/', (req, res) => {
    res.sendFile('./index.html', {root: __dirname})
})

// start the server
app.listen(8080);

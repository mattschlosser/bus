const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const moment = require('moment-timezone')
require('dotenv').config();
let db_path = process.env.DB_PATH || './'
const db = new sqlite3.Database(db_path + 'bus.db', sqlite3.OPEN_READONLY)
const app = express();
app.get('/map', (req,res) => res.sendFile('./map2.png', {root: __dirname}))
app.get('/bus/:date/:time/:spread?/:route?', (req,res) => {
    //;
    try {
        let date = req.params.date;
        if (!date.match(/\d{4}-\d{2}-\d{2}/)) {
            throw "Bad date format";
        }
        let time = req.params.time;
        if (!time.match(/\d{2}:\d{2}/)) {
            throw "Bad time format";
        }
        console.log(date, time);
        const spread = req.params.spread || 2;
        const route = req.params.route || 0;
        const isNoRoute = !route;
        const s = (spread % 5);
        const d = new Date(moment.tz(`${date} ${time}`, "America/Edmonton").format());
        const b = new Date(moment.tz(`${date} ${time}`, "America/Edmonton").format());
        const e = new Date(moment.tz(`${date} ${time}`, "America/Edmonton").format());
        b.setMinutes(d.getMinutes() - s);
        e.setMinutes(d.getMinutes() + s);
        console.log(b.toISOString(), e.toISOString())
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

app.get('/', (req, res) => {
    res.sendFile('./index.html', {root: __dirname})
})
app.listen(8080);

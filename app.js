const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('bus.db', sqlite3.OPEN_READONLY)
const app = express();
app.get('/bus/:date/:time/:spread?/:route?', (req,res) => {
    //;
    try {
        let date = req.params.date;
        let time = req.params.time;
        console.log(date, time);
        let spread = req.params.spread || 2;
        let route = req.params.route || 0;
        let isNoRoute = !route;
        let s = (spread % 5);
        let d = new Date(`${date}T${time}-06:00`);
        let b = new Date(`${date}T${time}-06:00`);
        let e = new Date(`${date}T${time}-06:00`);
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

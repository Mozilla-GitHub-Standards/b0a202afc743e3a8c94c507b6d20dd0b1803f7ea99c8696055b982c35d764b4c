'use strict'

let express = require('express');
let cors = require('cors');
let bodyParser = require('body-parser');
let path = require('path');
let jade = require('jade');
let MongoClient = require('mongodb').MongoClient;

let pingCollection = null;
let alarmCollection = null;

let url = 'mongodb://localhost:27017/raspberry';
MongoClient.connect(url, (err, db) => {
  console.log("Connected correctly to server");

  pingCollection = db.collection('pings');
  alarmCollection = db.collection('alarms');
});

let app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.get('/', (req, res) => {
  let ping;
  let alarms = [];

  pingCollection.find({}).sort({
    timestamp: -1
  }).limit(1).toArray(function(err, pingItems) {
    ping = pingItems[0];

    alarmCollection.find({}).sort({
      timestamp: -1
    }).limit(10).toArray(function(err, alarmItems) {
      alarms = alarmItems;

      let working = true;
      let lastPingDate = new Date(ping.timestamp)
      let lastPing = lastPingDate.getTime();
      let currentTime = Date.now();

      // It might not be working if we didn't receive a ping in the last 30 minutes
      // = 30 * 60 = 1800 s
      if (currentTime - lastPing > 1800000) {
        working = false;
      }

      res.render('index', { alarms: alarms, ping: ping, working: working });
    });;
  });;
});

app.post('/ping', (req, res) => {
  console.log('API got a Ping!');
  let data = JSON.parse(req.body.data);
  pingCollection.insert(data, (err, result) => {
    if (err) {
      console.log('ERROR: ' + err);
    }

    res.send(result);
  });
});

app.post('/alarm', (req, res) => {
  console.log('API got an Alarm!');
  let data = JSON.parse(req.body.data);
  alarmCollection.insert(data, (err, result) => {
    if (err) {
      console.log('ERROR: ' + err);
    }

    res.send(result);
  });
});

app.get('/confirm/:alarmId', (req, res) => {
  let alarmId = req.params.alarmId;

  alarmCollection.update({ id: alarmId }, { $set: { confirmed: true }}, { multi: true }, (err, result) => {
    if (err) {
      console.log('ERROR: ' + err);
    }

    res.send(result);
  });
});

app.listen(8000, () => {
  console.log('API listening on port 8000!');
});

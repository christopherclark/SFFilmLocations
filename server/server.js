var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');
var path = require('path');

var port = process.env.PORT || 3000;

var app = express();
var server = app.listen(port, function() {
  console.log('Server listening on port ' + port);
});

app.use(bodyParser.json());

//Path for serving static files
app.use('/public', express.static(path.join(__dirname, '/../public')));
app.use('/bower_components', express.static(path.join(__dirname + '/../bower_components')));

//Load index when server is started
app.get('/',function(req,res){
  res.sendFile(path.join(__dirname + '/../index.html'));
});

//CORS nonsense
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//global variable which will be returned to client
var coordArray = [];

app.post('/markers', function (req, res, next) {
  //empty coordinate array 
  coordArray = [];
  var promises = [];

  console.log('request body',req.body);//load an array of promises for each coordinate in the request
  req.body.forEach(function(x){
    promises.push(placesReq(x));
  });
  Promise.all(promises).then(function() {
    //once all coordinates have been returned,
    //send coordinate array back to client
    setTimeout(function() {
      console.log('results: ', coordArray);
      res.send(coordArray);
    }, 1500);
  }).catch(function(reason) {
    console.log(reason);
    res.send(reason);
  });
});

//google places api endpoint, place name needed
var mapsKey = require('./config.js').key;
var endpoint = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?key='+mapsKey+
  '&location=37.78,-122.42&radius=10000&name=';

function placesReq(placeName){
    var promise = new Promise(function(resolve, reject) {

      request(endpoint+placeName, function (error, response, body) {
        var coordinates = {};
        if (!error && response.statusCode == 200) {
          
          if(JSON.parse(body).results[0] !== undefined){
            //if lat & are found they'll be found here 
            coordinates = JSON.parse(body).results[0].geometry.location;
            coordinates.name = placeName;
          } else { 
            console.log('placename', placeName)
            //if not, we set them to null
            coordinates = {name: placeName, lat: null, lng: null};
            console.log('coordinates not found', body);
          }

          console.log('latLong: ', coordinates);
          //push set of coordinates to coordinates array
          coordArray.push(coordinates);
        } else{
          console.log('error!');
        }
      });
      // req.on('error', function(e) {
      //   console.log('RETURNING ERROR: ' + e.message);
      //   reject(e);
      // });
  return promise;
  });
}


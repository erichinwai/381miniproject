var express = require('express');
var app = express();
app.set('view engine', 'ejs');

var bodyParser = require('body-parser');
var fileUpload = require('express-fileupload');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;
var ExifImage = require('exif').ExifImage;
var fs = require('fs');
var uuid = require('node-uuid');
var uuid1 = uuid.v4();
var uuid2 = uuid.v4();
var mongourl = "mongodb://eric:123456@ds139994.mlab.com:39994/oucloud";

app.use(fileUpload());
//app.use(bodyParser.json()); // support json encoded bodies
//app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies



app.listen(process.env.PORT || 8099);

app.get('/', function(req, res) {
    res.redirect('/insert');
});

app.get('/insert', function(req,res) {
  console.log("/insert");
  res.status(200);
  res.render("uploadtest");
});


app.post('/create', function(req,res) {
  console.log("/create");
  var restid = req.body.restid;
  var borough = req.body.borough;
  var cuisine = req.body.cuisine;

  var building = req.body.building;
  var street = req.body.street;
  var zipcode = req.body.zipcode;
  var coord = req.body.coord;
  var user = req.body.user;
  var score = req.body.score;
  if (!req.files.photoToUpload){
    req.files.photoToUpload ={};
    req.files.photoToUpload.name="no.jpg";
    console.log("No picture");
  }
  
  var owner = (req.body.owner.length > 0) ? req.body.owner : uuid1;
  var name = (req.body.name.length > 0) ? req.body.name : uuid2;
  var mimetype = (req.files.photoToUpload.mimetype > 0)? req.files.photoToUpload.mimetype:"";
  var filename = req.files.photoToUpload.name;
  console.log(filename);
  var new_r ={};
  if (building||street||zipcode||coord){
        var address = {};
        if (req.body.building)address['building'] = req.body.building;
        if (req.body.street)address['street'] = req.body.street;
        if (req.body.zipcode)address['zipcode'] = req.body.zipcode;
        if (req.body.coord)address['coord'] = req.body.coord;
        new_r['address'] = address;
  }
  if (user||score){
        var grades = {};
        if (req.body.user)grades['user'] = req.body.user;
        if (req.body.score)grades['score'] = req.body.score;
        new_r['grades'] = grades;
  }
  console.log(uuid1);
  var exif={};
  var image={};
  image['image']=filename;

  try {
    new ExifImage(image, function(error, exifData) {
      if (error) {
        console.log('ExifImage: ' + error.message);
      }
      else {
        exif['image'] = exifData.image;
        exif['exif'] = exifData.exif;
        exif['gps'] = exifData.gps;
        console.log('Exif: ' + JSON.stringify(exif));
      }
    })
  } catch (error) {}
  

  console.log('About to insert: ' + JSON.stringify(new_r));
fs.readFile(filename, function(err, data){
    MongoClient.connect(mongourl, function(err, db){
      assert.equal(err, null);
      console.log('Connected to MongoDB');
      new_r['restid'] = restid;
      new_r['borough'] = borough;
      new_r['cuisine'] = cuisine;
      new_r['owner'] = owner;
      new_r['name'] = name;
      new_r['mimetype'] = mimetype;
      console.log("mimetype ="+mimetype);
      if (mimetype){
        new_r['image'] = new Buffer(data).toString('base64');
      }
      
      new_r['exif'] = exif;
      insertdata(db, new_r, function(result){
          db.close();
          console.log('Disconnected MongoDB');
          res.status(200);
          res.render("doInsert", { okOrNot: result });      
          if (result != "ok"){
            res.status(200);
            console.log("fail");
            res.render("uploadtest");
          }else{
            res.status(200);
            console.log("success");
            //res.redirect('/insert');
          }
      });
    });
  })
});

app.get('/show', function(req,res) {
  console.log('/show');
  MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    findPhoto(db,{},{_id:1,name:1},function(result) {
      db.close();
      console.log('Disconnected MongoDB');
      res.status(200);
      res.render("listtest",{p:result});
    })
  });
});

app.get('/display', function(req,res) {
  MongoClient.connect(mongourl, function(err,db) {
    assert.equal(err,null);
    console.log('Connected to MongoDB');
    var criteria = {};
    criteria['_id'] = ObjectID(req.query._id);
    findPhoto(db,criteria,{},function(photo) {
      db.close();
      console.log('Disconnected MongoDB');
      console.log('Photo returned = ' + photo.length);
      console.log('GPS = ' + JSON.stringify(photo[0].exif.gps));
      var lat = -1;
      var lon = -1;
      if (photo[0].exif.gps &&
          Object.keys(photo[0].exif.gps).length !== 0) {
        var lat = gpsDecimal(
          photo[0].exif.gps.GPSLatitudeRef,  // direction
          photo[0].exif.gps.GPSLatitude[0],  // degrees
          photo[0].exif.gps.GPSLatitude[1],  // minutes
          photo[0].exif.gps.GPSLatitude[2]  // seconds
        );
        var lon = gpsDecimal(
          photo[0].exif.gps.GPSLongitudeRef,
          photo[0].exif.gps.GPSLongitude[0],
          photo[0].exif.gps.GPSLongitude[1],
          photo[0].exif.gps.GPSLongitude[2]
        );
      }
      console.log(lat,lon);      
      res.status(200);
      res.render("phototest",{p:photo[0],lat:lat,lon:lon});
    });
  });
});

app.get('/map', function(req,res) {
  res.render('gmaptest.ejs',
             {lat:req.query.lat,lon:req.query.lon,name:req.query.name});
});




function gpsDecimal(direction,degrees,minutes,seconds) {
  var d = degrees + minutes / 60 + seconds / (60 * 60);
  return (direction === 'S' || direction === 'W') ? d *= -1 : d;
}


function findPhoto(db,criteria,fields,callback) {
  var cursor = db.collection("restaurant").find(criteria);
  var photos = [];
  cursor.each(function(err,doc) {
    assert.equal(err,null);
    if (doc != null) {
      photos.push(doc);
    } else {
      callback(photos);
    }
  });
}

function insertdata(db,r,callback) {
 
  if (r.restid != "" && r.name != "" ){
    db.collection('restaurant').findOne({restid:r.restid}, function(err, result){
      assert.equal(err, null);
      console.log(result);
      if (!result){
        console.log("no repeat");
        db.collection('restaurant').insertOne(r,function(err2,result) {
          assert.equal(err2,null);
          console.log(JSON.stringify(result));
          console.log("insert was successful!");
          callback("ok");
        })

      } else {
        console.log("repeated");
        callback("repeat");
      }
    });
  }else{
    console.log("null exist");
    callback("null");
  }

}



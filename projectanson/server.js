var express = require('express');
var cookieParser = require('cookie-parser')
var app = express();
app.set('view engine', 'ejs');
var fileUpload = require('express-fileupload');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;
var fs = require('fs');

var mongourl = "mongodb://anson:anson@ds243325.mlab.com:43325/anson";

app.use(cookieParser());
app.use(express.static(__dirname + '/public'));
app.use(fileUpload());

app.listen(process.env.PORT || 8099);

app.get('/', function(req, res) {
    res.redirect('/login');
});

app.get('/login', function(req, res) {
    console.log("/login");
    console.log(req.cookies);
    if (req.cookies.userName) {
        res.redirect('/read');
    } else {
        res.status(200);
        res.render("login");
    }
});

app.get('/doCreate', function(req, res) {
    console.log("/doCreate");
    console.log(req.query.userName);
    console.log(req.query.pw);
    MongoClient.connect(mongourl, function(err, db) {
        assert.equal(err, null);
        console.log('Connected to MongoDB');
        createAccount(db, req.query.userName, req.query.pw, function(tf) {
            db.close();
            console.log('Disconnected MongoDB');
            res.status(200);
            res.render("doCreate", { okOrNot: tf });
        });
    });
});

app.get('/doLogin', function(req, res) {
    console.log("/doLogin");
    console.log(req.query.userName);
    console.log(req.query.pw);
    MongoClient.connect(mongourl, function(err, db) {
        assert.equal(err, null);
        console.log('Connected to MongoDB');
        login(db, req.query.userName, req.query.pw, function(tf) {
            db.close();
            console.log(tf);
            if (tf != "ok") {
                res.status(200);
                res.render("login", { fail: tf });
            } else {
                res.status(200);
                res.cookie('userName', req.query.userName);
                res.cookie('pw', req.query.pw);
                console.log('cookie created successfully');
                res.redirect('/read');
            }
        });
    });
});

app.get('/read', function(req, res) {
    console.log("/read");
    var cookie = req.cookies.userName;
    if (cookie === undefined) {
        res.redirect('/login');
    } else {
        console.log("cookie");
        console.log(req.cookies);
        res.status(200);
        res.render("read",{userName:req.cookies.userName});
    }
});

app.get('/logout', function(req, res) {
    console.log("/logout");
    res.clearCookie("userName");
    res.clearCookie("pw");
    res.redirect('/login');
});

function createAccount(db, userName, pw, callback) {
    console.log(userName)
    console.log(pw)
    if (userName != "" && pw != "") {
        db.collection('account').findOne({ userName: userName }, function(err, doc) {
            assert.equal(err, null);
            console.log(doc);
            if (!doc) {
                console.log("no repeat");
                var createAccObj = {
                    userName: userName,
                    pw: pw
                }
                db.collection('account').insertOne(createAccObj, function(err2, doc2) {
                    assert.equal(err2, null);
                    console.log("insert ok");
                    callback("ok");
                })
            } else {
                console.log("repeated");
                callback("repeat");
            }
        });
    } else {
        console.log("null exist");
        callback("null");
    }
}

function login(db, userName, pw, callback) {
    db.collection('account').findOne({ userName: userName }, function(err, doc) {
        assert.equal(err, null);
        console.log(doc);
        if (doc) {
            if (pw == doc.pw) {
                callback("ok");
            } else {
                callback("wrong");
            }
        } else {
            callback("notExist");
        }
    });
}
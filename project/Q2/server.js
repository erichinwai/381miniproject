var express = require('express');
var app = express();

app.set('view engine', 'ejs');

app.get('/simpleinterest',function(req,res) {
   var obj = new SimpleInterest(req.query.p, req.query.r, req.query.t);
   if (req.query.format == 'html') {
      res.status(200);
      res.render('simpleinterest',
               {
                  principal:obj.principal,
                  rate: obj.rate,
                  time: obj.time,
                  interest: obj.interest
               });
   }
   else {
      res.status(200).end(JSON.stringify(obj));
   }
});

app.listen(app.listen(process.env.PORT || 8099));

function SimpleInterest(P,i,t) {
   this.principal = P;
   this.rate = i;
   this.time = t;
   this.interest = P * i * t;
}
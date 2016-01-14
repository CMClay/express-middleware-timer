var express = require('express');
var emt = require('../');
var app = express();

app.use(emt.init(report));

function report(req, res) {
  console.log('TIMER', res._timer);
}

function fastMiddleware(req, res, next) {
    setTimeout(function(){
      res.json(res._timer || {hi:'hi'});
    }, 50);
}
function slowMiddleware(req, res, next) {
    setTimeout(next, 200);
}
function slowestMiddleware(req, res, next) {
    setTimeout(next, 400);
}

app.use(emt.instrument(slowMiddleware));
app.use(slowestMiddleware);
// app.use(emt.instrument(slowestMiddleware));
app.use(emt.instrument(fastMiddleware));

app.get('/', function(req,res) {
    res.send('hello world');
});

app.listen(3000);
console.log('Listening on port 3000');

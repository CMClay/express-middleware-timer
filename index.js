var OFF = (!process.env.TIMER);

var instrumented = 0;
function instrument(middleware, name) {
    if (OFF) return middleware;

    function bindWrapper(m, name) {
        return function wrapper(req, res, next) {
            var cb;
            var start = Date.now();
            var timer = {
                name: name,
                start: start
            };

            function newNext() {
                var now = Date.now();
                timer.end = now;
                next.apply(this, arguments);
            }

            cb = typeof next === 'function' ? newNext : next;

            res._timer.wares.push(timer);
            m(req, res, cb);
        };
    }

    if (typeof middleware === 'function') {
        var position = instrumented++;
        name = name || middleware.name || 'anonymous middlware #'+position;
        return bindWrapper(middleware, name);
    }

    var itter = 0; // if named
    return middleware.map(function(m) {
        var position = instrumented++;
        var newname;
        if (name) {
            newname = name + ' #' + itter++;
        }
        newname = newname || m.name || 'anonymous middlware #'+position;
        return bindWrapper(m, newname);
    });
}

function calculate(req, res) {
    // sillyness to cleanup reporting
    var report = {
        request: { url: req.url, headers: req.headers },
        timers: { startup: { from_start: 0 } }
    };

    var reportedTimers = res._timer.wares;

    function updateReport(timer) {
        var reportNames = Object.keys(report.timers);
        var lastReport  = reportNames[reportNames.length-1];

        if (typeof timer === 'string') {
            report.timers[lastReport].from_start = reportedTimers[timer].from_start;
            report.timers[timer] = {};
        } else {
            var now = Date.now();
            report.timers[lastReport].from_start = now - timer.start;
        }
    }

    Object.keys(reportedTimers).forEach(function(timer) {
        updateReport(timer);
    });

    updateReport(res._timer);
    return report;
}

function report(req, res) {
    if (OFF || !res._timer || !res._timer.wares) return;

    // report
    console.log('------------------------------');
    console.dir(calculate(req, res));
    console.log('------------------------------');
}

function init(reporter) {
    return function (req, res, next) {
        if (OFF) return next();

        var now = Date.now();
        res._timer = {
            start: now,
            end: undefined,
            wares: []
        };

        reporter = (typeof reporter === 'function') ? reporter : report;

        res.on('finish', function onResponseFinish() {
            var now = Date.now()
            var timer = res._timer;
            var last = timer.wares[timer.wares.length - 1];

            timer.end = now;

            if (last && !last.end) last.end;

            reporter(req, res);
        });

        next();
    };
}

module.exports = {
    instrument: instrument,
    init: init,
    calculate: calculate,
    on: (!OFF),
    off: OFF
};


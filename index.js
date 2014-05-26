var through = require('through2')

module.exports = function (asyncFn, initialLimit) {
  var current = 0
  var cbCount = 0
  var onFlush = function () { }

  return through.obj(function (chunk, enc, callback) {
    function maybeCb() {
      if (cbCount > 0) {
        cbCount--
        callback()
      }
    }

    asyncFn(chunk, function (err, result) {
      current--
      this.push(result)
      maybeCb()
      if (current === 0) onFlush()
    }.bind(this))

    cbCount++
    if (++current < initialLimit) maybeCb()
  }, function (callback) {
    onFlush = callback
  })
}

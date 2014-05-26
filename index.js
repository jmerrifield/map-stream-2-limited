var through = require('through2')

module.exports = function (asyncFn, initialLimit) {
  var current = 0
  var cbCount = 0
  var outstandingCallbacks = []
  var onFlush = function () { }
  var limit = initialLimit

  function maybeCb(callback) {
    if (current === limit) return
    if (cbCount > 0) {
      cbCount--
      outstandingCallbacks.splice(outstandingCallbacks.indexOf(callback, 1))
      callback()
    }
  }
  var stream = through.obj(function (chunk, enc, callback) {
    outstandingCallbacks.push(callback)

    asyncFn(chunk, function (err, result) {
      current--
      if (err) return this.emit('error', err)
      this.push(result)
      maybeCb(callback)
      if (current === 0) onFlush()
    }.bind(this))

    cbCount++
    if (++current < limit) maybeCb(callback)
  }, function (callback) {
    onFlush = callback
  })

  stream.changeLimit = function (modifier) {
    var oldLimit = limit
    limit = modifier(limit)

    var diff = limit - oldLimit
    var numNewItemsToAccept = Math.max(0, diff)

    for (var i = 0; i < numNewItemsToAccept; i++) {
      maybeCb(outstandingCallbacks[0])
    }
  }

  return stream
}

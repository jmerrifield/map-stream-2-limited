var through = require('through2')

module.exports = function (asyncFn, initialLimit) {
  var current = 0
  var callbacks = []
  var onEmpty = function () { }
  var limit = initialLimit

  // There's no straightforward way to request a new chunk of data given the
  // underlying Writeable API - we're supposed to call the callback supplied
  // *with each chunk* to signal that we're ready for the next one.
  // Do some lying here and maintain a pool of all callbacks that we can
  // just pop off and invoke to signal that we're ready for another chunk.
  function requestNextChunk() {
    if (current === limit) return
    if (callbacks.length === 0) return

    var cb = callbacks.pop()
    cb.apply(this)
  }

  var stream = through.obj(function (chunk, enc, callback) {
    asyncFn(chunk, function (err, result) {
      current--
      if (err) return this.emit('error', err)

      this.push(result)
      requestNextChunk()

      if (current === 0) onEmpty()
    }.bind(this))

    callbacks.push(callback)
    current++
    requestNextChunk()
  }, function (callback) {
    onEmpty = callback
  })

  stream.changeLimit = function (modifier) {
    var oldLimit = limit
    limit = modifier(limit)

    var numNewItemsToAccept = Math.max(0, limit - oldLimit)

    for (var i = 0; i < numNewItemsToAccept; i++) {
      requestNextChunk()
    }
  }

  return stream
}

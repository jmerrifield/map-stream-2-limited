var assert = require('assert')
var subject = require('./')
var through = require('through2')
var async = require('async')
var EventEmitter = require('events').EventEmitter

function testFun(data, callback) {
  this.running[data] = function () {
    delete this.running[data]
    callback(null, data)
  }.bind(this)
}

var events = new EventEmitter()

function collector() {
  return through.obj(function (chunk, enc, callback) {
    events.emit('data', chunk)
    callback()
  })
}

it('runs things in parallel', function (done) {
  var context = {running: {}}
  var output = collector()

  function completeAndAssertItem(item) {
    return function (callback) {
      events.once('data', function (data) {
        assert.equal(data, item)
        callback()
      })

      context.running[item]()
    }
  }

  function checkRunningFuncs(dataItems) {
    return function (callback) {
      assert.deepEqual(Object.keys(context.running), dataItems)
      callback()
    }
  }

  function assertStreamEnd() {
    return function (callback) {
      stream.on('end', callback)
    }
  }

  var stream = subject(testFun.bind(context), 2)
  stream.pipe(output)
  stream.write('a')
  stream.write('b')
  stream.write('c')
  stream.end()

  async.series([
    checkRunningFuncs(['a', 'b']),
    completeAndAssertItem('a'),
    checkRunningFuncs(['b', 'c']),
    completeAndAssertItem('b'),
    checkRunningFuncs(['c']),
    completeAndAssertItem('c'),
    checkRunningFuncs([]),
    assertStreamEnd()
  ], done)
})

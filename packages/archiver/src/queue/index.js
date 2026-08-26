function Queue(worker, concurrency) {
  this._worker = worker;
  this._concurrency = concurrency;
  this._running = 0;
  this._tasks = [];
  this._drain = null;
  this._killed = false;
}

Queue.prototype.push = function (task) {
  if (this._killed) return;
  this._tasks.push(task);
  this._run();
};

Queue.prototype._run = function () {
  while (this._running < this._concurrency && this._tasks.length > 0) {
    var task = this._tasks.shift();
    this._running++;
    this._worker(task, () => {
      this._running--;
      if (this._killed) return;
      if (this._tasks.length === 0 && this._running === 0 && this._drain) {
        this._drain();
      } else {
        this._run();
      }
    });
  }
};

Queue.prototype.drain = function (cb) {
  this._drain = cb;
};

Queue.prototype.kill = function () {
  this._killed = true;
  this._tasks.length = 0;
};

Queue.prototype.idle = function () {
  return this._tasks.length === 0 && this._running === 0;
};

module.exports.Queue = Queue;

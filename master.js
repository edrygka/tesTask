const cluster = require('cluster')
//const events  = require('events');
const cron = require('node-cron')


function genVerifyCode(min, max){
	let rand = min + Math.random() * (max + 1 - min)
    return Math.floor(rand)
}

var numWorkers = 2

if(cluster.isMaster) {
    //var numWorkers = require('os').cpus().length;
    let randomNum
    let worker
    
    console.log('Master cluster setting up ' + numWorkers + ' workers...')
    for(var i = 0; i < numWorkers; i++) {
        worker = cluster.fork()
    }
    cron.schedule("15 * * * * *", () => {
        randomNum = genVerifyCode(1, 9999999)
        //console.log(randomNum)
        worker.send({result: randomNum})
    })
    cluster.on('online', worker => {
        console.log('Worker ' + worker.process.pid + ' is online')
    })

    worker.on('message', msg => {
      console.log('Master ' + process.pid + ' received message from worker ' + worker.process.pid + '.', msg)
    })

    cluster.on('exit', (worker, code, signal) => {
        console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal)
        console.log('Starting a new worker')
        cluster.fork()
    })
} else {
    const app = require('express')()
    const server = require('http').Server(app)
    const io = require('socket.io')(server)
    const path    = require("path")
    const port = 8080
  
    app.get('/', (req, res) => {
        //res.send("Hello world!");
        //res.end("Master cluster setting up " + numWorkers + " workers...")
        res.sendFile(path.join(__dirname+'/index.html'));
    })
    app.get('/disconnect', (req, res) => {
        res.send('disconnecting')
        cluster.worker.disconnect()     
    });
    process.on("message", msg => {
      io.on('connection', socket => {
        console.log('Client connected...');
        socket.emit('new number', { result: msg.result })
        socket.on('response', data => {
          console.log(data)
        })
      })
      process.send({msgFromWorker: 'This is from worker ' + process.pid + '.'})
      console.log(`worker recieved message ${msg.result}`)
    })
    server.listen(port)
    console.log(`worker ${cluster.worker.id} is listening on port ${port}...`)
}

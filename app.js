const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
let middleware = require('./middleware');
const app = express();
const server = app.listen(5000);
const io = require('socket.io')(5010, {
    handlePreflightRequest: function (req, res) {
        var headers = { // socket cors headers
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Origin': 'http://localhost:3000',
            'Access-Control-Allow-Credentials': true
        };
        res.writeHead(200, headers);
        res.end();
    }
});

io.origins('*:*'); // allow all request origins for sockets

const schedule = require('node-schedule');
const authRoutes = require('./routes/auth-routes');
const userRoutes = require('./routes/user-routes');
const blogRoutes = require('./routes/blog-routes');
const userJobs = require('./scheduled-jobs/update-users');
const messageRoutes = require('./routes/message-routes');

const chatController = require('./controllers/chat-controllers');

var j = schedule.scheduleJob('*/10 * * * * ', userJobs.update); // execute job every X minutes, cron-like syntax

app.use(cors());
app.use(bodyParser.json());
app.use('/', middleware.logRequests); // log every incoming access request
app.use('/api/auth', authRoutes); // auth routes before check token, because login requests do not supply a Token.
app.use('/api', middleware.checkToken);
io.use((socket, next) => middleware.checkSocketToken(socket, next)); // make sure socket requests token is correct;
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blogs', blogRoutes);

io.on('connection', socket => {
    console.log("connected!");
    socket.join(socket.request.headers.referer, () => { // when connecting to socket, join the appropriate room
        console.log('Joined room: ' + socket.request.headers.referer)
    });
    socket.join(socket.id, () => {
        console.log('Joined room: ' + socket.id)
    });

    socket.on('send-message', (message) => {
        console.log(socket.body);
        console.log('hit');
        console.log(message);
        chatController.saveMessageToDB(socket, message, io);
    });
    socket.on('disconnect', () => {
        console.log('Disconnected from room: ' + socket.request.headers.referer)
    })
});

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(8888); // change your port here

var slackAPI = require('slackbotapi');
var slack = new slackAPI({
    'token': "xoxb-1234567890-111111111111111111111111", // replace with your token
    'logging': true
});

var channel = '#thetechteam'; // change this to suit your channel
var slackData = {};

slack.on('hello', function(data) {
    slackData = slack.getSlackData();
});

slack.on('message', function(data) {
    if(typeof data.text == 'undefined') return;

    if(slackData.team && slackData.team.name) var teamName = slackData.team.name;
    else var teamName = data.team;
    data.teamName = teamName;

    var user = slack.getUser(data.user);
    if(user) {
        data.iconUrl = user.profile.image_48;
        data.username = user.name;
    }

    io.emit('message', data);
});

io.on('connection', function(socket) {
    socket.on('message', function(data) {
        io.emit('message', data);
        if(data.subtype !== 'bot_message') {
            slack.reqAPI('chat.postMessage',
                {
                    channel: channel,
                    text: data.text,
                    username: data.username + ' @ ' + data.teamName,
                    icon_url: data.iconUrl
                }
            );
        }
    });
});

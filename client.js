var socket = require('socket.io-client')('http://localhost:8888'); // change your port here

var slackAPI = require('slackbotapi');
var slack = new slackAPI({
    'token': process.argv[2], // run nodejs client.js [RTM API token] from your shell to add a new team
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

    socket.emit('message', data);
});

socket.on('message', function(data) {
    if(data.subtype !== 'bot_message' && data.team !== slackData.team.id) {
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
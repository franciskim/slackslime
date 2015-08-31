var slackAPI = require('slackbotapi');

var channel = '#slackslime';
var tokens = [
    'xoxb-1111111111-xxxxxxxxxxxxxxxxxxxxxxxx',
    'xoxb-2222222222-xxxxxxxxxxxxxxxxxxxxxxxx',
    'xoxb-3333333333-xxxxxxxxxxxxxxxxxxxxxxxx'
];

var slack = new Array();

tokens.forEach(function(token, i) {
    console.log('Starting Slack ' + i);
    slack[i] = new slackAPI({
        'token': token,
        'logging': true
    });

    slack[i].on('message', function(data) {
        if(typeof data.text === 'undefined' || data.subtype === 'bot_message') return;
        self = this;
        var teamName = self.slackData.team.name;
        var user = self.getUser(data.user);

        if(user) {
            data.iconUrl = user.profile.image_48;
            data.username = user.name;
        }

        if(!data.subtype) {
            // normal user message
            var message = {
                channel: channel,
                text: data.text,
                username: data.username + ' @ ' + teamName,
                icon_url: data.iconUrl
            }
            slack.forEach(function(slack) {
                if(slack.token !== self.token) {
                    slack.reqAPI('chat.postMessage', message);
                }
            })
        }
    });
});
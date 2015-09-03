/*
 https://github.com/franciskim/slackslime
 by Francis Kim @ franciskim.co

 how to run from the shell:
 nodejs [channel name] [RTM API token 1] [RTM API token 2] [RTM API token 3] [more tokens]

 for example:
 nodejs devchat xoxb-1111111111-xxx xoxb-2222222222-xxx xoxb-3333333333-xxx

 or for PM2:
 pm2 start slackslime.js -- devchat xoxb-1111111111-xxx xoxb-2222222222-xxx xoxb-3333333333-xxx
 */

var slackAPI = require('slackbotapi');

var slackslime = {}; // config object
// parse command line arguments
slackslime.channelName = process.argv[2];
slackslime.tokens = process.argv.slice(3);

var slack = new Array(); // slack connections get stored here

slackslime.tokens.forEach(function(token, i) {
    slack[i] = new slackAPI({
        'token': token,
        'logging': false
    });

    slack[i].on('message', function(data) {
        var self = this;
        var teamName = self.slackData.team.name;
        var channel = self.getChannel(data.channel);
        var user = self.getUser(data.user);
        if(typeof data.text === 'undefined' || data.subtype === 'bot_message' || channel.name !== slackslime.channelName) return;

        if(user) {
            data.iconUrl = user.profile.image_48;
            data.username = user.name;
        }

        if(!data.subtype) {
            // normal user message
            var message = {
                channel: '#' + slackslime.channelName,
                text: data.text,
                username: data.username + ' @ ' + teamName,
                icon_url: data.iconUrl,
                unfurl_links: true,
                unfurl_media: true
            };
            slack.forEach(function(slack) {
                if(slack.token !== self.token) {
                    slack.reqAPI('chat.postMessage', message);
                }
            })
        }
    });

    slack[i].on('file_shared', function(data) {
        var self = this;
        var teamName = self.slackData.team.name;
        var channel = self.getChannel(data.file.channels.splice(-1)[0]); // https://api.slack.com/types/file
        var user = self.getUser(data.file.user);
        if(channel.name !== slackslime.channelName) return;

        if(user) {
            data.iconUrl = user.profile.image_48;
            data.username = user.name;
        }

        var message = {
            channel: '#' + slackslime.channelName,
            text: '*' + data.file.title + '* ' + data.file.url,
            username: data.username + ' @ ' + teamName,
            icon_url: data.iconUrl,
            unfurl_links: true,
            unfurl_media: true
        };

        slack.forEach(function(slack) {
            if(slack.token !== self.token) {
                slack.reqAPI('chat.postMessage', message);
            }
        })
    });
});
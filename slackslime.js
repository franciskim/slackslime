/*
 https://github.com/franciskim/slackslime
 by Francis Kim @ franciskim.co

 how to run from the shell:
 nodejs [channel name] [RTM API token 1] [RTM API token 2] [RTM API token 3] [more tokens]

 for example:
 nodejs devchat xoxb-1111111111-xxxxxxx xoxb-2222222222-xxxxxxx xoxb-3333333333-xxxxxxx

 or for PM2:
 pm2 start slackslime.js -- [channel name] [RTM API token 1] [RTM API token 2] [RTM API token 3] [more tokens]
 */

var slackAPI = require('slackbotapi');
var async    = require('async');

var slackslime = {
    channelName: process.argv[2],
    tokens:      process.argv.slice(3);
}; // config object

var slacks = slackslime.tokens.map(function(token) {

    var slack = new slackAPI({
        'token': token,
        'logging': false
    });

    slack.on('hello', function(data) {
        this.channelId = this.getChannel(slackslime.channelName).id;
    });

    slack.on('message', function(data) {

        var self = this;
        var teamName = self.slackData.team.name;
        var channel = self.getChannel(data.channel);
        var user = self.getUser(data.user);

        if(!data.text || data.subtype == 'bot_message' || !channel || channel.name !== slackslime.channelName) {
            return;
        }

        if(user) {
            data.iconUrl = user.profile.image_48;
            data.username = user.name;
        }

        if(data.text.charAt(0) === '!') {
            // Bot/Channel commands will go here
            // Split the command and its arguments into an array

            var command = data.text.substring(1).split(' ').filter(Boolean);

            if(!command.length) return;

            switch(command[0].toLowerCase()) {

                case "users": {

                    var users = {};

                    async.each(slacks, function(slack, done) {

                        users[slack.slackData.team.name] = [];

                        slack.reqAPI('channels.info', {
                            channel: slack.channeId
                        }, function(response) {

                            if(!response.ok) {
                                return;
                            }

                            users[slack.slackData.team.name] = response.channel.members.map(function(member) {
                                return slack.getUser(member);
                            });

                            done();

                        });

                    }, function() {

                        var message = [];

                        for(var team in users) {
                            for(var i = 0; i < users[team].length; i++) {
                                message.push('`' + team + '` ' + users[team][i].name);
                            }
                        }

                        this.sendPM(data.user, message.join('\n'));

                    }.bind(this));

                }

            }

        } else if(!data.subtype) {

            // normal user message
            var message = {
                channel: '#' + slackslime.channelName,
                text: data.text,
                username: data.username + ' @ ' + teamName,
                icon_url: data.iconUrl,
                unfurl_links: true,
                unfurl_media: true
            };

            for(var i = 0; i < slacks.length; i++) {
                if(slacks[i].token === this.token) continue;
                slacks[i].reqAPI('chat.postMessage', message);
            }

        }
    });

    slack.on('file_shared', function(data) {
        var teamName = this.slackData.team.name;
        var channel = this.getChannel(data.file.channels.splice(-1)[0]); // https://api.slack.com/types/file
        var user = this.getUser(data.file.user);

        if(channel.name !== slackslime.channelName) {
            return;
        }

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

        for(var i = 0; i < slacks.length; i++) {
            if(slacks[i].token === this.token) continue;
            slacks[i].reqAPI('chat.postMessage', message);
        }

    });

    return slack;

});
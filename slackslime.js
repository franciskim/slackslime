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

var slackslime = {
    channelName: process.argv[2],
    tokens: process.argv.slice(3),
    connectedTeams: 0
};

var slacks = new Array(); // slack connections get stored here

slackslime.tokens.forEach(function(token, i) {
    slacks[i] = new slackAPI({
        'token': token,
        'logging': true, // necessary for debug output
        'autoReconnect': true
    });

    slacks[i].on('hello', function(data) {
        this.channelId = this.getChannel(slackslime.channelName).id;
        slackslime.connectedTeams++;
    });

    slacks[i].on('close', function(data) {
        slackslime.connectedTeams--;
    });

    slacks[i].on('message', function(data) {
        var self = this;
        var user = self.getUser(data.user);
        var teamName = self.slackData.team.name;
        var channel = self.getChannel(data.channel);
        
        if(typeof data.text === 'undefined' || data.subtype === 'bot_message' || !channel || channel.name !== slackslime.channelName) {
            return;
        }
        
        if(user) {
            data.username = user.name;
            data.iconUrl = user.profile.image_48;
        }

        if(data.text.charAt(0) === '!') {
            // bot/channel commands should go here
            // split the command and its arguments into an array
            var command = data.text.substring(1).split(' ');
            
            switch(command[0].toLowerCase()) {
                case "list":
                    // send a list of all users on every chat and send via DM/PM
                    var message = '', awayCount = 0, activeCount = 0, userCount = 0;
                    
                    slacks.forEach(function(s) {
                        s.reqAPI('channels.info', {channel: s.channelId}, function(d) {
                            if(d.ok) {
                                d.channel.members.forEach(function(user) {
                                    if(s.getUser(user)) {
                                        var status = ':question:';
                                        userCount++;
                                        
                                        if(s.getUser(user).presence === 'active') {
                                            status = ':large_blue_circle:';
                                            activeCount++;
                                        }
                                        
                                        if(s.getUser(user).presence === 'away') {
                                            status = ':white_circle:';
                                            awayCount++;
                                        }
                                        
                                        message += status + ' `' + s.slackData.team.name + '` ' + s.getUser(user).name + '\n';
                                    }
                                })
                            }
                        });
                    });
                    
                    self.sendPM(data.user,
                        '```Gathering a list of users, please wait...\nBlue = Active   White = Away```'
                    );
                    
                    setTimeout(function() {
                        self.sendPM(data.user,
                            message + '```Active: ' + activeCount + '   Total: ' + userCount + '   Teams: '
                            + slackslime.connectedTeams + '```'
                        );
                    }, 2000); // 2 second default wait
                    break;
            }
        }

        else if(!data.subtype) {
            // this is a normal user message, send to other teams
            var message = {
                channel: '#' + slackslime.channelName,
                text: data.text,
                username: data.username + ' @ ' + teamName,
                icon_url: data.iconUrl,
                unfurl_links: true,
                unfurl_media: true
            };
            
            slacks.forEach(function(slack) {
                if(slack.token !== self.token) {
                    slack.reqAPI('chat.postMessage', message);
                }
            })
        }
    });

    slacks[i].on('file_shared', function(data) {
        // send the shared file to other teams
        // shared files in public channels already have a public URL (!)
        // todo: ask if the file should be shared
        var self = this;
        var user = self.getUser(data.file.user);
        var teamName = self.slackData.team.name;
        var channel = self.getChannel(data.file.channels.splice(-1)[0]); // https://api.slack.com/types/file
        
        if(channel.name !== slackslime.channelName) {
            return;
        }

        if(user) {
            data.username = user.name;
            data.iconUrl = user.profile.image_48;
        }

        var message = {
            channel: '#' + slackslime.channelName,
            text: '*' + data.file.title + '* ' + data.file.url,
            username: data.username + ' @ ' + teamName,
            icon_url: data.iconUrl,
            unfurl_links: true,
            unfurl_media: true
        };

        slacks.forEach(function(slack) {
            if(slack.token !== self.token) {
                slack.reqAPI('chat.postMessage', message);
            }
        })
    });
});

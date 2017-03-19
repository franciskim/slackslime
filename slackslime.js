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
var tmp = require('tmp');
var fs = require('fs');
var request = require('request');

// create temporary directory for file uploads (obv. this is insecure, so please don't share sensitive info)
var tmpobj = tmp.dirSync({ prefix: 'slackslime_' });

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


        // handle file_share message subtypes instead of file_shared events because Slack's API doesn't seem to send much info with file_shared anymore.
        if(data.subtype === 'file_share') {
            onFileShare(this, data);
            return;
        }

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

    var downloadSlackFile = function(options, callback) {
        var stream = request({
            url: options.url,
            headers: {
              'Authorization': 'Bearer ' + options.token
            }
        }).pipe(fs.createWriteStream(options.directory + options.filename));
        stream.on('finish', callback);
    }

    var uploadSlackFile = function(upload_options, callback) {
        // this method is here because slackbotapi library can't seem to handle file uploads
        request.post({
            url: 'https://slack.com/api/files.upload',
            formData: upload_options,
        }, function (err, response) {
            callback(err, response);
        });
    }


    var onFileShare = function(self, data) {
        // send the shared file to other teams
        // shared files in public channels already have a public URL (!)
        // todo: ask if the file should be shared
        var user = self.getUser(data.file.user);
        var teamName = self.slackData.team.name;
        var channel = self.getChannel(data.file.channels.splice(-1)[0]); // https://api.slack.com/types/file
        
        if(channel.name !== slackslime.channelName) {
            return;
        }

        if(user.is_bot) {
            return; //otherwise we risk an infinite loop
        }

        if(user) { // unfortunately image uploads don't support as-user avatar changes
            data.username = user.name;
            data.iconUrl = user.profile.image_48;
        }

        var download_options = {
            url: data.file.url_private,
            directory: tmpobj.name,
            filename: data.file.name,
            token: self.token
        };



        var downloaded_file_path = downloadSlackFile(download_options, function() {

            var initial_comment = "From " + data.username + ' @ ' +  teamName;
            if(data.file.comments_count > 0) {
              initial_comment += ":\n \"" + data.file.initial_comment.comment + "\"";
            }

            var upload_options = {
                channels: "#" + slackslime.channelName,
                filename: data.file.name,
                title: data.username + ' @ ' + teamName + " posted: " + data.file.name,
                filetype: "auto",
                initial_comment: initial_comment,
                file: fs.createReadStream(download_options.directory + download_options.filename)
            };


            slacks.forEach(function(slack) {
                if(slack.token !== self.token) { // so we don't send it to ourselves

                    var this_upload_options = upload_options;
                    this_upload_options['token'] = slack.token;

                    uploadSlackFile(this_upload_options, function(err, response) {
                    });
                }
            })

        });

    }
});

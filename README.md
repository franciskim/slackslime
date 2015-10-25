Slack Slime
===========

[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/franciskim/slackslime/blob/master/LICENSE) [![Current Version](https://img.shields.io/npm/v/slackslime.svg?style=flat-square)](https://npmjs.com/slackslime)

cross-team/organisation communication on Slack

![Slack Slime](slackslime.png)

# what it does
it allows your channel to talk to multiple external Slack teams/organizations

![Screenshot](screenshot.png)

# how to run
- *Slack Slime runs from the command line, not via module.exports*
- 2+ Slack teams & their RTM API tokens - get your token at https://my.slack.com/services/new/bot
- `npm install slackslime`
- `nodejs [channel name] [RTM API token 1] [RTM API token 2] [RTM API token 3] [more tokens]`
- eg: `nodejs devchat xoxb-1111111111-xxx xoxb-2222222222-xxx xoxb-3333333333-xxx`
- or with `PM2: pm2 start slackslime.js -- devchat xoxb-1111111111-xxx xoxb-2222222222-xxx xoxb-3333333333-xxx`

# to-do
- @mentions formatting

# license
this project is licensed under the terms of the [MIT license](LICENSE).

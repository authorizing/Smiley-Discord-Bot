const { channel } = require("diagnostics_channel");
const Discord = require("discord.js");
const Events = require('events');
const { cp } = require("fs");
const Path = require('path');

const authorImageURL = 'https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/avatars/47/47267d23ae47e5861cb2d8efc261aca32765a273_full.jpg';

module.exports = function(Config) {
    this.client = new Discord.Client();
    this.events = new Events.EventEmitter();

    this.login = () => {
        const _this = this;
        _this.client.login(Config.Discord.botToken);
    };

    this.client.on('error', (err) => {
        const _this = this;
        _this.events.emit('error', 'error_event', err);
    });

    this.client.on('ready', () => {
        const _this = this;
        _this.events.emit('ready');
    });

    this.client.on('message', (message) => {
        const _this = this;

        if (!Config.Discord.allowBotCommands && message.author.bot) return;
        if (message.content.indexOf(Config.Discord.botCommandPrefix) !== 0) return;

        const channelType = message.channel.type;
        const channelName = message.channel.name;
        const channelID = message.channel.id;

        const inputChannel = Config.Discord.botChannelInput;
        if (channelType != 'text' || !channelName || (!Array.isArray(inputChannel) && channelID != inputChannel) || (Array.isArray(inputChannel) && !inputChannel.includes(channelID))) return;

        if (!Config.Discord.accessRole || message.member.roles.cache.some(role => role.name === Config.Discord.accessRole)) {
            const arguments = message.content.slice(Config.Discord.botCommandPrefix.length).trim().split(/ +/g);
            const command = arguments.shift().toLowerCase();
            const addCommand = Config.Discord.botCommand ? Config.Discord.botCommand : 'add';
            const helpCommand = Config.Discord.botCommand ? Config.Discord.botCommand : 'help';

            if (command === addCommand) {
                const argument = arguments.join(' ');
                _this.events.emit('add', argument, message);
            }

            if (command === helpCommand) {
                message.channel.send(this.createHelpMessage())
            }

            if (command === 'stats') {
                _this.events.emit('stats', message);
            }
        } else {
            message.channel.send(this.CreateNoPermissionMessage())
        }
    });

    this.CreateNoPermissionMessage = () => {
        const exampleEmbed = new Discord.MessageEmbed()
            .setColor('#464646')
            .setTitle('Smiley No Permissions')
            .setURL('https://kyare.xyz/')
            .setAuthor('Smiley', 'https://i.imgur.com/3LT68jB.png', 'https://kyare.xyz/')
            .setThumbnail('https://i.imgur.com/3LT68jB.png')
            .addFields({ name: 'You have no permission to execute this command.', value: 'NA' })

        .setTimestamp()
            .setFooter('kyare.xyz | Bot developed by kyare', 'https://i.imgur.com/3LT68jB.png');

        return exampleEmbed;
    }

    this.createHelpMessage = () => {
        const exampleEmbed = new Discord.MessageEmbed()
            .setColor('#464646')
            .setTitle('Smiley Commands')
            .setURL('https://kyare.xyz/')
            .setAuthor('Smiley', 'https://i.imgur.com/3LT68jB.png', 'https://kyare.xyz/')
            .setThumbnail('https://i.imgur.com/3LT68jB.png')
            .addFields({ name: 'Add a steam profile to notify a ban', value: '/add <steamID64 | profileURL>\n' }, { name: 'Mass report bot a steam profile', value: '/report <steamID64 | profileURL>\n' }, { name: 'Add a profile to our report bot whitelist', value: '/whitelist <steamID64 | profileURL>\n' })

        .setTimestamp()
            .setFooter('kyare.xyz | Bot developed by kyare', 'https://i.imgur.com/3LT68jB.png');

        return exampleEmbed;
    }

    this.createBanMessage = (messageTitle, profileField, userField, dateField, imagePath) => {
        var messageEmbed = new Discord.MessageEmbed()
            .setColor('#ff0000')
            .setTitle(messageTitle)
            .addFields(profileField, userField, dateField)
            .setTimestamp()
            .setFooter('kyare.xyz | Ban Checker', authorImageURL);

        if (imagePath) {
            messageEmbed.attachFiles([imagePath]);
            messageEmbed.setImage('attachment://' + Path.parse(imagePath).base);
        }

        return messageEmbed;
    };

    this.createStatsMessage = (messageTitle, totalProfilesField, bannedProfilesField, percentageField, totalProfilesUserField, bannedProfilesUserField, percentageUserField) => {
        return new Discord.MessageEmbed()
            .setTitle(messageTitle)
            .addFields(totalProfilesField, bannedProfilesField, percentageField, { name: '\u200B', value: '\u200B' }, totalProfilesUserField, bannedProfilesUserField, percentageUserField)
            .setTimestamp()
            .setFooter('kyare.xyz | Ban Checker', authorImageURL);
    };

    this.sendReply = (message, messageText) => {
        message.reply(messageText);
    };

    this.sendMessage = (messageText) => {
        const _this = this;
        const targetChannel = (Config.Discord.botChannelOutput ? Config.Discord.botChannelOutput : Config.Discord.botChannelInput);

        if (Array.isArray(targetChannel)) {
            targetChannel.forEach((channel) => {
                _this.client.channels.cache.get(channel).send(messageText).catch((err) => _this.events.emit('error', 'sendMessage', err));
            });
        } else {
            _this.client.channels.cache.get(targetChannel).send(messageText).catch((err) => _this.events.emit('error', 'sendMessage', err));
        }
    };
}
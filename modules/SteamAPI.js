const Request = require('request');

const EventEmitter = require('events');
class SteamAPI extends EventEmitter {
    constructor(Config, Database) {
        super();

        this.apiKey = Config.Steam.apiKey;
        this.apiURL = `http://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${this.apiKey}&steamids=`;
        this.profileURL = 'https://steamcommunity.com/profiles/';

        this.profiles = Database.db;

        this.rateLimited = false;
    }

    queryProfile(profile, message) {
        const _this = this;

        const apiURL = _this.apiURL + profile;
        Request(apiURL, (err, response, body) => {
            if (err) {
                _this.emit('error', 'queryProfile', err);
            }

            if (response && response.statusCode && response.statusCode === 200) {
                const apiData = JSON.parse(body);
                if (apiData.players && apiData.players.length > 0 && apiData.players[0].SteamId) {
                    const player = apiData.players[0];
                    const playerData = { SteamID: player.SteamId, CommunityBanned: player.CommunityBanned, VACBanned: player.VACBanned, NumberOfVACBans: player.NumberOfVACBans, NumberOfGameBans: player.NumberOfGameBans, Tracked: true, User: message.author.id, Date: Date.now() };
                    _this.emit('playerdata', playerData, message);
                } else {
                    _this.emit('error', 'queryProfile', 'INVALID RESPONSE');
                }
            } else {
                _this.emit('error', 'queryProfile', 'NO RESPONSE');
            }
        });
    }

    queryProfileChunks(profiles) {
        const _this = this;

        if (_this.rateLimited) {
            _this.rateLimited = false;
            _this.emit('info', 'queryProfileChunks', 'SKIPPING A QUERY AFTER AN HTTP 500 RESPONSE');
            return;
        }

        const apiURL = _this.apiURL + profiles.join();
        Request(apiURL, (err, response, body) => {
            if (err) {
                _this.emit('error', 'queryProfileChunks', err);
            }

            if (response) {
                if (response.statusCode === 200) {
                    const apiData = JSON.parse(body);
                    if (apiData.players) {
                        apiData.players.forEach((player) => {
                            _this.profiles.findOne({ SteamID: player.SteamId }, (err, profile) => {
                                if (err) {
                                    _this.emit('error', 'queryProfileChunks', err);
                                }
    
                                if (profile == null) {
                                    _this.emit('error', 'queryProfileChunks', 'Unknown Profile');
                                }
    
                                if (player.CommunityBanned && !profile.CommunityBanned) {
                                    _this.emit('ban', 'community', player, profile.User, profile.Date);
                                }
    
                                if (player.VACBanned && !profile.VACBanned) {
                                    _this.emit('ban', 'vac', player, profile.User, profile.Date);
                                } else if (player.VACBanned && player.NumberOfVACBans > profile.NumberOfVACBans) {
                                    _this.emit('ban', 'vac_multiple', player, profile.User, profile.Date);
                                }
    
                                if (player.NumberOfGameBans > profile.NumberOfGameBans) {
                                    if (profile.NumberOfGameBans > 0) {
                                        _this.emit('ban', 'game_multiple', player, profile.User, profile.Date);
                                    } else {
                                        _this.emit('ban', 'game', player, profile.User, profile.Date);
                                    }
                                }
                            });
                        });
                    } else {
                        _this.emit('error', 'queryProfileChunks', 'Invalid Response');
                    }
                } else {
                    if (response.statusCode === 500) {
                        _this.rateLimited = true;
                    }
                    _this.emit('error', 'queryProfileChunks', `Invalid Status Code: ${response.statusCode}`);
                }
            } else {
                _this.emit('error', 'queryProfileChunks', 'No Response');
            }
        });
    }
}

module.exports = SteamAPI;
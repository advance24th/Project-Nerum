const fs = require('fs');
const { clone } = require('underscore');
const Bot = require('./bot');

class BotManager {
    constructor(cc) {
        var self = this;
        try {
            fs.mkdirSync('logs');
        } catch (e) { }
        this.bots = [];
        this.cc = cc;
        this.quota = 0;
        this.wanted_quota = 0;
        this.lastQuery = {};
        this.updateTimeout = setTimeout(this.update.bind(this), 1000);
        this.stopping = false;
    }
    update() {
        var self = this;
        Bot.currentlyStartingGames = 0;

        // Add new bots
        this.enforceQuota();

        for (var i = self.bots.length - 1; i >= 0; i--) {
            var b = self.bots[i];
            if (b.state == Bot.states.STARTING || b.state == Bot.states.WAITING)
                Bot.currentlyStartingGames++;
            if (i + 1 > this.quota && b.full_stop())
            {
                self.bots.splice(i, 1);
            }
            else
                b.update();
        }

        if (!this.stopping)
            self.cc.command('query', {}, function (data) {
                self.updateTimeout = setTimeout(self.update.bind(self), 1000);
                self.lastQuery = data;
                for (var q in data.result) {
                    for (var b of self.bots) {
                        if (b.startTime && b.startTime == data.result[q].starttime) {
                            b.emit('ipc-data', {
                                id: q,
                                data: data.result[q]
                            })
                        }
                    }
                }
            });
        else if (self.bots.length)
            self.updateTimeout = setTimeout(self.update.bind(self), 1000);
    }
    enforceQuota() {
        if (this.bots.length == this.quota)
            this.quota = this.wanted_quota;
        while (this.bots.length < this.quota) {
            this.bots.push(new Bot.bot(this.bots.length));
        }
    }
    bot(name) {
        for (var bot of this.bots) {
            if (bot.name == name) return bot;
        }
        return null;
    }
    setQuota(quota) {
        quota = parseInt(quota);
        if (!isFinite(quota) || isNaN(quota)) {
            return;
        }
        this.wanted_quota = quota;
        this.enforceQuota();
    }
    getJSONStatus() {
        var result = {};
        return result;
    }
    stop() {
        this.setQuota(0);
        this.stopping = true;
    }
}

module.exports = BotManager;

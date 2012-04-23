/*jslint vars: true */
/*global jQuery, io */
var Tiddlers = (function($) {

    "use strict";

    var Tiddlers = function(el, socketuri, sourceuri, updater, options) {
        this.el = el;
        this.source = sourceuri;
        this.sourceEnding = '%20_limit:100;sort=modified';
        this.updater = updater;
        if (options.sizer.toExponential) {
            this.sizer = function () {
                return options.sizer;
            };
        } else if (options.sizer) {
            this.sizer = options.sizer;
        } else {
            this.sizer = function() {
                return 50; // if no sizer, so show 50 things
            };
        }
        if (typeof(io) !== 'undefined') {
            this.socket = io.connect(socketuri,
                    {'force new connection': true});
            var self = this;
            this.socket.on('connect', function() {
                $.each(self.updater, function(index, sub) {
                    self.socket.emit('unsubscribe', sub);
                    self.socket.emit('subscribe', sub);
                });
                self.socket.on('tiddler', function(data) {
                    self.getTiddler(data);
                });
            });
        }
        // set up infinite scroll
        this.scrollLoading = false; // loading the next result set

        // cache as binding to scroll is expensive
        this.height = this.el.height();

        el.bind('scroll', this.infiniteScroll.bind(this));
    };

    $.extend(Tiddlers.prototype, {
        queue: [],

        start: function() {
            var self = this;
            $.ajax({
                dataType: 'json',
                url: this.source + this.sourceEnding,
                success: function(tiddlers) {
                    $.each(tiddlers, function(index, tiddler) {
                        self.push(tiddler);
                    });
                    self.oldestDate = tiddlers[0].modified;
                }
            });
        },

        push: function(tiddler) {
            this.queue.push(tiddler);
            var li = this.createTiddlerEl();
            this.el.trigger('tiddlersUpdate');
            this.el.prepend(li);
        },

        createTiddlerEl: function(tid) {
            var tiddler = tid || this.queue.shift(),
                href = tiddler.uri,
                tiddlerDate = dateString(tiddler.modified);

            var link = $('<a>').attr({'href': href,
                target: '_blank'}).text(tiddler.title);

            var abbr = $('<abbr>').attr({'class': 'timeago',
                title: tiddlerDate}).text(tiddlerDate);
            // set timeago explicitly as it is not "live" ready
            abbr.timeago();

            var modurl = urlFromUser(tiddler.modifier);
            var modlink = $('<a>').attr({'href': modurl, target: '_blank'});
            var modIcon = $('<img>').attr({'class': 'modicon',
                src: modurl + '/SiteIcon',
                alt: tiddler.modifier});
            modlink.append(modIcon);

            var spaceurl = urlFromBag(tiddler.bag);
            var spacelink = $('<a>').attr({'href': spaceurl,
                target: '_blank'});
            var spaceIcon = $('<img>').attr({'class': 'spaceicon',
                src: spaceurl + '/SiteIcon',
                alt: tiddler.bag});
            spacelink.append(spaceIcon);

            return $('<li>')
                .append(link)
                .append(abbr)
                .prepend(spacelink)
                .prepend(modlink);
        },

        getTiddler: function(uri) {
            var self = this;
            $.ajax({
                dataType: 'json',
                url: uri,
                success: function(tiddler) {
                    self.push(tiddler);
                }
            });
        },

        infiniteScroll: function(ev) {
            if (!this.scrollLoading) {
                var currentPosition = this.height + $(ev.target).scrollTop(),
                    bottomPosition = this.el[0].scrollHeight - 100,
                    nearBottom = currentPosition >= bottomPosition;
                if (nearBottom) {
                    this.scrollLoading = true;
                    this.loadOldTiddlers();
                }
            }
        },

        loadOldTiddlers: function() {
            var self = this;
            $.ajax({
                dataType: 'json',
                url: this.source + '%20_limit:1000;select=modified:<' + this.oldestDate +
                    ';sort=-modified;limit=30',
                success: function(tiddlers) {
                    if (tiddlers.length) {
                        $.each(tiddlers, function(i, tiddler) {
                            var li = self.createTiddlerEl(tiddler);
                            self.el.trigger('tiddlersUpdate');
                            self.el.append(li);
                        });
                        self.oldestDate = tiddlers[tiddlers.length-1].modified;
                    }
                    self.scrollLoading = false;
                }
            });
        }

    });

    function urlFromBag(bag) {
        var index = bag.indexOf('_public');
        var space = '';
        if (index >= 0) {
            space = bag.substr(0, index) + '.';
        }
        // XXX: hostname!
        return 'http://' + space + 'tiddlyspace.com';
    }

    function urlFromUser(username) {
        return 'http://' + username + '.tiddlyspace.com';
    }

    function dateString(date) {
        return new Date(Date.UTC(
            parseInt(date.substr(0, 4), 10),
            parseInt(date.substr(4, 2), 10) - 1,
            parseInt(date.substr(6, 2), 10),
            parseInt(date.substr(8, 2), 10),
            parseInt(date.substr(10, 2), 10),
            parseInt(date.substr(12, 2) || "0", 10),
            parseInt(date.substr(14, 3) || "0", 10)
            )).toISOString();
    }

    return Tiddlers;

}(jQuery));

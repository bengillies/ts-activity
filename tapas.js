function NewPane(sub, socketuri, dontcache) {
	var type = sub.charAt(0),
		uri = '/search?q=',
		cached = localStorage.getItem('tapas'),
		socket, title, el;
	cached = (cached && cached.split(',')) || [];
	cached.push(sub);
	if (!dontcache) {
		localStorage.setItem('tapas', cached.join(','));
	}
	subscription = sub.slice(1);

	switch(type) {
	case '@':
		title = 'space: ' + subscription;
		socket = 'bag/' + subscription + '_public';
		uri += 'bag:' + subscription + '_public';
		break;
	case '+':
		title = 'user: ' + subscription;
		socket = 'modifier/' + subscription;
		uri += 'modifier:' + subscription;
		break;
	case '#':
		title = 'tag: ' + subscription;
		socket = 'tags/' + subscription;
		uri += 'tag:' + subscription;
		break;
	default:
		throw new TypeError('Incorrect Subscription Type');
	}

	el = $('<div class="box"/>').append($('<button class="close"/>')
			.html('&#215;').click(function(ev) {
				ev.preventDefault();
				removePane(el);
			}))
		.append($('<h1 class="extra"/>')
			.attr('title', title).text(title))
		.append('<ul class="tiddlers"/>').insertBefore('#sizer');

	new Tiddlers(el.find('ul'), socketuri, uri, [socket], { sizer: function() {
		return 20;
	}}).start();

	function removePane(el) {
		var panes = localStorage.getItem('tapas').split(','),
			index = panes.indexOf(sub);
		$(el).remove();
		if (~index) {
			panes.splice(index, 1);
			localStorage.setItem('tapas', panes.join(','));
		}
	}
}

$(function() {
	var windowActive = true;
	var socketuri = 'http://tiddlyspace.com:8081';

	$(window).focus(function() {
		$('title').text('tapas');
		windowActive = true;
	});
	$(window).blur(function() { windowActive = false; });
	$(document).bind('tiddlersUpdate', function() {
		if (!windowActive) {
			var count = parseInt($('title').text().replace(/\s*tapas$/, '')
				|| "0", 10);
			$('title').text(++count + ' tapas');
		}
	});


	$.ajaxSetup({
		beforeSend: function(xhr) {
			xhr.setRequestHeader("X-ControlView", "false");
		}
	});

	var calculateSize = function() {
		return 20;
		var empx = $('#sizer').width();
		var height = $(window).height();
		var limit = Math.floor(height/(empx * 7) - 1);
		return limit;
	};

	var getFriends = function(user) {
		$.ajax({
			dataType: 'json',
			url: '/search?q=modifier:' + user +
			 '%20tag:follow%20_limit:100',
			success: function(tiddlers) {
				var friends = [];
				$.each(tiddlers, function(index, tiddler) {
					friends.push(tiddler.title.replace(/^@/, ''));
				});
				friendSearchUrl(friends);
				bagSearchUrl(friends);
			}
		});
	};

	var friendSearchUrl = function(friends) {
		var search = friends.join('%20OR%20modifier:');
		var url = '/search?q=modifier:' + search;
		friendSearchSubs(friends, url);
	};

	var friendSearchSubs = function(friends, searchUrl) {
		var subs = [];
		$.each(friends, function(index, friend) {
			subs.push('modifier/' + friend);
		});
		var fbox = new Tiddlers($('#fbox'),
			socketuri,
			searchUrl,
			subs,
			{sizer: calculateSize});
		fbox.start();
	};

	var bagSearchUrl = function(friends) {
		var bags = $.map(friends, function(friend) {
			return friend + '_public';
		});
		var search = bags.join('%20OR%20bag:');
		var url = '/search?q=bag:' + search;
		bagSearchSubs(bags, url);
	};

	var bagSearchSubs = function(bags, searchUrl) {
		var subs = [];
		$.each(bags, function(index, bag) {
			subs.push('bag/' + bag);
		});
		var bbox = new Tiddlers($('#bbox'),
			socketuri,
			searchUrl,
			subs,
			{sizer: calculateSize});
		bbox.start();
	};

	var fboxSetup = function(user) {
		getFriends(user);
	};

	// meat goes here
	var init = function(status) {
		if (typeof(io) === 'undefined') {
			$('#message')
				.text('Unable to access socket server, functionality limited');
		}
		var username = status.space.name;
		var upbox = new Tiddlers($('#upbox'),
				socketuri,
				'/search?q=',
				['*'],
				{sizer: calculateSize});
		upbox.start();
		if (username !== 'GUEST') {
			var atbox = new Tiddlers($('#atbox'),
					socketuri,
					'/search?q=tag:@' + username,
					['tags/@' + username],
					{sizer: calculateSize});
			atbox.start();
			fboxSetup(username);
		}

		// load up saved panes
		for (var i = 0, l = localStorage.length; i < l; i++) {
			var key = localStorage.key(i);
			if (key === 'tapas') {
				var panes = localStorage.getItem(key).split(',');
				panes.forEach(function(pane) { NewPane(pane, socketuri, true); });
			}
		}
	};

	var addPane = function(ev) {
		ev.preventDefault();
		var $el = $('#newsub'),
			sub = $el.val();
		$el.val('');
		NewPane(sub, socketuri);
		window.scrollTo(window.innerWidth, 0);
	};

	$('#addsub').click(addPane);
	$('#newsub').keypress(function(ev) {
		if (ev.keyCode === 13) { addPane(ev); }
	}).focus(function(ev) {
		if (this.value === '#tag, +modifier or @space') {
			this.value = '';
		}
	}).blur(function(ev) {
		if (this.value === '') {
			this.value = '#tag, +modifier or @space';
		}
	});

	//init
	$.ajax({
		url: "/status",
		dataType: "json",
		success: function(data) {
			init(data);
		},
		error: function(xhr, status, error) {
			$('#message').text('Unable to determine username');
		}
	});

});

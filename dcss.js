if (!Array.prototype.last) {
	Array.prototype.last = function() {
		return this[this.length - 1];
	};
};

if (!Array.prototype.includes) {
	Array.prototype.includes = function(searchElement /*, fromIndex*/ ) {
		'use strict';
		var O = Object(this);
		var len = parseInt(O.length) || 0;
		if (len === 0) {
			return false;
		}
		var n = parseInt(arguments[1]) || 0;
		var k;
		if (n >= 0) {
			k = n;
		} else {
			k = len + n;
			if (k < 0) {
				k = 0;
			}
		}
		var currentElement;
		while (k < len) {
			currentElement = O[k];
			if (searchElement === currentElement ||
				(searchElement !== searchElement && currentElement !== currentElement)) {
				return true;
			}
			k++;
		}
		return false;
	};
}

if (!('contains' in String.prototype)) {
	String.prototype.contains = function(str, startIndex) {
		return ''.indexOf.call(this, str, startIndex) !== -1;
	};
}

Object.defineProperty(Array.prototype, "stackoverflow_remove", {
	// Specify "enumerable" as "false" to prevent function enumeration
	enumerable: false,

	/**
	 * Removes all occurence of specified item from array
	 * @this Array
	 * @param itemToRemove Item to remove from array
	 * @returns {Number} Count of removed items
	 */
	value: function(itemToRemove) {
		// Count of removed items
		var removeCounter = 0;

		// Iterate every array item
		for (var index = 0; index < this.length; index++) {
			// If current array item equals itemToRemove then
			if (this[index] === itemToRemove) {
				// Remove array item at current index
				this.splice(index, 1);

				// Increment count of removed items
				removeCounter++;

				// Decrement index to iterate current position 
				// one more time, because we just removed item 
				// that occupies it, and next item took it place
				index--;
			}
		}

		// Return count of removed items
		return removeCounter;
	}
});

var net = require('net');
var HashMap = require('hashmap');
var lowdb = require('lowdb')
var queue = require('queue');
var os = require('os');

var interfaces = os.networkInterfaces();
var addresses = [];
for (var k in interfaces) {
	for (var k2 in interfaces[k]) {
		var address = interfaces[k][k2];
		if (address.family === 'IPv4' && !address.internal) {
			addresses.push(address.address);
		}
	}
}

var tthQueryQueue = queue({
	'concurrency': 1
});

var db = lowdb('db.json')

var nickToIP = new Object();

var tthNew = [];
var tthOngoing = [];
var tthResolved = new Object();

var first = 0;
var hubIP = '10.3.14.10';
var hubPort = 500;
var myIP = addresses[0];
var nickname = 'johndoe';
var search_timeout = 5000;

var client = net.connect({
	host: hubIP,
	port: hubPort
}, function() {
	console.log('Connected to server.');
	setTimeout(function() {
		client.write('$Supports UserCommand UserIP2|$Key 011010110110010101111001|$ValidateNick ' + nickname + '|$Version 1,0091|$GetNickList|$MyINFO $ALL ' + nickname + ' <++ V:0.673,M:A,H:1/0/0,S:3>$ $LAN(T3)0x31$example@example.com$26843545600$|');
	}, 1000);
	setInterval(function() {
		if (0 == tthNew.length) {
			return;
		}
		// console.log(tthNew);
		var searchTerm = tthNew.pop();
		tthOngoing.push(searchTerm);
		client.write('$Search Hub:' + nickname + ' F?T?0?9?TTH:' + searchTerm + '|');
	}, search_timeout);
});

client.on('data', function(data) {
	data = data.toString().split('|');
	// console.log(data);
	data.forEach(function(element, index, array) {
		// console.log('e ' + element);
		var tokens = element.split(' ');
		switch (tokens[0]) {
			case '$Search':
				// console.log('s ' + tokens);
				var time = new Date().getTime();
				if (tokens[1].contains('Hub:')) {
					var nick = tokens[1].slice(4);
					if (nickname == nick) {
						break;
					}
					if (nickToIP.hasOwnProperty(nick)) {
						var ip = nickToIP[nick];
					} else {
						var ip = '';
					}
				} else {
					var nick = '';
					var ip = tokens[1].split(':')[0];
				}
				var isTTH = ('9' == tokens[2].charAt(6));
				if (isTTH) {
					var term = tokens[2].split('TTH:').last();
					if ((!tthNew.includes(term)) && (!tthOngoing.includes(term)) && (!tthResolved.hasOwnProperty(term))) {
						// tthQueryQueue.start();
						// console.log(db('searches').chain().where({
						// 	'nick': '',
						// 	'isTTH': false
						// }).take(5).value());
						tthNew.push(term);
					}
				} else {
					var term = tokens[2].split('?').last().split('$').join(' ');
				}
				console.log(isTTH?(tthResolved.hasOwnProperty[term]?tthResolved[term]:term):term);
				console.log(time + ' ' + nick + '\t\t\t' + resolveHostel(ip) + ' ' + isTTH + ' ' + term);
				db('searches').push({
					'time': time,
					'nick': nick,
					'ip': ip,
					'isTTH': isTTH,
					'term': term
				});
				break;
			case '$MyINFO':
				// console.log('i ' + tokens);
				var nick = element.split(' ')[2];
				client.write('$ConnectToMe ' + nick + ' ' + myIP + ':55555|');
				break;
			case '$SR':
				// console.log('sr ' + tokens);
				if ((tokens.length < 5) || (!tokens.last().contains('(' + hubIP + ':' + hubPort + ')'))) {
					break;
				}
				var filename = tokens.slice(2, -2).join(' ').split('\\').last();
				var tth = tokens.slice(1, -1).last().split('TTH:').last();
				tthOngoing.stackoverflow_remove(tth);
				if (!tthResolved.hasOwnProperty(tth)) {
					tthResolved[tth] = filename;
					db('tthmap').push({
						'tth': tth,
						'filename': filename
					});
					console.log('got new sr' + tth + filename);
				}
				break;
			default:
				// console.log('o ' + tokens);
				break;
		}
	});
});

var server = net.createServer(function(c) {
	c.on('data', function(data) {
		var nick = data.toString().split('|')[0].split(' ')[1];
		var ip = c.remoteAddress.split(':').last();
		if (nickToIP.hasOwnProperty(nick) && (nickToIP[nick] != ip)) {
			console.log(nick + ' changed ip?');
			nickToIP[nick] = ip;
			// update db
			// db('nicks').push({'nick': nick, 'ip': ip});
		} else {
			nickToIP[nick] = ip;
			db('nicks').push({
				'nick': nick,
				'ip': ip
			});
		}
		// console.log(nick + ' - ' + ip + ' ' + resolveHostel(ip));
		// console.log(db('searches').chain().where({
		// 	'nick': nick
		// }).value());
		// console.log(db('searches').chain().updateWhere({
		// 	'nick': nick
		// }, ).value());
		c.end();
	});
	c.on('error', function(e) {
		console.log('NRSC roblem with request: ' + e.message);
	});

});

server.listen(55555, function() {
	console.log('Nick resolve server bound.');
});

server.on('error', function(e) {
	console.log('NRS Problem with request: ' + e.message);
});

client.on('end', function() {
	console.log('Disconnected from server.');
	server.close();
});

function resolveHostel(ip) {
	ip = ip.split('.');
	if (4 != ip.length) {
		return 'err len' + ip;
	}
	switch (ip[1]) {
		case '1':
			return 'CC';
		case '2':
			return 'LABS';
		case '3':
			switch (ip[2]) {
				case '1':
					return 'AH1';
				case '2':
					return 'TBI';
				case '3':
					return 'AH2';
				case '4':
					return 'VGH';
				case '6':
					return 'AH3';
				case '8':
					return 'AH4';
				case '9':
					return 'AH5';
				case '11':
					return 'AH6';
				case '12':
					return 'AH7';
				case '14':
					return 'AH8';
				default:
					return 'err' + ip;
			}
		case '4':
			switch (ip[2]) {
				case '1':
					return 'CH1';
				case '2':
					return 'CH1';
				case '3':
					return 'CH2';
				case '5':
					return 'CH3';
				case '9':
					return 'CH5';
				case '12':
					return 'CH4';
				case '14':
					return 'CH6+CH5';
				default:
					return 'err:' + ip;
			}
		case '20':
			return 'LIB';
		default:
			return 'err' + ip;
	}
}

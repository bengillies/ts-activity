.PHONY: upload

upload:
	tsupload tivity activity.html
	tsupload tivity-extra activity.{js,css} jquery.timeago.js tiddlersocket.js

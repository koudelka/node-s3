exports.extend = function(obj) {
    Array.prototype.slice.call(arguments, 1).forEach(function(source) {
    	for (var prop in source) {
			if (source[prop] !== void 0)
				obj[prop] = source[prop];
		}
	});
	return obj;
};


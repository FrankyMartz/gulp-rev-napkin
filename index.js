/*jslint node: true, unparam: true */
'use strict';
/*******************************************************************************
 * Delete Original files left from gulp-rev(-all).
 *
 * @author Franky Martinez <frankymartz@gmail.com>
 *
 * Gulp-rev-napkin Configuration Options
 * @typedef {Object} GulpRevNapkinOpts
 * @property {Boolean} [verbose=true] - Should Log Plugin Actions
 * @property {Boolean} [force=false] - Leave safety of CWD
 ******************************************************************************/
var fs = require('fs');
var path = require('path');
var through = require('through2');
var rimraf = require('rimraf');
var gUtil = require('gulp-util');

// CONSTANT
var PLUGIN_NAME = 'gulp-rev-clean';

// Simplify
var gHue = gUtil.colors;
var gPluginError = gUtil.PluginError.bind(null, PLUGIN_NAME);

/**
 * Simplified Logging with kill switch
 * @param {Boolean} isVerbose enable/disable log output
 */
function gLog(isVerbose) {
  if (isVerbose) {
		var args = Array.prototype.slice.call(arguments, 1);
	  gUtil.log.apply(null, args);
	}
}


/**
 * gulp-rev-napkin
 * @param {GulpRevNapkinOpts} [options] - configuration
 * @return - NodeJS Transform Stream
 */
function plugin(options){
	// Validate Input
	if (options) {
	  if (!(options instanceof Object)) {
			throw new gPluginError('<options> must be typeof "object"');
		}
		if (options.verbose && typeof options.verbose !== 'boolean') {
			throw new gPluginError('<options>.verbose must be typeof "boolean"');
		}
		if (options.force && typeof options.force !== 'boolean') {
			throw new gPluginError('<options>.force must be typeof "boolean"');
		}
	}

	// Defaults
	options = options || {};
	if (options.verbose === undefined || options.verbose === null) {
	  options.verbose = true;
	}
	options.verbose = options.verbose ? true : false;
	options.force = options.force ? true : false;

	var log = gLog.bind(null, options.verbose);

	// Napkin
	var stream = through.obj(function(file, enc, callback){
		this.push(file);

		if (file.isNull() || !file.revOrigPath) {
		  return callback();
		}

		function rimrafHandler(error){
			if (error) {
			  callback(new gPluginError(error));
				return;
			}
			log(gHue.red('DELETED:'), '"' + gHue.cyan(file.revOrigPath) + '"');
			callback();
		}

		function lstatHandler(error, stats){
			if (error) {
				callback(new gPluginError(error));
				return;
			}
			if (stats.isDirectory()) {
				callback(new gPluginError('Directory removal NOT supported "' + file.revOrigPath + '"'));
				return;
			}
			// For Safety: Resolve Paths
			var cwd = file.cwd || process.cwd();
			var filepath = path.resolve(cwd, file.revOrigPath);
			var relativeFromCwd = path.relative(cwd, filepath);
			// Restrict to CWD: unless specifed
			if (!options.force && relativeFromCwd.substr(0,2) === '..') {
				callback(new gPluginError('Delete outside of CWD NOT supported. To enable -> {force:true}: "' + file.revOrigPath + '"'));
			} else {
				rimraf(file.revOrigPath, rimrafHandler);
			}
		}

		fs.lstat(file.revOrigPath, lstatHandler);
	});

	return stream;
}

module.exports = plugin;

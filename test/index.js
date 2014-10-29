/*global describe, beforeEach, after, afterEach, it */
/*jslint stupid:true */
'use strict';
/*******************************************************************************
 * gulp-rev-napkin Unit Tests
 *
 * @author Franky Martinez <frankymartz@gmail.com>
 *
 * Reference [wearefractal/vinyl]{@link https://github.com/wearefractal/vinyl}
 * @typedef {Object} RevVinylMock
 * @property {String} cwd - Current Working Directory
 * @property {String} base - Base path for file
 * @property {String} path - Path to file relative to CWD
 * @property {String} contents - file contents
 * @property {String} revOrigPath - Path to original file which was rev()'d
 ******************************************************************************/

var path = require('path');
var fs = require('fs-extra');
var chai = require('chai');
var expect = chai.expect;
var revNapkin = require('../');
var gUtil = require('gulp-util');


// Chai Configuration
chai.config.includeStack = true; // turn on stack trace?


////////////////////////////////////////////////////////////////////////////////
// Constants
////////////////////////////////////////////////////////////////////////////////

var TEST_CWD = process.cwd();
var TEST_DIR = './foobar';
var TEST_FILE_CONTENTS = '[Mocha Test File]: Safe To Delete.';

var TEST_FILES_VALID = [
	{path:'style-61e0be79.css', revOrigPath:'style.css'},
	{path:'style-a42f5380.min.css', revOrigPath:'style.min.css'},
	// Different Name
	{path:'vendor-61e0be79.css', revOrigPath:'vendor.css'},
	{path:'vendor-a42f5380.min.css', revOrigPath:'vendor.min.css'},
	// Different File Ext
	{path:'vendor-61e0be79.js', revOrigPath:'vendor.js'},
	{path:'vendor-a42f5380.min.js', revOrigPath:'vendor.min.js'},
	// Nested
	{path:'fonts/fontstyle-61e0be79.js', revOrigPath:'fonts/fontstyle.css'},
	{path:'css/fonts/fontstyle-a42f5380.css', revOrigPath:'css/fonts/fontstyle.css'},
	{path:'css/fonts/fontstyle-1d87bebe.min.css', revOrigPath:'css/fonts/fontstyle.min.css'}
];

var TEST_FILES_FAIL = {
	// Non-Existing File
	noExist: {path:'style-61e0be79.css', revOrigPath:'style-does-not-exist.css'},
	// Out of Bounds
	outOfBound: {path:'TEST-out-of-bounds.h2131j4.css', revOrigPath:'TEST-out-of-bounds.css'},
	// Directories
	directory: {path:'fonts/fontstyle-61e0be79.js', revOrigPath:'fonts/'},
	// Broken Path
	brokenPath: {path:'css/fonts/fontstyle-1d87bebe.min.css', revOrigPath:'css/fonts/NOOP/fontstyle.min.css'}
};


////////////////////////////////////////////////////////////////////////////////
// Helper Functions
////////////////////////////////////////////////////////////////////////////////

/**
 * Convert Object for Vinyl Ready mock
 * @param {Object} obj - Object with <path>, <revOrigPath> keys
 * @param {String} cwd - Current Working Directory
 * @param {String} baseDir - Base path for file
 * @param {String} contents - File contents
 * @return {<RevVinylMock>} Object configured for Vinyl mocking
 */
function vinylFilePrimer(obj, cwd, baseDir, contents){
	obj.cwd = cwd;
	obj.base = path.resolve(baseDir);
	obj.path = path.resolve(obj.base, obj.path);
	obj.contents = contents;
	if (obj.revOrigPath) {
	  obj.revOrigPath = path.resolve(obj.base, obj.revOrigPath);
	}
  return obj;
}


/**
 * Convert Array of Objects for Vinyl ready mock
 * @param {Array.Object} list - Array.Object with <path>, <revOrigPath> keys
 * @param {String} cwd - Current Working Directory
 * @param {String} baseDir - Base path for file
 * @param {String} contents - File contents
 * @return {Array.<RevVinylMock>} Array.<RevVinylMock> configured for Vinyl mocking
 */
function vinylArrayPrimer(list, cwd, baseDir, contents){
  return list.map(function(asset){
	  return vinylFilePrimer(asset, cwd, baseDir, contents);
	});
}

/**
 * Convert Array of Objects or an Object for Vinyl ready mock
 * @param {(Array.Object|Object)} asset - Array.Object || Object with <path>, <revOrigPath> keys
 * @param {String} cwd - Current Working Directory
 * @param {String} baseDir - Base path for file
 * @param {String} contents - File contents
 * @return {(Array.<RevVinylMock>|<RevVinylMock>)} Array.<RevVinylMock> || <RevVinylMock> configured for Vinyl mocking
 */
function vinylPrimer(asset, cwd, baseDir, contents){
	if(Array.isArray(asset)) {
		return vinylArrayPrimer(asset, cwd, baseDir, contents);
	}
	return vinylFilePrimer(asset, cwd, baseDir, contents);
}

/**
 * Convert Object into Vinyl mock
 * @param {RevVinylMock} obj - Mock Object with Vinyl prerequisites
 * @return {Object} Vinyl Mock
 */
function mockVinylFile(obj){
	if (!obj.cwd || typeof obj.cwd !== 'string') {
		throw new Error('mockVinylFile: <obj>.cwd typeof (String) required');
	}
	if (!obj.base || typeof obj.base !== 'string') {
		throw new Error('mockVinylFile: <obj>.base typeof (String) required');
	}
	if (!obj.path || typeof obj.path !== 'string') {
		throw new Error('mockVinylFile: <obj>.path typeof (String) required');
	}
	if (obj.revOrigPath && typeof obj.revOrigPath !== 'string') {
		throw new Error('mockVinylFile: <obj>.revOrigPath requires typeof (String)');
	}
	obj.contents = obj.contents || 'For sale: Baby shoes, never worn';
	var vinylMock = new gUtil.File({
	    cwd      : obj.cwd,
			base     : obj.base,
			path     : obj.path,
			contents : new Buffer(obj.contents),
	});
	if (obj.revOrigPath) {
		vinylMock.revOrigPath = obj.revOrigPath;
	}
	return vinylMock;
}


/**
 * Convert Object Array into Vinyl mock Array
 * @param {Array.<RevVinylMock>} list - Array of mock Objects with Vinyl prerequisites
 * @return {Array.Object} - Mock Vinyl Array
 */
function mockVinylArray(list){
	return list.map(mockVinylFile);
}


/**
 * Convert Array of Objects or Object into Vinyl mock (Array)
 * @param {(Array.<RevVinylMock>|<RevVinylMock>)} asset - Array or Object with Vinyl prerequisites
 * @return {(Array.Object|Object)} - Array or Object of Vinyl Mock(s)
 */
function mockVinyl(asset){
	if (Array.isArray(asset)) {
		return mockVinylArray(asset);
	}
	return mockVinylFile(asset);
}

/**
 * Write Data to Stream
 * @param {Stream} stream - Initialized Stream
 * @param {*} data - Data to write to stream
 */
function writeToStream(stream, data){
	if (Array.isArray(data)) {
		data.forEach(function(mock){
			stream.write(mock);
		});
	} else {
		stream.write(data);
	}
}


////////////////////////////////////////////////////////////////////////////////
// Mocha Unit Tests
////////////////////////////////////////////////////////////////////////////////

describe('gulp-rev-napkin', function(){
	var VINYL_FILES_VALID = vinylPrimer(TEST_FILES_VALID, TEST_CWD, TEST_DIR, TEST_FILE_CONTENTS);
	VINYL_FILES_VALID = mockVinyl(TEST_FILES_VALID);

	var actualLog = gUtil.log;
	var logOutput = [];

	////////////////////////////////////////
	// Test Preparation
	////////////////////////////////////////

	beforeEach(function(done){
		// Collect Log Output for testing
		gUtil.log = function(){
			logOutput.push(Array.prototype.slice.call(arguments));
		};
		// Ensure Test Files Exist
		VINYL_FILES_VALID.forEach(function(asset){
			fs.ensureFileSync(asset.path);
			if (asset.revOrigPath) {
				fs.ensureFileSync(asset.revOrigPath);
			}
		});
		done();
	});


	afterEach(function(done){
	  gUtil.log = actualLog;
		logOutput = [];
		done();
	});


	after(function(done){
		// Clear Test Cruft
		fs.remove(TEST_DIR, function(error){
			if (error) {
				throw error;
			}
			done();
		});
	});

	////////////////////////////////////////
	// Verify Testing Environment
	////////////////////////////////////////

	it('should have a working TEST directory', function(done){
		VINYL_FILES_VALID.forEach(function(file){
			expect(fs.existsSync(file.path)).to.equal(true);
			if (file.revOrigPath) {
				expect(fs.existsSync(file.revOrigPath)).to.be.true;
			}
		});
		done();
	});


	////////////////////////////////////////
	// Verify 'Through' Stream
	////////////////////////////////////////

	describe(':: Stream', function(){
		it('should pass file structure through', function(done){
			var fakeFile = VINYL_FILES_VALID[0];
			var stream = revNapkin();

			stream.on('data', function(file){
				expect(file).to.exist;
				expect(file.path).to.exist.and.to.equal( fakeFile.path );
				expect(String(file.contents)).to.exist.and.to.equal(TEST_FILE_CONTENTS);
				expect(file.revOrigPath).to.exist.and.to.equal(fakeFile.revOrigPath);
			});

			writeToStream(stream, fakeFile);

			stream.end(done);
		});
	});


	////////////////////////////////////////
	// Verify Plugin
	////////////////////////////////////////
	describe(':: Napkin', function(){

		describe('# Basic Usage', function(){
			it('should delete only original file', function(done){
				var stream = revNapkin();

				writeToStream(stream, VINYL_FILES_VALID);

				stream.end(function(){
					VINYL_FILES_VALID.forEach(function(file){
						expect(fs.existsSync(file.path)).to.be.true;
						expect(fs.existsSync(file.revOrigPath)).to.be.false;
					});
					done();
				});
			});


			it('should not delete file outside of CWD by default', function(done){
				var cwd = path.resolve(TEST_CWD, TEST_DIR);
				var baseDir = TEST_CWD;
				var errorFile = TEST_FILES_FAIL.outOfBound;
				errorFile = vinylPrimer(errorFile, cwd, baseDir, TEST_FILE_CONTENTS);
				errorFile = mockVinyl(errorFile);

				fs.ensureFileSync(errorFile.path);
				fs.ensureFileSync(errorFile.revOrigPath);

				var stream = revNapkin();

				stream.on('error', function(){
					this.emit('end');
				});

				writeToStream(stream, errorFile);

				stream.on('end', function(){
					expect(fs.existsSync(errorFile.path)).to.be.true;
					expect(fs.existsSync(errorFile.revOrigPath)).to.be.true;
					fs.removeSync(errorFile.path);
					fs.removeSync(errorFile.revOrigPath);
					done();
				});

				// Just in case. No timeout.
				stream.end();
			});


			it('should emit error if target is outside of CWD with default force', function(done){
				var cwd = path.resolve(TEST_CWD, TEST_DIR);
				var baseDir = TEST_CWD;
				var errorFile = TEST_FILES_FAIL.outOfBound;
				errorFile = vinylPrimer(errorFile, cwd, baseDir, TEST_FILE_CONTENTS);
				errorFile = mockVinyl(errorFile);

				fs.ensureFileSync(errorFile.path);
				fs.ensureFileSync(errorFile.revOrigPath);

				var errorCount = 0;
				var stream = revNapkin();

				stream.on('error', function(error){
					expect(error).to.exist;
					if (error) {
						expect(error).to.be.an.instanceof(Error);
						errorCount += 1;
					}
					this.emit('end');
				});

				writeToStream(stream, errorFile);

				stream.on('end', function(){
					expect(errorCount).to.equal(1);
					fs.removeSync(errorFile.path);
					fs.removeSync(errorFile.revOrigPath);
					done();
				});

				// Just in case. No timeout.
				stream.end();
			});


			it('should not delete file outside of CWD if {force:false}', function(done){
				var cwd = path.resolve(TEST_CWD, TEST_DIR);
				var baseDir = TEST_CWD;
				var errorFile = TEST_FILES_FAIL.outOfBound;
				errorFile = vinylPrimer(errorFile, cwd, baseDir, TEST_FILE_CONTENTS);
				errorFile = mockVinyl(errorFile);

				fs.ensureFileSync(errorFile.path);
				fs.ensureFileSync(errorFile.revOrigPath);

				var stream = revNapkin({force: false});

				stream.on('error', function(){
					this.emit('end');
				});

				writeToStream(stream, errorFile);

				stream.on('end', function(){
					expect(fs.existsSync(errorFile.path)).to.be.true;
					expect(fs.existsSync(errorFile.revOrigPath)).to.be.true;
					fs.removeSync(errorFile.path);
					fs.removeSync(errorFile.revOrigPath);
					done();
				});

				// Just in case. No timeout.
				stream.end();
			});


			it('should delete file outside of CWD if {force:true}', function(done){
				var cwd = path.resolve(TEST_CWD, TEST_DIR);
				var baseDir = TEST_CWD;
				var errorFile = TEST_FILES_FAIL.outOfBound;
				errorFile = vinylPrimer(errorFile, cwd, baseDir, TEST_FILE_CONTENTS);
				errorFile = mockVinyl(errorFile);

				fs.ensureFileSync(errorFile.path);
				fs.ensureFileSync(errorFile.revOrigPath);

				var stream = revNapkin({force: true});

				writeToStream(stream, errorFile);

				stream.end(function(){
					expect(fs.existsSync(errorFile.path)).to.be.true;
					expect(fs.existsSync(errorFile.revOrigPath)).to.be.false;
					fs.removeSync(errorFile.path);
					fs.removeSync(errorFile.revOrigPath);
					done();
				});
			});


			it('should log output by default', function(done){
				var stream = revNapkin();

				writeToStream(stream, VINYL_FILES_VALID);

				stream.end(function(){
					expect(logOutput.length).to.equal(TEST_FILES_VALID.length);
					done();
				});
			});


			it('should log output if {verbose:true}', function(done){
				var stream = revNapkin({verbose: true});

				writeToStream(stream, VINYL_FILES_VALID);

				stream.end(function(){
					expect(logOutput.length).to.equal(TEST_FILES_VALID.length);
					done();
				});
			});


			it('should not log output if {verbose:false}', function(done){
				var stream = revNapkin({verbose: false});

				writeToStream(stream, VINYL_FILES_VALID);

				stream.end(function(){
					expect(logOutput.length).to.equal(0);
					done();
				});
			});
		});

		////////////////////////////////////////

		describe('# Cavents', function(){
			it('should not delete if target is directory', function(done){
				var errorFile = TEST_FILES_FAIL.directory;
				errorFile = vinylPrimer(errorFile, TEST_CWD, TEST_DIR, TEST_FILE_CONTENTS);
				errorFile = mockVinyl(errorFile);

				var stream = revNapkin();

				stream.on('error', function(){
					this.emit('end');
				});

				writeToStream(stream, errorFile);

				stream.on('end', function(){
					expect(fs.existsSync(errorFile.revOrigPath)).to.be.true;
				  done();
				});

				// Just in case. No timeout.
				stream.end();
			});


			it('should emit error if target is directory', function(done){
				var errorFile = TEST_FILES_FAIL.directory;
				errorFile = vinylPrimer(errorFile, TEST_CWD, TEST_DIR, TEST_FILE_CONTENTS);
				errorFile = mockVinyl(errorFile);
				fs.ensureFileSync(errorFile.path);

				var errorCount = 0;
				var stream = revNapkin();

				stream.on('error', function(error){
					expect(error).to.exist;
					if (error) {
						expect(error).to.be.an.instanceof(Error);
						errorCount += 1;
					}
					this.emit('end');
				});

				writeToStream(stream, errorFile);

				stream.on('end', function(){
					expect(errorCount).to.equal(1);
				  done();
				});

				// Just in case. No timeout.
				stream.end();
			});


			it('should emit error if target file does not exist', function(done){
				var errorFile = TEST_FILES_FAIL.noExist;
				errorFile = vinylPrimer(errorFile, TEST_CWD, TEST_DIR, TEST_FILE_CONTENTS);
				errorFile = mockVinyl(errorFile);

				var errorCount = 0;
				var stream = revNapkin();

				stream.on('error', function(error){
					expect(error).to.exist;
				  if (error) {
					  expect(error).to.be.an.instanceof(Error);
						errorCount += 1;
					}
					this.emit('end');
				});

				writeToStream(stream, errorFile);

				stream.on('end', function(){
					expect(errorCount).to.equal(1);
				  done();
				});

				// Just in case. No timeout.
				stream.end();
			});


			it('should emit error if target file has broken path', function(done){
			  var errorFile = TEST_FILES_FAIL.brokenPath;
				errorFile = vinylPrimer(errorFile, TEST_CWD, TEST_DIR, TEST_FILE_CONTENTS);
				errorFile = mockVinyl(errorFile);

				var errorCount = 0;
				var stream = revNapkin();

				stream.on('error', function(error){
				  expect(error).to.exist;
					if (error) {
					  expect(error).to.be.an.instanceof(Error);
						errorCount += 1;
					}
					this.emit('end');
				});

				writeToStream(stream, errorFile);

				stream.on('end', function(){
					expect(errorCount).to.equal(1);
				  done();
				});

				// Just in case. No timeout.
				stream.end();
			});

		});
	});


});


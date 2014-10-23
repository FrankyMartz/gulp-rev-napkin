/*global describe, beforeEach, after, it */
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

var TEST_FILES_FAIL = [
	// Non-Existing File
	{path:'style-61e0be79.css', revOrigPath:'style-does-not-exist.css'},
	// Out of Bounds
	{path:'../TEST-out-of-bounds.h2131j4.css', revOrigPath:'../TEST-out-of-bounds.css'},
	// CWD
	{path:'', revOrigPath:''},
	// Directories
	{path:'fonts/fontstyle-61e0be79.js', revOrigPath:'fonts/'},
	{path:'css/fonts/fontstyle-a42f5380.css', revOrigPath:'css/fonts'},
	// Broken Path
	{path:'css/fonts/fontstyle-1d87bebe.min.css', revOrigPath:'css/fonts/NOOP/fontstyle.min.css'}
];


/**
 * Create Array of Vinyl file configurations for Testing.
 * @param {String} cwd - Current Working Directory
 * @param {String} baseDir - Base path for file
 * @param {String} contents - File contents
 * @return {Array.Object} Array of fake rev'd vinyl file representations
 */
function testFileList(cwd, baseDir, contents) {
	// !!! ADD/REMOVE test files HERE !!!
	var files = [
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

	var filesFail = [
		// Non-Existing File
		{path:'style-does-exist.css', revOrigPath:'style-does-not-exist.css'},
		// Out of Bounds
		{path:'../TEST-out-of-bounds.h2131j4.css', revOrigPath:'../TEST-out-of-bounds.css'},
		// CWD
		{path:'', revOrigPath:''},
		// Directories
		{path:'fonts/badkerning-98374hk3.js', revOrigPath:'fonts/'},
		{path:'css/fonts/codesmell-kjh4kj21.css', revOrigPath:'css/fonts'},
		// Broken Path
		{path:'css/fonts/whitespace-ys93v2fe.min.css', revOrigPath:'css/fonts/NOOP/whitespace.min.css'}
	];

	// Setup Additional Vinyl requirements
	files.forEach(function(obj){
		obj.cwd = cwd;
		obj.base = path.resolve(baseDir);
		obj.path = path.join(baseDir, obj.path);
		obj.contents = contents;
		if (obj.revOrigPath) {
			obj.revOrigPath = path.join(baseDir, obj.revOrigPath);
		}
	});
	return files;
}

////////////////////////////////////////////////////////////////////////////////
// Helper Functions
////////////////////////////////////////////////////////////////////////////////

/**
 * Create Array of objects configured for Vinyl testing.
 * @param {Object} obj - Object with <path>, <revOrigPath> keys
 * @param {String} cwd - Current Working Directory
 * @param {String} baseDir - Base path for file
 * @param {String} contents - File contents
 * @return {Object} Object configured for Vinyl mocking
 */
function vinylFilePrimer(obj, cwd, baseDir, contents){
	obj.cwd = cwd;
	obj.base = path.resolve(baseDir);
	obj.path = path.join(baseDir, obj.path);
	obj.contents = contents;
	if (obj.revOrigPath) {
	  obj.revOrigPath = path.join(baseDir, obj.revOrigPath);
	}
  return obj;
}


/**
 * Create Array of objects configured for Vinyl testing.
 * @param {Array.Object} list - Array of Objects with <path>, <revOrigPath> keys
 * @param {String} cwd - Current Working Directory
 * @param {String} baseDir - Base path for file
 * @param {String} contents - File contents
 * @return {Array.Object} Array of objects configured for Vinyl mocking
 */
function vinylArrayPrimer(list, cwd, baseDir, contents){
  return list.map(function(asset){
	  return vinylFilePrimer(asset, cwd, baseDir, contents);
	});
}


/**
 * mockVinylFile
 * @summary Create post gulp-rev(-all) vinyl file
 * @param {RevVinylMock} obj - Args for instantiating Vinyl file plus rev info
 * @return {Object} Vinyl file
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
	var file = new gUtil.File({
	    cwd      : obj.cwd,
			base     : obj.base,
			path     : obj.path,
			contents : new Buffer(obj.contents),
	});
	if (obj.revOrigPath) {
		file.revOrigPath = obj.revOrigPath;
	}
	return file;
}


/**
 * Convert Array of Files into Vinyl Array
 * @param {Array.Object} list - Array of Mock Files
 * @return {Array.Object} - Array of Mock Vinyl Files
 */
function mockVinylArray(list){
	return list.map(mockVinylFile);
}


/**
 * writeToStream
 * @summary Initialize Stream with File
 * @param stream
 * @param asset
 * @return {undefined}
 */
function writeToStream(stream, asset){
	if (Array.isArray(asset)) {
		asset.forEach(function(file){
			stream.write(file);
		});
	} else {
		stream.write(asset);
	}
	return stream;
}


////////////////////////////////////////////////////////////////////////////////
// Mocha Unit Tests
////////////////////////////////////////////////////////////////////////////////

describe('gulp-rev-napkin', function(){
	VINYL_FILES_VALID = mockVinylArray( vinylArrayPrimer(TEST_FILES_VALID) );
	TEST_FILES = mockVinylArray(TEST_FILES);

	////////////////////////////////////////

	beforeEach(function(done){
		TEST_FILES.forEach(function(asset){
			fs.ensureFileSync(asset.path);
			if (asset.revOrigPath) {
				fs.ensureFileSync(asset.revOrigPath);
			}
		});
		done();
	});

	////////////////////////////////////////

	after(function(done){
			fs.remove(TEST_DIR, function(error){
				if (error) {
					throw error;
				}
				done();
			});
	});

	////////////////////////////////////////

	it('should have a working TEST directory', function(done){
		TEST_FILES.forEach(function(file){
			expect(fs.existsSync(file.path)).to.equal(true);
			if (file.revOrigPath) {
				expect(fs.existsSync(file.revOrigPath)).to.be.true;
			}
		});
		done();
	});

	describe(':: Stream', function(){
		it('should pass file structure through', function(done){
			var fakeFile = TEST_FILES[0];
			var stream = revNapkin({verbose:false});

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


	describe(':: Napkin', function(){

		describe(':: File Deletion', function(){
				it('should delete only original file', function(done){
					var stream = revNapkin({verbose:false});

					writeToStream(stream, TEST_FILES);

					stream.end(function(){
						TEST_FILES.forEach(function(file){
							expect(fs.existsSync(file.path)).to.be.true;
							expect(fs.existsSync(file.revOrigPath)).to.be.false;
						});
					  done();
					});
				});
		});


		describe(':: Cavents', function(){
			it('should not delete target if folder', function(done){
				done();
			});

			//it('should emit error if target file does not exist', function(done){
				//done();
			//});

			//it('should emit error if target file dir does not exist', function(done){
				//done();
			//});

			//it('should not delete current working directory', function(done){
				//done();
			//});

			//it('should not delete target file outside current working directory', function(done){
				//done();
			//});
		});

	});


});


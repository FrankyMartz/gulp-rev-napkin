[![Build Status](https://travis-ci.org/FrankyMartz/gulp-rev-napkin.svg)](https://travis-ci.org/FrankyMartz/gulp-rev-napkin)
[![Dependencies](https://david-dm.org/frankymartz/gulp-rev-napkin.svg)](https://david-dm.org/frankymartz/gulp-rev-napkin)
[![Coverage Status](https://img.shields.io/coveralls/FrankyMartz/gulp-rev-napkin.svg)](https://coveralls.io/r/FrankyMartz/gulp-rev-napkin)

# [gulp](https://github.com/wearefractal/gulp)-rev-napkin

> Remove original files remaining from [gulp-rev](https://github.com/sindresorhus/gulp-rev), or [gulp-rev-all](https://david-dm.org/shonny-ua/gulp-rev-outdated) process. (file.revOrigPath)

Those plugins do a fantastic job but both leave behind the original un-hashed
files. `gulp-rev-napkin` is for cleaning up after them.

## Install

```sh
$ npm install --save-dev gulp-rev-napkin
```


## Usage

```js
var gulp = require('gulp');
var rev = require('gulp-rev');
var revNapkin = require('gulp-rev-napkin');

gulp.task('default', function () {
	return gulp.src('src/**/*.+(css|js|jpg|png|gif)')
		.pipe(rev())
		.pipe(gulp.dest('dest/'))
		.pipe(revNapkin()); // Just place after gulp-rev(-all)
});
```


## API

### revNapkin(options)
Returns a transform stream. 

#### options.verbose
Type: `boolean`

Default: `true`

```js
revNapkin({verbose: false})
```

Enable/Disable `gulp-rev-napkin` log messages.



#### options.force
Type: `boolean`

Default: `false`

```js
revNapkin({force: true})
```

Enable/Disable file removal outside of current working directory (cwd).

__Note:__ `gulp-rev-napkin` uses the terminal `pwd` to determine the `cwd`.



### Works with gulp-rev-napkin
- [gulp-rev](https://github.com/sindresorhus/gulp-rev)
- [gulp-rev-all](https://david-dm.org/shonny-ua/gulp-rev-outdated)


## License

MIT &copy; [Franky Martinez](http://frankymartz.com)

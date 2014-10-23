# [gulp][]-rev-napkin

> Remove original files transformed through gulp-rev or gulp-rev-all

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

[gulpjs]: http://gulpjs.com "The streaming build system"

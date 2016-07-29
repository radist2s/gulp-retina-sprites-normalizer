# gulp-retina-sprites-normalizer

> Retina size images normalizer.

## What it does
Sometimes when you exporting images from Photoshop/Sketch/etc in 1x size and 2x size your retina images could be not really 2x.
For example: 1x icon with size <code>10x10</code> could be <code>10x9</code> or <code>11x10</code>. The Normalizer adding transparent padding to images for correct 2x size.
It's useful with [spritesmith](https://github.com/Ensighten/spritesmith). You can use it with gulp or any other code which uses Streams.

## Installation

Install with [npm](https://www.npmjs.com/)

```sh
$ npm i gulp-retina-sprites-normalizer --save-dev
```

## Usage

###### Usage with [gulp.spritesmith](https://github.com/twolfson/gulp.spritesmith)

```js
var path = require('path'),
    gulp = require('gulp'),
    imagesNormalizer = require('gulp-retina-sprites-normalizer')

// Install gulp.spritesmith first it not goes as dependency for the module
var spritesmith = require('gulp.spritesmith')

gulp.task('build-sprites', function() {
    var spritesGroup = {
        spritesPath: './fixtures',
        chunksMask: '**/*.png',
        chunksMaskRetina: '**/*2x.png',
        imgBuiltDir: './dest'
    }
    
    // You can specify your retina images names first
    imagesNormalizer.ImagesPadding.prototype.retinaSrcFilter = spritesGroup.chunksMaskRetina // default: **/*2x.png
    imagesNormalizer.ImagesPadding.prototype.retinaFileSuffix = '@2x.png' // default: @2x.png

    return gulp.src(path.join(spritesGroup.spritesPath, spritesGroup.chunksMask))
        .pipe(imagesNormalizer())
        .pipe(
            spritesmith(
                {
                    cssName: 'main.css',
                    padding: 4,
                    imgName: 'main.png',
                    retinaSrcFilter: path.join(spritesGroup.spritesPath, spritesGroup.chunksMaskRetina),
                    retinaImgName: 'main@2x.png'
                }
            )
        )
        .img.pipe(gulp.dest(spritesGroup.imgBuiltDir))
})

```


###### Stand alone usage

If you want just normalize images and save - it's simple.
```js
var gulp = require('gulp'),
    imagesNormalizer = require('gulp-retina-sprites-normalizer')

gulp.task('normalize-sprites', function () {
    gulp.src(path.join('./fixtures/**/*.png'))
        .pipe(imagesNormalizer())
        .pipe(gulp.dest('./dest/sprites'))
})
```

## Contributing
Pull requests and stars are always welcome. For bugs and feature requests, [please create an issue](https://github.com/radist2s/gulp-retina-sprites-normalizer/issues).

## Author

**Alex Batalov**

+ [github/radist2s](https://github.com/radist2s)

## License
Copyright © 2016 [Alex Batalov](http://tagart.ru)
Licensed under the MIT license.

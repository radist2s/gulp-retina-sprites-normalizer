'use strict'

var path = require('path'),
    gulp = require('gulp')

var imagesNormalizer = require('../')

imagesNormalizer.ImagesPadding.prototype.retinaSrcFilter = '**/*2x.png'
imagesNormalizer.ImagesPadding.prototype.retinaFileSuffix = '@2x.png'

gulp.task('build-sprites', function() {
    var spritesGroup = {
        spritesPath: './fixtures',
        chunksMask: '**/*.png',
        chunksMaskRetina: '**/*2x.png',
        imgBuiltDir: './dest'
    }

    var spritesmith = require('gulp.spritesmith')

    var imgName = 'main.png',
        imgNameRetina = 'main@2x.png'

    return gulp.src(path.join(spritesGroup.spritesPath, spritesGroup.chunksMask))
        .pipe(imagesNormalizer())
        .pipe(
            spritesmith(
                {
                    cssName: 'main.css',
                    padding: 4,
                    imgName: imgName,
                    retinaSrcFilter: path.join(spritesGroup.spritesPath, spritesGroup.chunksMaskRetina),
                    retinaImgName: imgNameRetina
                }
            )
        )
        .img.pipe(gulp.dest(spritesGroup.imgBuiltDir))
})

gulp.task('normalize-sprites', function () {
    gulp.src(path.join('./fixtures/**/*.png'))
        .pipe(imagesNormalizer())
        .pipe(gulp.dest('./dest/sprites'))
})
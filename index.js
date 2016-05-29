'use strict'

const PLUGIN_NAME = 'gulp-retina-sprites-padding'

var path = require('path'),
    through = require('through'),
    Minimatch = require('minimatch').Minimatch,
    Pixelsmith = require('pixelsmith'),
    async = require('async')

// Copy/paste helper from gulp
// https://github.com/wearefractal/glob-stream/blob/v5.0.0/index.js#L131-L138
function unrelative(cwd, glob) {
    var mod = '';
    if (glob[0] === '!') {
        mod = glob[0];
        glob = glob.slice(1);
    }
    return mod + path.resolve(cwd, glob);
}

class ImagesPadding {
    constructor(options) {
        this.images = []

        if (options) {
            if (options.retinaSrcFilter) {
                this.retinaSrcFilter = options.retinaSrcFilter
            }

            if (options.retinaFileSuffix) {
                this.retinaFileSuffix = options.retinaFileSuffix
            }
        }

        this.stream = this.createStream(this.collectImages, this.onStreamEnd)
    }

    onStreamEnd(stream) {
        var imageCouples = this.findImageCouples(this.retinaSrcFilter, this.retinaFileSuffix)

        async.each(
            imageCouples, (couple, cb) => {
                this.prepareSprites(couple.normal, couple.retina, stream, cb)
            },
            stream.queue.bind(stream, null)
        )
    }

    collectImages(stream, file) {
        this.images.push(file)

        stream.push(file)
    }

    createStream(transformCallback, endCallback) {
        var _this = this

        return through(
            function (sourceFile, enc, cb) {
                transformCallback.bind(_this, this).apply(_this, arguments)
            },
            function () {
                if (endCallback) {
                    endCallback.bind(_this, this).apply(_this, arguments)
                }
                else {
                    this.queue(null)
                }
            }
        )
    }

    findImageCouples(retinaSrcFilter, retinaFileSuffix) {
        var imagesRetina = {}

        var retinaSrcPatterns = Array.isArray(retinaSrcFilter) ? retinaSrcFilter : [retinaSrcFilter]

        var normalImages = this.images.filter(function filterSrcFile (file) {
            var isRetinaFile = retinaSrcPatterns.some(function matchMinimatches (retinaSrcPattern) {
                var minimatch = new Minimatch(unrelative(file.base, retinaSrcPattern))

                return minimatch.match(file.path)
            })

            if (isRetinaFile) {
                imagesRetina[path.relative(file.base, file.path)] = file
                return false
            }
            else {
                return true
            }
        })

        var retinaImagesList = Object.keys(imagesRetina)

        var fileCouples = normalImages.map(function (file) {
            var fileRelPath = path.relative(file.base, file.path)

            var possibleRetinaFilePath = path.join(
                path.dirname(fileRelPath),
                path.basename(fileRelPath, path.extname(fileRelPath)) + retinaFileSuffix
            )

            var retinaFilePathIndex = retinaImagesList.indexOf(possibleRetinaFilePath)

            if (retinaFilePathIndex === -1) {
                return
            }

            var retinaImagePath = retinaImagesList[retinaFilePathIndex]

            return {
                normal: file,
                retina: imagesRetina[retinaImagePath]
            }
        }).filter(val => val)

        return fileCouples
    }

    prepareSprites(normalFile, retinaFile, stream, cb) {
        var pixelsmith = new Pixelsmith()

        pixelsmith.createImages([normalFile, retinaFile], function handleImages (path, err, imgs) {
            if (err) {
                stream.emit('error', PLUGIN_NAME + ': ' + err.toString())

                return cb(null)
            }

            var normal = imgs[0],
                retina = imgs[1]

            var desiredRetinaWidth = normal.width * 2,
                desiredRetinaHeight = normal.height * 2

            if (retina.width == desiredRetinaWidth && retina.height == desiredRetinaHeight) {
                return cb(null)
            }

            var canvasNormal

            if (retina.width > desiredRetinaWidth || retina.height > desiredRetinaHeight) {
                desiredRetinaWidth = retina.width % 2 + retina.width
                desiredRetinaHeight = retina.height % 2 + retina.height

                canvasNormal = pixelsmith.createCanvas(desiredRetinaWidth / 2, desiredRetinaHeight / 2)

                canvasNormal.addImage(
                    normal,
                    Math.floor((desiredRetinaWidth / 2 - normal.width) / 2),
                    Math.floor((desiredRetinaHeight / 2 - normal.height) / 2)
                )
            }
            else if (!(retina.width <= desiredRetinaWidth && retina.height <= desiredRetinaHeight)) {
                stream.emit('error', PLUGIN_NAME + ': %fn. Normal sprite: %ns, Retina sprite: %rs.'
                    .replace(/%fn/, path.basename(normalFile.path))
                    .replace(/%ns/, normal.width + 'X' + normal.height)
                    .replace(/%rs/, retina.width + 'X' + retina.height)
                )

                return cb(null)
            }

            var canvasRetina = pixelsmith.createCanvas(desiredRetinaWidth, desiredRetinaHeight)

            canvasRetina.addImage(
                retina,
                Math.floor((desiredRetinaWidth - retina.width) / 2),
                Math.floor((desiredRetinaHeight - retina.height) / 2)
            )

            var imageStreamRetina = canvasRetina['export']({format: 'png'}),
                imageBufferRetina

            var imageNormalPromise,
                imageRetinaPromise = new Promise(function (resolve) {
                imageStreamRetina
                    .on('data', function (buffer) {
                        if (imageBufferRetina) {
                            imageBufferRetina = Buffer.concat([imageBufferRetina, buffer], imageBufferRetina.length + buffer.length)
                        }
                        else {
                            imageBufferRetina = buffer
                        }
                    })
                    .on('end', function () {
                        retinaFile.contents = imageBufferRetina

                        resolve()
                    })
            })

            if (canvasNormal) {
                var imageStreamNormal = canvasNormal['export']({format: 'png'}),
                    imageBufferNormal

                imageNormalPromise = new Promise(function (resolve) {
                    imageStreamNormal
                        .on('data', function (buffer) {
                            if (imageBufferNormal) {
                                imageBufferNormal = Buffer.concat([imageBufferNormal, buffer], imageBufferNormal.length + buffer.length)
                            }
                            else {
                                imageBufferNormal = buffer
                            }
                        })
                        .on('end', function () {
                            normalFile.contents = imageBufferNormal

                            resolve()
                        })
                })
            }
            else {
                imageNormalPromise = Promise.resolve()
            }

            Promise.all([imageRetinaPromise, imageNormalPromise]).then(cb.bind(undefined, null))
        }.bind(undefined, normalFile.path))
    }
}

ImagesPadding.prototype.retinaSrcFilter = '**/*2x.png'
ImagesPadding.prototype.retinaFileSuffix = '@2x.png'

function imagesPadding(options) {
    var imagesPaddingInstance = new ImagesPadding(options)

    return imagesPaddingInstance.stream
}

imagesPadding.ImagesPadding = ImagesPadding

module.exports = imagesPadding
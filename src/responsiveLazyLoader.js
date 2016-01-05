/**
 *
 */
;
(function ($, window, document) {

    "use strict";

    var pluginName = "responsiveLazyLoader",
        defaults = {

            distance: 0, // the distance (in pixels) between the image and active window for loading the actual image
            force: false, // force images loading without distance
            scroll: true, // consider scrolling
            resize: true, // consider resizing
            loader: false, // show laoder
            token: '[[display]]', // token to be replaced by media query key

            // media queries key -> query
            mediaQueries: {
                'm': "(max-width: 480px)", // phone
                'm@2x': "(max-width: 480px) and (-webkit-min-device-pixel-ratio: 2)", // phone-retina
                't': "(min-width: 481px) and (max-width: 768px)", // tablet
                't@2x': "(min-width: 481px) and (max-width: 768px) and (-webkit-min-device-pixel-ratio: 2)", // tablet-retina
                'd': "(min-width: 769px)", // desktop
                'd@2x': "(min-width: 769px) and (-webkit-min-device-pixel-ratio: 2)" // desktop-retina
            },

            defaultMediaQueryKey: 'd',

            // triggered when all images are loaded
            complete: function () {

            },

            // triggered when all images in the current view port are loaded
            viewportComplete: function () {

            },

            // triggered when plugin was initialzied
            initialized: function () {

            },

            identifier: null

        };

    function ResponsiveLazyLoader(element, options, callback) {
        this.element = $(element);
        this.settings = $.extend({}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;
        this.callback = callback;

        this.init();
    }

    $.extend(ResponsiveLazyLoader.prototype, {

        init: function () {

            var that = this;

            if (!this.getCache('currentMediaQueryKey')) {
                this.setCache('currentMediaQueryKey', this.getCurrentMediaQueryKey())
            }

            that.load();

            if (this.settings.scroll) {
                $(window).bind('scroll', function () {
                    that.refresh();
                });
            }

            if (this.settings.resize) {
                $(window).resize(function () {
                    that.setCache('mediaQueryDetection', true);
                    that.refresh();
                });
            }

        },

        refresh: function () {
            var current = this.getCurrentMediaQueryKey();
            if (this.getCache('currentMediaQueryKey') != current) {
                this.setCache('currentMediaQueryKey', current);
            }
            this.load();
        },

        getCurrentMediaQueryKey: function () {

            if (this.getCache('mediaQueryDetection')) {

                var that = this, queryKey = this.settings.defaultMediaQueryKey;
                $.each(this.settings.mediaQueries, function (key, value) {
                    if (that.isMatchingMediaQuery(value)) {
                        queryKey = key;
                    }
                });

                this.setCache('mediaQueryDetection', false);

            } else {
                queryKey = this.getCache('currentMediaQueryKey');
            }

            return queryKey;
        },

        isMatchingMediaQuery: function (mediaQuery) {
            if ('matchMedia' in window) {
                return window.matchMedia(mediaQuery).matches;
            }
            else if (Modernizr) {
                return Modernizr.mq(mediaQuery);
            }
            return false;
        },

        shouldBeLoaded: function () {

            if (this.settings.force || this.elementHasAttribute('data-force-loading')) {
                return true;
            }

            if (this.preventLoading()) {
                return false;
            }

            // cache $(window).height()

            var windowTop = $(window).scrollTop() - this.settings.distance,
                    windowBottom = windowTop + $(window).height() + (this.settings.distance * 2),
                    elementTop = this.element.offset().top - this.settings.distance,
                    elementBottom = elementTop + this.element.height() + this.settings.distance;

            return elementBottom >= windowTop && elementTop <= windowBottom;
        },

        preventLoading: function () {

            return this.element.hasClass('prevent-loading-' + this.getCache('currentMediaQueryKey').charAt(0));

        },

        load: function () {

            if (!this.elementHasAttribute('data-media-query')) {
                this.element.attr('data-media-query', this.getCache('currentMediaQueryKey'));
            }

            var mediaQueryChange = this.getCache('currentMediaQueryKey') != this.element.attr('data-media-query');

            if (!this.element.hasClass('loaded') || mediaQueryChange) {

                // should be loaded is very cpu intensive so do it only if really needed
                if (this.shouldBeLoaded() || mediaQueryChange) {

                    var that = this,
                        isImage = this.element.is('img'),
                        isLink = this.element.is('a'),
                        targetAttribute = this.elementHasAttribute('data-target-attribute') ? this.element.attr('data-target-attribute') : isLink ? 'href' : 'src',
                        sourceAttribute = this.elementHasAttribute('data-src') ? 'data-src' : this.elementHasAttribute('data-src-ll') ? 'data-src-ll' : false,
                        targetSrc = this.element.attr(sourceAttribute).replace(this.settings.token, this.getCache('currentMediaQueryKey'));

                    if (sourceAttribute !== false) {

                        this.element
                            //.css('visibility', 'hidden') -- flicker
                            .one('load', function (e) {
                                // is called when image was loaded
                                that.element
                                    //.css('visibility', 'visible')
                                    .addClass('loaded')
                                    .attr('data-media-query', that.getCache('currentMediaQueryKey'));

                                // remove spinner in case there is one
                                that.element.parent().removeClass('spinner');

                                if (typeof that.callback == 'function') {
                                    that.callback.call();
                                }
                            });

                        if (this.element.attr('data-src') || this.element.attr('data-src-ll')) {
                            if (isImage || isLink) {
                                this.element.attr(targetAttribute, targetSrc);
                            } else {

                                // idea create regular img to catch load evant
                                var dummyImage = $('<img style="display: none"/>').attr('src', targetSrc).load(function () {
                                    that.element.trigger('load');
                                    //  dummyImage.remove();
                                });

                                this.element.css('background-image', 'url(' + targetSrc + ')').after(dummyImage);

                            }
                            if (targetAttribute != 'src') {
                                that.element.trigger('load');
                            }
                        }

                    }

                }

            }

        },

        elementHasAttribute: function (name) {
            return typeof this.element.attr(name) !== 'undefined' && this.element.attr(name) !== false;
        },

        getCache: function (key) {
            return window.responsiveLazyLoader[this.settings.identifier][key];
        },

        setCache: function (key, value) {
            window.responsiveLazyLoader[this.settings.identifier][key] = value;
        }

    });

    $.fn[pluginName] = function (options) {

        // init global storage for caching
        window.responsiveLazyLoader = window.responsiveLazyLoader || {};
        window.responsiveLazyLoader['count'] = window.responsiveLazyLoader['count'] || 0;
        options = options || {};

        // define cache keys and general settings
        window.responsiveLazyLoader['count']++;
        options.identifier = 'group' + window.responsiveLazyLoader['count'];
        window.responsiveLazyLoader[options.identifier] = window.responsiveLazyLoader[options.identifier] || {};
        window.responsiveLazyLoader[options.identifier]['mediaQueryDetection'] = true;

        var elementsCount = this.length,
            elementsLoadedCount = this.length;

        return this.each(function () {

            if (!$.data(this, "plugin_" + pluginName)) {

                $.data(this, "plugin_" + pluginName, new ResponsiveLazyLoader(this, options, function () {

                    //console.log(elementsLoadedCount);

                    if (!--elementsLoadedCount) {
                        if (options) {
                            if (typeof options.complete == 'function') {
                                options.complete.call();
                            }
                        }
                    }

                }));

                if (!--elementsCount) {
                    if (options) {
                        if (typeof options.initialized == 'function') {
                            options.initialized.call();
                        }
                    }
                }

            }
        });
    };

})(jQuery, window, document);

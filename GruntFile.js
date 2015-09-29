'use strict';

module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('gruntify-eslint');
    grunt.loadNpmTasks('grunt-string-replace');
    grunt.loadNpmTasks('grunt-casperjs');

    grunt.initConfig({
        sass: {
            build: {
                options: {
                    style: 'compressed',
                },
                src: ['./src/main.scss'],
                dest: './dist/main.css',
            },
        },
        uglify: {
            js: {
                files: {
                    './dist/main.min.js': ['src/main.js', 'src/**.js'],
                },
            },
        },
        eslint: {
            options: {
                config: '.eslintrc',
            },
            src: './src/**.js',  
        },
        // strip 'use strict' from dist built. People _should_ use it globally
        // but we don't want to force out good behaviour onto others.
        'string-replace': {
            './dist/main.min.js': ['./dist/main.min.js'],
            options: {
                replacements: [{
                    pattern: new RegExp('"use strict";', 'g'),
                    replacement: '',
                }],
            },
        },
        casperjs: {
            options: {
                casperjsOptions: ['--web-security=no'],
            },
            files: ['test/*Tests.js'],
        },
    });

    grunt.registerTask('default', ['sass', 'eslint', 'uglify', 'string-replace', 'casperjs']);
    grunt.registerTask('dev', ['sass', 'uglify', 'casperjs']);
};
'use strict';

module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('gruntify-eslint');
    grunt.loadNpmTasks('grunt-string-replace');

    grunt.initConfig({
        sass: {
            build: {
                options: {
                    style: 'compressed',
                },
                src: ['main.scss'],
                dest: './dist/main.css',
            },
        },
        uglify: {
            js: {
                files: {
                    './dist/main.min.js': ['main.js'],
                },
            },
        },
        eslint: {
            options: {
                config: '.eslintrc',
            },
            src: 'main.js',  
        },
        'string-replace': {
            files: {
                './dist/main.min.js': './dist/main.min.js',
            },
            options: {
                replacements: [{
                    pattern: '"use strict";',
                    replacement: 'x',
                }],
            },
        },
    });

    grunt.registerTask('default', ['sass', 'eslint', 'uglify', 'string-replace']);
    grunt.registerTask('dev', ['sass', 'uglify']);
};
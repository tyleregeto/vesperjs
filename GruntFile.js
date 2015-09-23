'use strict';

module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('gruntify-eslint');

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
    });

    grunt.registerTask('default', ['sass', 'eslint', 'uglify']);
    grunt.registerTask('dev', ['sass', 'uglify']);
};
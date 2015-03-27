'use strict';

module.exports = function (grunt) {

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);
  var pkg = require('./bower.json');

  // Configurable paths for the application
  var appConfig = {
    app: pkg.appPath || 'src',
    dist: 'dist'
  };

  // Define the configuration for all the tasks
  grunt.initConfig({

    // Project settings
    resourceX: appConfig,

    // Watches files for changes and runs tasks based on the changed files
    watch: {
      js: {
        files: ['<%= resourceX.app %>/components/**/*.js'],
        tasks: ['newer:jshint:all']
      },
      gruntfile: {
        files: ['Gruntfile.js']
      }
    },

    bump: {
      options: {
        files: ['package.json'],
        updateConfigs: [],
        commit: true,
        commitMessage: 'Release v%VERSION%',
        commitFiles: ['package.json'],
        createTag: true,
        tagName: 'v%VERSION%',
        tagMessage: 'Version %VERSION%',
        push: true,
        pushTo: 'origin',
        gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
        globalReplace: false,
        prereleaseName: false,
        regExp: false
      }
    },

    // Make sure code styles are up to par and there are no obvious mistakes
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: {
        src: [
          'Gruntfile.js',
          '<%= resourceX.app %>/components/**/*.js'
        ]
      },
      test: {
        options: {
          jshintrc: 'test/.jshintrc'
        },
        src: ['test/spec/{,*/}*.js']
      }
    },

    uglify: {
      my_target: {
        options: {
          sourceMap: true,
          sourceMapName: 'dist/resource_.map'
        },
        files: {
          'dist/resource_.min.js': ['src/resource_.js']
        }
      }
    },

    // Empties folders to start fresh
    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            '.tmp',
            '<%= resourceX.dist %>/{,*/}*',
            '!<%= resourceX.dist %>/.git{,*/}*'
          ]
        }]
      },
      server: '.tmp'
    },

    ngAnnotate: {
      dist: {
        files: [{
          expand: true,
          cwd: 'dist/',
          src: 'resource_.js',
          dest: 'dist/resource_.js'
        }]
      }
    },

    // Test settings
    karma: {
      unit: {
        configFile: 'tests/configs/karma.conf.js',
        singleRun: true
      }
    }
  });

  grunt.registerTask('test', [
    'karma'
  ]);

  grunt.registerTask('build', [
    'ngAnnotate',
    'uglify'
  ]);

  grunt.registerTask('default', [
    'build',
    'test'
  ]);
};

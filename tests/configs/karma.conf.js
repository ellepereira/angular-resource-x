module.exports = function(config) {

  config.set({
    frameworks: ['jasmine'],
    basePath: '../../',
    files: [
      'bower_components/angular/angular.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'bower_components/angular-resource/angular-resource.js',
      'src/**/*.js',
      'tests/**/*.js'
    ],
    exclude: [],
    'colors': true,
    port: 8080,
    reporters: ['coverage','progress'],
    preprocessors: {
      'src/*.js': ['coverage']
    },
    coverageReporter: {
      type: "html",
      dir: 'tests/coverage/'
    },
    browsers: ['PhantomJS']
  });
};

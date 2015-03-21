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
    port: 8080,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    reporters: ['progress','coverage'],
    preprocessors: {
      "src/**/*.js": "coverage"
    },
    coverageReporter: {
      type: "lcov",
      dir: "tests/coverage/"
    },
    browsers: ['PhantomJS'],
    singleRun: false
  });
};

(function (angular) {

  'use strict';

  angular
    .module('ngResourceX', ['ngResource'])
    .provider('$resource_', $resource_);

  var forEach  = angular.forEach,
      extend   = angular.extend,
      copy     = angular.copy,
      isObject = angular.isObject,
      isString = angular.isString,
      isArray  = angular.isArray;

  /**
   * $resource utilities extension.
   * Adds extensibility and related resources to the Angular $resource module.
   * @class
   */
  function $resource_() {

    var provider = this;
    provider.$get = $get;

    //defaults holds all the configs
    provider.defaults = {
      'baseUrl': null,
      'relationPrefix': '_',
      'methods': {
        //'relationships': relationships
      },
      'statics': {
        'relate': relate,
        //'getFull': getFull,
        'relationships': relationships
      },
      'params': {},
      'actions': {
        'update': {
          'method': 'PATCH'
        },
        'get': {
          'method': 'GET'
        },
        'query': {
          'isArray': true,
          'method': 'GET'
        },
        'save': {
          'method': 'POST'
        },
        'options': {
          'method': 'OPTIONS'
        }
      }
    };

    $get.$inject = ['$resource', '$q'];
    /**
     * Provider $get function that returns the resource factory function.
     * @param $resource
     * @param $q
     * @returns {resourceFactory}
     */
    function $get($resource, $q) {

      /**
       * Wrapper for $resource. Creates a $resource and adds default methods/statics
       * @param url {string} URL of this $resource
       * @param params {Object} hash of parameters, same as $resource but modified to support ^ to map to parent properties.
       * @param actions {Object} hash of actions, see $resource documentation
       * @param options {Object} hash of options, see $resource documentation
       * @public
       * @returns {Object} $resource
       */
      function resourceFactory(url, params, actions, options) {

        var resource,
            resParams  = extend({}, copy(provider.defaults.params), params),
            resActions = extend({}, copy(provider.defaults.actions), actions);

        url = (provider.defaults.baseUrl || '') + url;

        resource = $resource(url, resParams, resActions, options);

        //Exposed methods
        resource.method = method;
        resource.static = staticMethod;

        init();

        return resource;

        ////////////////////////////////////////////////////////////

        function init() {

          //resolve our ^ parameters
          resolveParentParams(resParams, resource);
          addResponseTransformers(resActions, resource);

          //add default methods/statics
          forEach(provider.defaults.methods, function (func, key) {
            resource.method(key, func);
          });
          forEach(provider.defaults.statics, function (func, key) {
            resource.static(key, func);
          });

          resource.static('getFull', getFull);
          resource.$relationships = {};
        }

        /**
         * Does a GET but also resolves sub-resources
         * @param getParams {Object} standard $http GET params
         * @param relatedResourcesNames {string[]} names of the related resources to query for
         * @public
         * @instance
         */
        function getFull(getParams, relatedResourcesNames) {

          var deferred    = $q.defer(),
              prefix      = provider.defaults.relationPrefix,
              placeholder = extend(new this(), {
                '$promise': deferred.promise,
                '$ready': false
              });

          if (!relatedResourcesNames) {
            relatedResourcesNames = Object.keys(resource.$relationships);
          }

          deferred.promise = this.get(getParams).$promise.then(gotParentResults);

          function gotParentResults(resource) {

            //if this $resource has related resources
            if (resource.$relationships) {

              //go through the related resources we were asked to grab
              $q.all(forEach(relatedResourcesNames, function (name) {

                //run their queries and assign the prefixed results to the parent
                return resource.$relationships[name].query().$promise
                  .then(function gotRelatedResults(relatedResults) {
                    resource[prefix + name] = relatedResults;
                    return resource;
                  });
              }));
            }

          }

          return placeholder;
        }
      }

      return resourceFactory;
    }

    // DEFAULT EXTENSIONS
    ////////////////////////////////////////////////////////////

    /**
     * Adds a sub-resource to this $resource
     * @param name {string}
     * @param resource {Object}
     * @public
     * @static
     * @returns {$resource_.relate}
     */
    function relate(name, resource) {
      this.$relationships[name] = resource;
      return this;
    }

    /**
     * Sets/Gets related resources
     * @param [relationships] {Object} hash of related resource factories
     * @public
     * @static
     * @return {*}
     */
    function relationships(relationships) {
      this.$relationships = relationships;
      return this;
    }

    // EXTENDER METHODS
    ////////////////////////////////////////////////////////////

    /**
     * Adds a Method to this $resource. Methods operate on instantiated objects from your $resource.
     * @param arg1 {string|Object|Object[]} A key-value pair containing method name and definition OR an array of
     * key value pairs OR the method name (definition on the next param)
     * @param [func] {Function} if the first parameter is a string of the method name, this parameter will be used as
     * the definition
     * @public
     * @returns {_resource.method}
     */
    function method(arg1, func) {
      extender(this.prototype, arg1, func);
      return this;
    }

    /**
     * Adds a "static" method to this $resource. Statics operate on the non-instantiated version of your $resource
     * @param arg1 {string|Object|Object[]} A key-value pair containing method name and definition OR an array of
     * key value pairs OR the method name (definition on the next param)
     * @param [func] {Function} if the first parameter is a string of the method name, this parameter will be used as
     * the definition
     * @public
     * @returns {*}
     */
    function staticMethod(arg1, func) {
      extender(this, arg1, func);
      return this;
    }


    // PRIVATES
    ////////////////////////////////////////////////////////////

    /**
     * Helper function that extends a provided object with method arrays, hash or string/method value.
     * @param src Object to be extended
     * @param arg1 {string|Object|Object[]} A key-value pair containing method name and definition OR an array of
     * key value pairs OR the method name (definition on the next param)
     * @param [func] {Function} if @arg1 is a string of the method name, this parameter will be used as
     * the definition
     * @private
     */
    function extender(src, arg1, func) {
      if (isString(arg1)) {
        src[arg1] = func;
      }
      else if (isArray(arg1)) {
        forEach(arg1, function (method) {
          extend(src, method);
        });
      }
      else if (isObject(arg1)) {
        extend(src, arg1);
      }
    }

    /**
     * Special response transformer that first runs the user defined transformer and then our own to attach
     * our related resources.
     * @param actions {Object} actions hash to have response transformers added.
     * @param resource {Object}
     * @private
     * @returns {Object} actions hash with added response transformers.
     */
    function addResponseTransformers(actions, resource) {
      forEach(actions, function (action) {
        action.transformResponse = responseTransforms(action.transformResponse, resource);
      });

      return actions;
    }

    /**
     * Response transformer that first calls the user defined transform and then applies our own (which adds the
     * $relationships)
     * @param otherTransform {Function}
     * @param resource {Object}
     * @private
     * @returns {Function}
     */
    function responseTransforms(otherTransform, parentResource) {

      return function transformResponse(response) {
        if (otherTransform) {
          response = otherTransform(response);
        }
        else {
          response = (response ? angular.fromJson(response) : {});
        }

        if (isArray(response)) {
          forEach(response, function (entry) {
            attachRelations(entry, parentResource.$relationships);
          })
        }
        else {
          attachRelations(response, parentResource.$relationships);
        }

        return response;
      };

    }

    /**
     * Attaches related $resource_s to this instantiated $resource_.
     * @param entry {*}
     * @param relationships {Object} hash of related $resource_s to be added to this $resource_
     * @private
     */
    function attachRelations(entry, relationships) {

      if (!entry.$relationships) {
        entry.$relationships = {};
      }

      forEach(relationships, function (relatedResource, name) {
        var params = {};
        forEach(relatedResource.$$parentMap, function (map, key) {
          params[key] = lookupDottedPath(entry, map);
        });
        entry.$relationships[name] = relatedResource.bind(params);
      });

    }

    /**
     * Finds parameters that need to map to a parent $resource and attaches a function that will fetch the parent's
     * value for that param.
     * @param params {Object}
     * @param resource {Object}
     * @private
     * @returns {Object}
     */
    function resolveParentParams(params, resource) {

      var ret = {};
      resource.$$parentMap = {};

      forEach(params, function (param, key) {
        if (param.charAt && param.charAt(0) == '^') {
          resource.$$parentMap[key] = param.substr(1);
        }
        ret[key] = param;
      });

      params = ret;
      return params;
    }


    //FROM ANGULAR 1.3
    ////////////////////////////////////////////////////////////
    var MEMBER_NAME_REGEX = /^(\.[a-zA-Z_$][0-9a-zA-Z_$]*)+$/;

    function isValidDottedPath(path) {

      return (path != null && path !== '' && path !== 'hasOwnProperty' &&
      MEMBER_NAME_REGEX.test('.' + path));
    }

    function lookupDottedPath(obj, path) {
      if (!isValidDottedPath(path)) {
        throw new Error('Dotted member path is invalid.', path);
      }

      var keys = path.split('.');
      for (var i = 0, ii = keys.length; i < ii && obj !== undefined; i++) {
        var key = keys[i];
        obj = (obj !== null) ? obj[key] : undefined;
      }
      return obj;
    }

  }


})(angular);

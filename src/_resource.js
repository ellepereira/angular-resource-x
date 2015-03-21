(function (angular) {

  'use strict';

  angular
    .module('resourceExtend', ['ngResource'])
    .provider('_resource', _resource);

  var forEach = angular.forEach,
    extend = angular.extend,
    copy = angular.copy,
    isObject = angular.isObject,
    isString = angular.isString,
    isArray = angular.isArray;

  /**
   * $resource utilities extension.
   * Adds extensibility and child resources to the Angular $resource module.
   * @class
   */
  function _resource() {

    var provider = this;
    provider.$get = $get;

    //defaults holds all the configs
    provider.defaults = {
      'baseUrl': null,
      'childPrefix': '-',
      'extensions': null,
      'statics': {
        'child': child,
        'getWithChildren': getWithChildren
      },
      'params': {},
      'methods': null,
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
       * Wrapper for $resource. Creates a $resource and adds default methods/statics/extensions
       * @param url {string} URL of this $resource
       * @param params {Object} hash of parameters, same as $resource but modified to support ^ to map to parent properties.
       * @param actions {Object} hash of actions, see $resource documentation
       * @param options {Object} hash of options, see $resource documentation
       * @public
       * @returns {Object} $resource
       */
      function resourceFactory(url, params, actions, options) {

        var resource,
          resParams = extend({}, provider.defaults.params, params),
          resActions = extend({}, provider.defaults.actions, actions);

        url = (provider.defaults.baseUrl || '') + url;

        resource = $resource(url, resParams, resActions, options);

        //Exposed methods
        resource.method = method;
        resource.static = staticMethod;
        resource.extend = extendMethod;

        init();

        return resource;

        ////////////////////////////////////////////////////////////

        function init() {

          //resolve our ^ parameters
          resolveParentParams(resParams, resource);
          addResponseTransformers(resActions, resource);

          //add default extensions/methods/statics
          forEach(provider.defaults.extensions, function (func, key) {
            resource.extend(key, func);
          });
          forEach(provider.defaults.methods, function (func, key) {
            resource.method(key, func);
          });
          forEach(provider.defaults.statics, function (func, key) {
            resource.static(key, func);
          });
        }
      }

      return resourceFactory;
    }

    // DEFAULT EXTENSIONS
    ////////////////////////////////////////////////////////////

    /**
     * Adds a sub-resource to this $resource
     * @param name {string}
     * @param child {Object}
     * @public
     * @static
     * @returns {_resource.child}
     */
    function child(name, child) {
      this.$children = this.$children || {};
      this.$children[name] = child;
      return this;
    }

    /**
     * Does a GET but also resolves sub-resources
     * @param getParams {Object} standard $http GET params
     * @param childrenNames {string[]} names of the child resources to query for
     * @public
     * @instance
     */
    function getWithChildren(getParams, childrenNames) {

      var deferred = $q.defer(),
        prefix = provider.defaults.childPrefix,
        placeholder = extend(new this(), {
          '$promise': deferred.promise,
          '$ready': false
        });

      deferred.promise = this.get(getParams).$promise.then(gotParentResults);

      function gotParentResults(parent) {

        //if this $resource has children
        if (parent.$children) {

          //go through the children we were asked to grab
          $q.all(forEach(childrenNames, function (childName) {

            //run their queries and assign the prefixed results to the parent
            return parent.$children[childName].query().$promise
              .then(function gotChildResults(child) {
                parent[prefix + childName] = child;
                return parent;
              });
          }));
        }

      }

      return placeholder;
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

    /**
     * Adds both a "static" and "method" extension to this  $resource. These methods work on both instantiated and
     * non-instantiated $resources.
     * @param arg1 {string|Object|Object[]} A key-value pair containing method name and definition OR an array of
     * key value pairs OR the method name (definition on the next param)
     * @param [func] {Function} if the first parameter is a string of the method name, this parameter will be used as
     * the definition
     * @public
     * @returns {*}
     */
    function extendMethod(arg1, func) {
      this.method(arg1, func);
      this.static(arg1, func);
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
      else if (isObject(arg1)) {
        extend(src, arg1);
      }
      else if (isArray(arg1)) {
        forEach(arg1, function (method) {
          extend(src, method);
        });
      }
    }

    /**
     * Special response transformer that first runs the user defined transformer and then our own to attach
     * our children.
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
     * $children)
     * @param otherTransform {Function}
     * @param parent {Object}
     * @private
     * @returns {Function}
     */
    function responseTransforms(otherTransform, parent) {

      return function transformResponse(response) {
        if (otherTransform) {
          response = otherTransform(response);
        }
        else {
          response = (response ? angular.fromJson(response) : {});
        }

        if (isArray(response)) {
          forEach(response, function (entry) {
            attachChildren(entry, parent.$children);
          })
        }
        else {
          attachChildren(response, parent.$children);
        }

        return response;
      };

    }

    /**
     * Attaches children $resources to this instantiated $resource.
     * @param entry {*}
     * @param children {Object} hash of children $resources to be added to this $resource
     * @private
     */
    function attachChildren(entry, children) {

      if (!entry.$children) {
        entry.$children = {};
      }

      forEach(children, function (child, name) {
        var myChild = copy(child);
        myChild.prototype.$parent = entry;
        entry.$children[name] = myChild;
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
      forEach(params, function (param, key) {
        if (param.charAt && param.charAt(0) == '^') {
          params[key] = parentParamFunc(resource, param.substr(1));
        }
      });

      return params;
    }

    /**
     * Function is run every time our $resource is used and attempts to fetch the value for our $parent if one of our
     * parameters requires so.
     * @param obj
     * @param param
     * @private
     * @returns {Function}
     */
    function parentParamFunc(obj, param) {
      return function () {
        return lookupDottedPath(obj.prototype.$parent, param);
      };
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

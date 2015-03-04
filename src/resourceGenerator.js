(function(){

  'use strict';

  angular
    .module('resourceGenerator', ['ngResource'])
    .provider('ResourceGenerator', ResourceGenerator);

    /**
     * ResourceGenerator provider
     */
    function ResourceGenerator() {

      var _this = this;
      _this.$get = $get;
      _this.defaults = {
        'baseUrl' : null,
        'extensions': null,
        'statics': null,
        'params': {},
        'methods': {
          'getWithChildren' : getWithChildren
        }
      };

      $get.$inject = ['$resource', '$q', '$injector'];

      function $get($resource, $q, $injector){

        /**
         * ResourceGenerator Factory: Creates a resource definition with a few add-on methods to expand on $resource functionality.
         * @param {string} endpoint - the URL for this endpoint
         * @param {Object=} params - $resource like params for this endpoint
         * @param {Object=} subendpoints - an array of objects - each object containing:
         *                        {'name': (string), name for this subendpoint,
         *                        'endpoint': (string) url for this endpoint,
         *                        'params': standard $resource params,
         *                        'link':  {query_param_name: variable_on_parent}
         * @returns {*}
         */
        return function(endpoint, params, subendpoints) {

          var ready = $q.defer();
          var api = _this.defaults.baseUrl || '';

          function resolveParameters () {

            var funcParams = [].slice.call(arguments);
            var params = {};

            angular.forEach(funcParams, function (funcParam) {
              return angular.extend(params, (typeof funcParam === 'function') ? $injector.invoke(funcParam) : funcParam);
            });

            return params;
          }

          function subResourceGenerator(endpoint, parent) {

            var connectingQuery = {};
            var params = resolveParameters(endpoint.params);

            angular.forEach(endpoint.link, function(value, key){
              connectingQuery[key] = parent[value];
            });

            angular.extend(params, connectingQuery);

            return $resource(api + endpoint.url, params, {
              'update': {
                'method': 'PATCH'
              }
            });

          }

          function getResponseTransformer(subendpoints){
            return function(response){
              response = angular.fromJson(response);

              if(!response){
                return response;
              }

              if(angular.isArray(response)) {

                for(var i = 0; i < response.length; i++){

                  angular.forEach(subendpoints, function (endpoint){
                    var subEndpointName = (endpoint.name ? endpoint.name : endpoint.url.replace('/', ''));
                    response[i]['$'+subEndpointName] = subResourceGenerator(endpoint, response[i]);
                  });

                }
              }

              else{
                angular.forEach(subendpoints, function (endpoint){
                  var subEndpointName = (endpoint.name ? endpoint.name : endpoint.url.replace('/', ''));
                  response['$'+subEndpointName] = subResourceGenerator(endpoint, response);
                });
              }

              response.$ready = ready.promise;
              ready.resolve(response);
              return response;
            }

          }

          function extender(src, arg1, func){
            if(angular.isString(arg1)){
              src[arg1] = func;
            }
            else if(angular.isObject(arg1)){
              angular.extend(src, arg1);
            }
            else if(angular.isArray(arg1)){
              angular.forEach(arg1, function(method){
                angular.extend(src, method);
              });
            }
          }

          //combine default parameters with what the user passes in
          var parameters = resolveParameters(_this.defaults.params||{}, params);

          /**
           * Creates a $resource wrapped with extra functionality
           * @param  {string} URL of endpoint to create the resource for. Is parsed by $resource's parser.
           * @param {Object=} Hash of parameters to pass onto each request (or link with the URL router)
           * @param {Object=} Subendpoint hash, containing a list of models that will get attached to $resource using a "link"
           *                  query that will query subendpoints with a variable belonging to this endpoint.
           * @return {$resource}
           */

          var resource = $resource(api + endpoint, parameters, {
            'update': {
              'method': 'PATCH',
              'transformResponse': getResponseTransformer(subendpoints)
            },
            'get': {
              'method': 'GET',
              'transformResponse': getResponseTransformer(subendpoints)
            },
            'query': {
              'isArray': true,
              'method': 'GET',
              'transformResponse': getResponseTransformer(subendpoints)
            },
            'save': {
              'method': 'POST',
              'transformResponse': getResponseTransformer(subendpoints)
            },
            'options': {
              'method': 'OPTIONS'
            }
          });

          resource.$$config = {
            'url': endpoint,
            'params': parameters,
            'children': angular.forEach(subendpoints, function(subendpoint){ return subendpoint.name })
          };

          resource.method = function method(arg1, func){
            extender(resource.prototype, arg1, func);
            return this;
          };

          resource.static = function method(arg1, func){
            extender(resource, arg1, func);
            return this;
          };

          resource.extend = function extend(arg1, func){
            resource.method(arg1, func);
            resource.static(arg1, func);
            return this;
          };

          angular.forEach(_this.defaults.extensions, function(func, key){
            resource.extend(key, func);
          });
          angular.forEach(_this.defaults.methods, function(func, key){
            resource.method(key, func);
          });
          angular.forEach(_this.defaults.statics, function(func, key){
            resource.static(key, func);
          });

          return resource;
        }
      };

      function getWithChildren(getParams, children){

        var ret = new this({'$promise':null, '$resolved':false});
        children = children || this.$$config.children;

        ret.$promise = this.get(getParams).$promise.then(function(result){

          //send out requests for all the children
          return $q.all(angular.forEach(children, function(child){

            return result['$'+child].query().$promise.then(function(childResults){
              //once we fulfill a request, we assign the results back to the parent
              result['_'+child] = childResults;
              return result;
            });

          })).then(function(){
            //all promises resolved
            ret.$resolved = true;
            return angular.extend(ret, result);
            return result;
          }, function(err){
            //there was an issue
            ret.$resolved = true;
            return $q.reject(err);
          });
        });

        return ret;
      }


  }

})(angular);

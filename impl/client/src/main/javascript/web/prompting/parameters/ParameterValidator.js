/*! ******************************************************************************
 *
 * Pentaho
 *
 * Copyright (C) 2024 by Hitachi Vantara, LLC : http://www.pentaho.com
 *
 * Use of this software is governed by the Business Source License included
 * in the LICENSE.TXT file.
 *
 * Change Date: 2029-07-20
 ******************************************************************************/


/**
 * The ParameterValidator Class
 *
 * @name ParameterValidator
 * @class
 */
define(['cdf/lib/Base'],
    function (Base) {

      var addErrorToParameter = function (paramDefn, paramName, message) {
        var errorList = paramDefn.errors[paramName];
        if (!errorList) {
          errorList = [];
        }
        errorList.push(message);
        paramDefn.errors[paramName] = errorList;
      };

      var removeError = function (paramDefn, paramName) {
        var errorList = paramDefn.errors[paramName];
        if (errorList) {
          delete paramDefn.errors[paramName];
        }
      };

      var isValidValue = function (parameterValues, computedValue) {
        for(var i=0; i<parameterValues.length; i++) {
          if(computedValue == parameterValues[i].value) {
            // value is found
            return true;
          }
        }
        return false;
      };

      var isValidValues = function (parameterValues, computedValue) {
        for(var i=0; i<computedValue.length; i++) {
          if(!isValidValue(parameterValues, computedValue[i])) {
            // value not found
            return false;
          }
        }
        return true;
      };

      var setSelectedValue = function (paramDefn, currentParameter, untrustedValue, defaultValues) {
        if(currentParameter.values.length == 0 || (currentParameter.values.length == 1 && currentParameter.values[0].manuallySet)) {
          currentParameter.values[0] = {
            label: untrustedValue[0],
            selected: true,
            type: currentParameter.type,
            value: untrustedValue[0],
            manuallySet: true
          };
        } else {
          var parameterValue;
          if(currentParameter.multiSelect) {
            if(untrustedValue.length == 1 && "" == untrustedValue[0] && defaultValues[currentParameter.name]) {
              parameterValue = defaultValues[currentParameter.name].value;
            } else {
              parameterValue = untrustedValue;
            }
            for(var k=0; k<currentParameter.values.length; k++) {
              if(parameterValue.indexOf(currentParameter.values[k].value) != -1) {
                currentParameter.values[k].selected = true;
              }
            }
          } else {
            if("" == untrustedValue[0] && defaultValues[currentParameter.name]) {
              parameterValue = defaultValues[currentParameter.name].value[0];
            } else {
              parameterValue = untrustedValue[0];
            }
            for(var k=0; k<currentParameter.values.length; k++) {
              if(parameterValue == currentParameter.values[k].value) {
                currentParameter.values[k].selected = true;
                break;
              }
            }
          }
        }
      };

      return Base.extend({

        validateSingleParameter: function (paramDefn, paramName, untrustedValue, defaultValues) {
          var currentParameter = paramDefn.getParameter(paramName);
          // remove error, if any
          removeError(paramDefn, currentParameter.name);

          // validate untrusted parameter value
          if(currentParameter.mandatory) {
            if(typeof untrustedValue == 'undefined') {
              // add error
              addErrorToParameter(paramDefn, paramName, "This prompt value is of an invalid value");
            } else if(untrustedValue == ''){
              addErrorToParameter(paramDefn, paramName, "This prompt is mandatory");
            }
          }
          var values = [];
          if(typeof untrustedValue == 'undefined') {
            values.push('');
          } else if(currentParameter.multiSelect) {
            untrustedValue.forEach(function(value) {
              values.push(value);
            });
          } else {
            values.push(untrustedValue);
          }
          if(currentParameter.strict) {
            if(!isValidValues(currentParameter.values, values)) {
              // add error
              addErrorToParameter(paramDefn, paramName, "This prompt value is of an invalid value");
            }
          }

          // restore default selections before setting values
          for(var k=0; k<currentParameter.values.length; k++) {
            currentParameter.values[k].selected = false;
          }
          // all validations passed, set values
          setSelectedValue(paramDefn, currentParameter, values, defaultValues);
        },

        checkParametersErrors: function (paramDefn) {
          var hasErrors = false;
          for(var i=0; i<paramDefn.parameterGroups.length; i++) {
            for(var j=0; j<paramDefn.parameterGroups[i].parameters.length; j++) {
              var errorList = paramDefn.errors[paramDefn.parameterGroups[i].parameters[j].name];
              if (errorList) {
                hasErrors = true;
                if(!paramDefn.promptNeeded) {
                  paramDefn.promptNeeded = true;
                }
                break;
              }
            }
          }
          if(!hasErrors) {
            // no errors at all, show the report
            paramDefn.promptNeeded = false;
          }
        }
      });
    }
);

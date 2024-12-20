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

define([
  "pentaho/module!_",
  "./AbstractProperty",
  "./ExternalMapping",
  "./Mode",
  "../KeyTypes",
  "pentaho/module/subtypesOf!pentaho/visual/role/adaptation/Strategy",
  "pentaho/i18n!messages",
  "pentaho/type/loader",
  "pentaho/type/ValidationError",
  "pentaho/data/TableView",
  "pentaho/type/util",
  "pentaho/util/object",
  "pentaho/util/arg"
], function(module, AbstractProperty, ExternalMapping, Mode, VisualKeyTypes, allStrategyCtorsList,
            bundle, typeLoader, ValidationError, DataView, typeUtil, O, arg) {

  "use strict";

  var allStrategiesTypes = allStrategyCtorsList
    .filter(function(Strategy) { return Strategy.type.isBrowsable; })
    .map(function(Strategy) { return Strategy.type; });

  var ListOfModeType = typeLoader.resolveType([Mode]);

  // NOTE: these will be kept private until it is decided between the model adapter and the viz concept.

  /**
   * @name pentaho.visual.role.ExternalPropertyType
   * @class
   * @extends pentaho.visual.role.AbstractPropertyType
   *
   * @private
   *
   * @classDesc The type class of {@link pentaho.visual.role.ExternalProperty}.
   */

  /**
   * @name pentaho.visual.role.ExternalProperty
   * @class
   * @extends pentaho.visual.role.AbstractProperty
   *
   * @private
   *
   * @amd pentaho/visual/role/ExternalProperty
   *
   * @classDesc The `ExternalProperty` class represents a visual role of a visualization as seen from the outside.
   *
   * The [valueType]{@link pentaho.type.PropertyType#valueType}
   * of a property of this type is {@link pentaho.visual.role.ExternalMapping}.
   *
   * @description This class was not designed to be constructed directly.
   */
  var ExternalProperty = AbstractProperty.extend(/** @lends pentaho.visual.role.ExternalProperty# */{

    $type: /** @lends pentaho.visual.role.ExternalPropertyType# */{

      id: module.id,

      valueType: ExternalMapping,

      /** @inheritDoc */
      _init: function(spec, keyArgs) {

        spec = this.base(spec, keyArgs) || spec;

        var declaringType = this.declaringType;
        if(declaringType !== null) {
          var internalModelType = declaringType.get("model").valueType;
          var internalProperty = internalModelType.get(this.name);

          O.setConst(this, "_internalProperty", internalProperty);

          this.label = internalProperty.label;
          this.description = internalProperty.description;
          this.ordinal = internalProperty.ordinal;
          this.category = internalProperty.category;
          this.helpUrl = internalProperty.helpUrl;
          this.isBrowsable = internalProperty.isBrowsable;
        }

        if(this.isRoot) {
          // Assume root default values.

          // Anticipate setting `strategies`.
          var strategies = spec.strategies;
          if(strategies == null) {
            // Set even if allStrategies is empty, as this initializes the data structures.
            this.__setStrategyTypes(allStrategiesTypes, /* isDefault: */true);
          }
        }

        return spec;
      },

      // region _internalProperty
      /**
       * Gets the corresponding internal visual role property type.
       *
       * @type {pentaho.visual.role.PropertyType}
       * @readOnly
       * @protected
       */
      _internalProperty: null,
      // endregion

      // @override
      get isVisualKey() {
        return this._internalProperty.isVisualKey;
      },

      // @override
      isApplicableOn: function(modelAdapter) {
        return this.base(modelAdapter) && this._internalProperty.isApplicableOn(modelAdapter.model);
      },

      // region fields
      /**
       * Gets the metadata about the fields property of mappings of this visual role property.
       *
       * @type {pentaho.visual.role.IFieldsMetadata}
       * @readOnly
       * @override
       */
      get fields() {
        var fields = O.getOwn(this, "__fields");
        if(!fields) {

          var propType = this;

          this.__fields = fields = Object.freeze({
            countRangeOn: function(model, keyArgs) {
              return propType.__fieldsCountRangeOn(model, keyArgs);
            }
          });
        }

        return fields;
      },

      /**
       * The property is required if its internal property is required.
       * The property is a list if its current mode is a list or, when there is no current mode,
       * if it has any list modes.
       *
       * Implements IFieldsMetadata#countRangeOn.
       *
       * @param {pentaho.visual.ModelAdapter} modelAdapter - The model adapter.
       * @param {object} [keyArgs] - The keyword arguments object.
       * @param {boolean} [keyArgs.ignoreCurrentMode=false] - Indicates that the current mode, if any,
       *   should be ignored when determining the count range.
       *   When `false` and there is a current mode, the count range is that of the current mode.
       *
       * @return {pentaho.IRange<number>} The field count range.
       * @private
       */
      __fieldsCountRangeOn: function(modelAdapter, keyArgs) {

        var internalCountRange = this._internalProperty.fields.countRangeOn(modelAdapter.model, keyArgs);

        // The internal countRange (both min and max) is valid externally when
        // all of the possible strategies are "identity" strategies.
        if(this.__areAllStrategyApplicationsIdentity) {
          return internalCountRange;
        }

        // Otherwise, only min can be used, partially.

        var mode = null;

        if(!arg.optional(keyArgs, "ignoreCurrentMode", false)) {
          // In unit-tests, these properties are used outside of a real model.
          // So externalMapping can be null.
          var externalMapping = modelAdapter.get(this);
          mode = externalMapping && externalMapping.mode;
        }

        var countMax = (mode !== null ? mode.dataType.isList : this.hasAnyListModes) ? Infinity : 1;

        return {min: internalCountRange.min > 0 ? 1 : 0, max: countMax};
      },

      /**
       * Gets a value that indicates that all of the strategy types of
       * the current strategy type applications are identities.
       *
       * @type {boolean}
       * @readOnly
       * @private
       * @see pentaho.visual.role.ExternalPropertyType#__strategyTypeApplicationList
       * @see pentaho.visual.role.adaptation.IStrategyApplication#strategyType
       * @see pentaho.visual.role.adaptation.StrategyType#isIdentity
       */
      get __areAllStrategyApplicationsIdentity() {
        var strategyTypeAppList = this.__strategyTypeApplicationList;
        if(strategyTypeAppList === null) {
          return true;
        }

        return strategyTypeAppList.every(function(strategyTypeApp) {
          return strategyTypeApp.strategyType.isIdentity;
        });
      },
      // endregion

      // region strategies & modes
      __modes: null,
      __strategyTypeList: null,
      __isStrategyTypesDefault: true,

      /**
       * List of a priori applicable strategy type applications,
       * along with corresponding internal and external modes.
       * These do not have the `addFields` and `externalFieldIndexes` properties defined yet.
       *
       * @type {Array.<pentaho.visual.role.adaptation.IStrategyApplication>}
       * @private
       */
      __strategyTypeApplicationList: null,

      /** @inheritDoc */
      get modes() {
        return this.__modes;
      },

      /**
       * Gets or sets the array of adaptation strategy types used to adapt the
       * fields mapped to the visual role to those required by one of its modes.
       *
       * Visual roles _should_ have at least one mapping strategy type.
       *
       * When set to a {@link Nully} value, the set operation is ignored.
       *
       * If not specified at the root [visual.role.Property]{@link pentaho.visual.role.ExternalProperty},
       * the `strategies` attribute is initialized with all registered
       * [strategy]{@link pentaho.visual.role.adaptation.Strategy} types
       * (registered as subtypes of the type `pentaho/visual/role/adaptation/strategy`).
       *
       * The Viz. API pre-registers the following standard strategy types, in the given order:
       * 1. [IdentityStrategy]{@link pentaho.visual.role.adaptation.IdentityStrategy}
       * 2. [CombineStrategy]{@link pentaho.visual.role.adaptation.CombineStrategy}
       * 3. [TupleStrategy]{@link pentaho.visual.role.adaptation.TupleStrategy}.
       *
       * The returned list or its elements should not be modified.
       *
       * @type {Array.<pentaho.visual.role.adaptation.StrategyType>}
       *
       * @throws {pentaho.lang.OperationInvalidError} When setting and the type already has
       * [subtypes]{@link pentaho.type.Type#hasDescendants}.
       */
      get strategies() {
        return this.__strategyTypeList;
      },

      set strategies(values) {

        this._assertNoSubtypesAttribute("strategies");

        if(values == null) return;

        this.__setStrategyTypes(values, /* isDefault: */false);
      },

      __setStrategyTypes: function(values, isDefault) {

        var strategyTypeList = [];
        var strategyTypeSet = Object.create(null);

        values.forEach(function(value) {
          var strategyType = typeLoader.resolveType(value).type;

          if(!O.hasOwn(strategyTypeSet, strategyType.uid)) {
            strategyTypeSet[strategyType.uid] = true;
            strategyTypeList.push(strategyType);
          }
        });

        // Collect strategies that apply, for each internal mode.
        // Determine external modes.

        var strategyTypeApplicationList = [];

        var externalModes = new ListOfModeType();

        var isVisualKeyEf = this.isVisualKeyEffective;

        this._internalProperty.modes.each(function(internalMode) {

          var isContinuous = internalMode.isContinuous;

          strategyTypeList.forEach(function(strategyType) {

            var inputType = strategyType.getInputTypeFor(internalMode.dataType, isVisualKeyEf);
            if(inputType != null) {

              var externalMode = new Mode({dataType: inputType, isContinuous: isContinuous});

              externalModes.add(externalMode);
              externalMode = externalModes.get(externalMode.$key);

              strategyTypeApplicationList.push(
                /** @type {pentaho.visual.role.adaptation.IStrategyApplication} */Object.freeze({
                  externalMode: externalMode,
                  strategyType: strategyType,
                  internalMode: internalMode
                }));
            }
          });
        });

        this.__modes = externalModes;

        this.__strategyTypeList = strategyTypeList;

        this.__isStrategyTypesDefault = !!isDefault;

        this.__strategyTypeApplicationList = strategyTypeApplicationList;
      },
      // endregion

      // region selectAdaptationStrategyOn
      /**
       * Selects a valid adaptation strategy method for the corresponding visual role of the given model adapter.
       *
       * If the current external mapping is such that its
       * [isCategoricalFixed]{@link pentaho.visual.role.ExternalMapping#isCategoricalFixed} is `true`,
       * then only the categorical modes of [internal modes]{@link pentaho.visual.role.PropertyType#modes}
       * are considered.
       * Otherwise, all internal modes are considered.
       *
       * @param {pentaho.visual.ModelAdapter} modelAdapter - The model adapter.
       *
       * @return {pentaho.visual.role.adaptation.IStrategyApplication} A valid strategy method application,
       * if one can be applied; `null`, otherwise.
       */
      selectAdaptationStrategyOn: function(modelAdapter) {

        var externalMapping = modelAdapter.get(this);
        if(!externalMapping.hasFields) {
          return null;
        }

        // Leave if no data or if there are any invalid external field names.
        var externalFieldIndexes = externalMapping.fieldIndexes;
        if(externalFieldIndexes === null) {
          return null;
        }

        var schemaData = modelAdapter.data;
        var strategyApplicationList = this.__strategyTypeApplicationList;
        var M = strategyApplicationList.length;
        var m = -1;
        var isCategoricalFixed = externalMapping.isCategoricalFixed;
        while(++m < M) {
          var strategyApplication = strategyApplicationList[m];
          if(!isCategoricalFixed || !strategyApplication.externalMode.isContinuous) {

            var validStrategyApplication = this.__validateStrategyApplication(
              strategyApplication, schemaData, externalFieldIndexes);

            if(validStrategyApplication !== null) {
              return validStrategyApplication;
            }
          }
        }

        return null;
      },

      /**
       * Performs basic validation that the external fields are compatible with the strategy's external data type,
       * and if so, calls the strategy type's own validation.
       *
       * @param {pentaho.visual.role.adaptation.IStrategyApplication} strategyApplication - The strategy type
       * application.
       * @param {pentaho.data.Table} schemaData - The schema data table.
       * @param {Array.<number>} externalFieldIndexes - The indexes of the external fields.
       *
       * @return {pentaho.visual.role.adaptation.IStrategyApplication} A valid strategy type application,
       * if the application is valid; `null`, otherwise.
       *
       * @private
       */
      __validateStrategyApplication: function(strategyApplication, schemaData, externalFieldIndexes) {

        var externalDataType = strategyApplication.externalMode.dataType;
        var externalFieldCount = externalFieldIndexes.length;

        // 1) Non-list input data types can only handle a single field.
        if(!externalDataType.isList && externalFieldCount > 1) {
          return null;
        }

        // 2) Compatible field data types.
        var externalElementDataType = externalDataType.elementType;
        var externalFieldIndex = -1;
        while(++externalFieldIndex < externalFieldCount) {
          var actualIndex = externalFieldIndexes[externalFieldIndex];
          var fieldDataType = typeLoader.resolveType(schemaData.getColumnType(actualIndex)).type;
          if(!fieldDataType.isSubtypeOf(externalElementDataType)) {
            return null;
          }
        }

        var validation = strategyApplication.strategyType.validateApplication(schemaData, externalFieldIndexes);
        if(!validation.isValid) {
          return null;
        }

        var result = Object.create(strategyApplication);
        result.externalFieldIndexes = externalFieldIndexes;
        result.addsFields = validation.addsFields;

        return /** @type {pentaho.visual.role.adaptation.IStrategyApplication} */Object.freeze(result);
      },
      // endregion

      // region Validation

      /**
       * Determines if this visual role is valid on the given visualization model.
       *
       * If base property validation fails, those errors are returned.
       *
       * Otherwise, validity is further determined as follows:
       *
       * 1. One of the registered strategies must be able to adapt the specified fields to one of the
       *    visual role's modes.
       *
       * @param {pentaho.visual.ModelAdapter} modelAdapter - The model adapter.
       *
       * @return {Array.<pentaho.type.ValidationError>} A non-empty array of `ValidationError` or `null`.
       */
      validateOn: function(modelAdapter) {

        var errors = this.base(modelAdapter);
        if(!errors) {
          var addErrors = function(newErrors) {
            errors = typeUtil.combineErrors(errors, newErrors);
          };

          var mapping = modelAdapter.get(this);

          // Can adapt.
          if(mapping.hasFields && mapping.strategy === null) {
            addErrors(new ValidationError(
              bundle.format(bundle.structured.errors.property.noStrategy, {role: this})));
          }

          // Validate internal property on internal model.
          // This enables a more complete single property validation.
          // On the other hand, we end up validating internal props twice when model itself is validated...
          addErrors(this._internalProperty.validateOn(modelAdapter.model));
        }

        return errors;
      },
      // endregion

      // region Serialization
      /** @inheritDoc */
      _fillSpecInContext: function(spec, keyArgs) {

        var any = this.base(spec, keyArgs);

        var strategyTypesList = O.getOwn(this, "__strategyTypeList");
        if(strategyTypesList && !this.__isStrategyTypesDefault) {
          any = true;
          spec.strategies = strategyTypesList.map(function(strategyType) {
            return strategyType.toSpecInContext(keyArgs);
          });
        }

        return any;
      }
      // endregion
    }
  })
  .configure();

  return ExternalProperty;
});

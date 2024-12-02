/*! ******************************************************************************
 *
 * Pentaho
 *
 * Copyright (C) 2024 by Hitachi Vantara, LLC : http://www.pentaho.com
 *
 * Use of this software is governed by the Business Source License included
 * in the LICENSE.TXT file.
 *
 * Change Date: 2028-08-13
 ******************************************************************************/

define([
  "pentaho/module!_",
  "./PointAbstract"
], function (module, BaseView) {

  "use strict";

  // "pentaho/visual/models/Dot"
  return BaseView.extend(module.id, {
    _cccClass: "DotChart"
  })
  .implement(module.config);
});
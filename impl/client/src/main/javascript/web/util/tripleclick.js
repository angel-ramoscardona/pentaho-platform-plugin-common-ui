/*!
* Copyright 2010 - 2017 Hitachi Vantara.  All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*
*/

// @author Rich Adams <rich@richadams.me>
// https://github.com/richadams/jquery-tripleclick
// Implements a triple-click event. Click (or touch) three times within 1s on the element to trigger.

;(function($)
{
    function tripleHandler(event)
    {
        var $elem = jQuery(this);

        // Get current values, or 0 if they don't yet exist.
        var clicks = $elem.data("triclick_clicks") || 0;
        var start  = $elem.data("triclick_start")  || 0;

        // If first click, register start time.
        if (clicks === 0) { start = event.timeStamp; }

        // If we have a start time, check it's within limit
        if (start != 0
            && event.timeStamp > start + 1000)
        {
            // Tri-click failed, took too long.
            clicks = 0;
            start  = event.timeStamp;
        }

        // Increment counter, and do finish action.
        clicks += 1;
        if (clicks === 3)
        {
            clicks     = 0;
            start      = 0;
            event.type = "tripleclick";

            // Let jQuery handle the triggering of "tripleclick" event handlers
            jQuery.event.handle.apply(this, arguments);
        }

        // Update object data
        $elem.data("triclick_clicks", clicks);
        $elem.data("triclick_start",  start);
    }

    var tripleclick = $.event.special.tripleclick =
    {
        setup: function(data, namespaces)
        {
            $(this).bind("touchstart click.triple", tripleHandler);
        },
        teardown: function(namespaces)
        {
            $(this).unbind("touchstart click.triple", tripleHandler);
        }
    };
})(jQuery);

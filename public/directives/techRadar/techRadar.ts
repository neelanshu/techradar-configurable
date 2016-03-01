interface String {
    trunc(length: number): String;
}

//    declare var String;

/**
 * Truncate the string.
 * @param n: string length
 */
String.prototype.trunc = function(n) {
    'use strict'
    // If n=6 and
    //   length > 6, substr(0,n-2) + ...
    return this.length <= n
        ? this.substr(0, n)
        : this.substr(0, n - 1) + '\u2026';
};

module TechRadar {
    'use strict'
    /**
      * Config
      */
    var moduleName = 'techRadar.techRadarChart';

    /**
      * Module
      */
    export var myModule;
    try {
        myModule = angular.module(moduleName);
    } catch (err) {
        // named module does not exist, so create one
        myModule = angular.module(moduleName, []);
    }

    export interface RenderOptions {
        time?    : string;
        category?: string;
        prio?   : {[prio:number]:boolean}
    }

    export interface ITechRadarChartScope extends ng.IScope {
        technologies: Technology[];
        options: RenderOptions;
        searchterm: string;
        prioritylevel: number;
        /**
         * Start angle in degrees (0 degrees is North).
         * @type {number}
         */
        startangle?: number;
        /**
         * End angle in degrees (0 degrees is North).
         * @type {[type]}
         */
        endangle?: number;
        radius?: number;
        innerradius?: number;
        margin?: { top: number; right: number; bottom: number; left: number; };
        render(technologies: Technology[], renderOptions?: RenderOptions): void;
        setItemVisibility(technologies: Technology, isVisible: boolean): void;
    }

    /**
      * Directive to create a sparkline chart.
      *
      * @seealso: http://odiseo.net/angularjs/proper-use-of-d3-js-with-angular-directives
      * @seealso: http://cmaurer.github.io/angularjs-nvd3-directives/sparkline.chart.html
      * @seealso: http://www.tnoda.com/blog/2013-12-19
      */
    myModule
        .directive('techRadarChart', ['$filter', 'busService',
            function($filter: ng.IFilterService, bus: csComp.Services.MessageBusService): ng.IDirective {
                return {
                    terminal: true,       // do not compile any other internal directives
                    restrict: 'EA',       // E = elements, other options are A=attributes and C=classes
                    transclude: true,
                    scope: {
                        technologies: '=',  // = means that we use angular to evaluate the expression,
                        options: '=',
                        searchterm: '=',
                        prioritylevel: '=',
                        startangle: '@',  // In degrees, 0 is north
                        endangle: '@',
                        radius: '@',  // the value is used as is
                        innerradius: '@',
                        margin: '@'
                    },
                    link: function(scope: ITechRadarChartScope, element, attrs) {
                        const rad2deg = 180 / Math.PI;
                        var parent = $(element[0]).parent();
                        var margin = scope.margin || { top: 15, right: 25, bottom: 15, left: 25 };
                        var outerRadius = scope.radius || Math.floor(parent.width() / 2) - margin.left - margin.right;
                        var innerRadius = scope.innerradius || 75;
                        var startAngle = scope.startangle ? scope.startangle / rad2deg : -Math.PI / 2;
                        var endAngle = scope.endangle ? scope.endangle / rad2deg : Math.PI / 2;
                        var cursorTextHeight = 12;// + (showAxis ? 5 : 0); // leave room for the cursor text (timestamp | measurement)

                        var actualWidth = 2 * outerRadius + margin.left + margin.right;
                        var actualHeight = 2 * outerRadius + margin.top + margin.bottom;

                        // http://stackoverflow.com/questions/14167863/how-can-i-bring-a-circle-to-the-front-with-d3
                        d3.selection.prototype.moveToFront = function() {
                            return this.each(function() {
                                this.parentNode.appendChild(this);
                            });
                        };

                        var wrap = ((text, width) => {
                            text.each(function() {
                                var text = d3.select(this),
                                    words = text.text().split(/\s+/).reverse(),
                                    word,
                                    line = [],
                                    lineNumber = 0,
                                    lineHeight = 0.9, // ems
                                    y = text.attr("y"),
                                    dy = parseFloat(text.attr("dy")),
                                    tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
                                while (word = words.pop()) {
                                    line.push(word);
                                    tspan.text(line.join(" "));
                                    if ((<any>tspan.node()).getComputedTextLength() > width) {
                                        line.pop();
                                        tspan.text(line.join(" "));
                                        line = [word];
                                        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                                    }
                                }
                            });
                        });

                        var priorityFill = ((prio) => {
                            switch (parseInt(prio)) {
                                case 1: return "#F39092"; break;
                                case 2: return "#9EBACB"; break;
                                case 3: return "#F5DC8F"; break;
                                default: return "#DFE0DC"; break;
                            }
                        });

                        var priorityStroke = ((prio) => {
                            switch (prio) {
                                case "1": return "#CC3A31"; break;
                                case "2": return "#9193AF"; break;
                                case "3": return "yellow"; break;
                                default: return "gray"; break;
                            }
                        })

                        scope.render = function(technologies: Technology[], renderOptions?: RenderOptions) {
                            d3.select(element[0]).selectAll("*").remove();
                            var chart = d3.select(element[0])
                                .append('svg:svg')
                                .attr('width', actualWidth)
                                .attr('height', actualHeight)
                                .append("g")
                                .attr("transform", "translate(" + actualWidth / 2 + "," + actualHeight / 2 + ")");

                            var categories: string[] = [];
                            var categoriesInfo: {
                                [category: string]: {
                                    count: number;
                                    startAngle: number;
                                    endAngle: number;
                                    innerRadius: number;
                                    outerRadius: number;
                                }
                            } = {};
                            var allPeriods: string[] = [];
                            var periods: string[] = [];
                            var periodsInfo: {
                                [period: string]: {
                                    count: number;
                                    innerRadius: number;
                                    outerRadius: number;
                                }
                            } = {};
                            var catPeriodsInfo: {
                                [catPeriod: string]: {
                                    index: number;
                                    count: number;
                                    lastUsedRadius: number;
                                }
                            } = {};
                            var filteredTechnologies: Technology[] = [];

                            technologies.forEach((t) => {
                                var include = true;
                                if (renderOptions.time && t.timePeriod != renderOptions.time) include = false;
                                if (renderOptions.category && t.category != renderOptions.category) include = false;
                                //if (renderOptions.prio && !renderOptions.prio[t.priority]) include = false;
                                if (include) filteredTechnologies.push(t);
                            });

                            // Commented since changing the order of the technologies also effects the order of the time categories.
                            // filteredTechnologies = filteredTechnologies.sort((x:Technology, y:Technology)=>{
                            //     return d3.ascending(x.priority, y.priority);
                            // });

                            // Create the set of possible colors
                            var color = d3.scale.category20c();
                            var index = 0;
                            technologies.forEach((t) => {
                                if (allPeriods.indexOf(t.timePeriod) >= 0) return;
                                allPeriods.push(t.timePeriod);
                                color(index++); // here, we make sure that the color range is always the same
                            });

                            filteredTechnologies.forEach((t) => {
                                if (categories.indexOf(t.category) < 0) {
                                    categories.push(t.category);
                                    categoriesInfo[t.category] = { count: 1, startAngle: 0, endAngle: 0, innerRadius: 0, outerRadius: 0 };
                                } else {
                                    categoriesInfo[t.category].count++;
                                }
                                if (periods.indexOf(t.timePeriod) < 0) {
                                    periods.push(t.timePeriod);
                                    periodsInfo[t.timePeriod] = { count: 1, innerRadius: 0, outerRadius: 0 };
                                } else {
                                    periodsInfo[t.timePeriod].count++;
                                }
                                var cp = t.category + '-' + t.timePeriod;
                                if (!catPeriodsInfo.hasOwnProperty(cp))
                                    catPeriodsInfo[cp] = { index: 0, count: 1, lastUsedRadius: 0 };
                                else
                                    catPeriodsInfo[cp].count++;
                            });

                            // Draw the rings
                            var totalTech = filteredTechnologies.length;
                            var curRadius = innerRadius;
                            var curCount = 0;
                            periods.forEach((period) => {
                                curCount += periodsInfo[period].count;
                                var innerR = curRadius;
                                // (outerR^2-innerR^2) / (outerRadius^2-innerRadius^2) = curCount / totalTech
                                // (outerR^2-innerR^2) = (outerRadius^2-innerRadius^2) * curCount / totalTech
                                //  outerR = sqrt(innerR^2 + (outerRadius^2-innerRadius^2) * curCount / totalTech)
                                var outerR = curRadius = Math.sqrt(innerRadius * innerRadius + (outerRadius * outerRadius - innerRadius * innerRadius) * curCount / totalTech);

                                periodsInfo[period].innerRadius = innerR;
                                periodsInfo[period].outerRadius = outerR;

                                var arc = d3.svg.arc()
                                    .innerRadius(innerR)
                                    .outerRadius(outerR)
                                    .startAngle(startAngle) //converting from degs to radians
                                    .endAngle(endAngle) //just radians

                                chart.append("path")
                                    .attr("d", arc)
                                    .attr("fill", color(allPeriods.indexOf(period)));

                                chart.append("text")
                                    .attr("transform", function(d) { return "translate(" + (curRadius - 5) + ", -5)"; })
                                    .attr("dy", "1.2em")
                                    .attr("text-anchor", "end")
                                    .attr("class", "period")
                                    .text(period)
                                    .on("mouseenter", function() {
                                        // Move to front if not already there
                                        var sel: any = d3.select(this);
                                        if (sel.attr("data-isatfront") === "true") return;
                                        sel.attr("data-isatfront", "true");
                                        sel.moveToFront();
                                    })
                                    .on("mouseleave", function() {
                                        // Remove attribute that we are at the front
                                        var sel: any = d3.select(this);
                                        sel.attr("data-isatfront", null);
                                    })
                                    .on("click", (t: Technology, i: number) => {
                                        scope.options.time = period;
                                        scope.render(technologies, scope.options);
                                    });
                            });

                            // Draw the lines denoting the segments
                            var curAngle = startAngle;
                            var totAngle = endAngle - startAngle;

                            categories.forEach((category) => {
                                categoriesInfo[category].startAngle = curAngle;
                                var textEl;
                                if (curAngle > Math.PI || curAngle < 0) {
                                    textEl = chart.append("text")
                                        .attr("transform",
                                        "translate(" + (Math.sin(curAngle) * (outerRadius - 5)) + "," + (-Math.cos(curAngle) * (outerRadius - 5) - 3) + ")" +
                                        "rotate(" + (90 + curAngle * rad2deg) + ")")
                                        .attr("text-anchor", "start")
                                        .attr("dy", -5)
                                        .attr("class", "category")
                                        .text(category);
                                } else {
                                    textEl = chart.append("text")
                                        .attr("transform",
                                        "translate(" + (Math.sin(curAngle) * (outerRadius - 5) - 5) + "," + (-Math.cos(curAngle) * (outerRadius - 5) + 3) + ")" +
                                        "rotate(" + (-90 + curAngle * rad2deg) + ")")
                                        .attr("dy", Math.cos(curAngle) * 0.4 + 1 + "em")   // dy = 1.2em when curAngle === 0, dy = 0.8em when curAngle === PI/2
                                        .attr("text-anchor", "end")
                                        .attr("class", "category")
                                        .text(category);
                                }
                                textEl
                                    .on("mouseenter", function() {
                                        // Move to front if not already there
                                        var sel: any = d3.select(this);
                                        if (sel.attr("data-isatfront") === "true") return;
                                        sel.attr("data-isatfront", "true");
                                        sel.moveToFront();
                                    })
                                    .on("mouseleave", function() {
                                        // Remove attribute that we are at the front
                                        var sel: any = d3.select(this);
                                        sel.attr("data-isatfront", null);
                                    })
                                    .on("click", (t: Technology, i: number) => {
                                        scope.options.category = category;
                                        scope.render(technologies, scope.options);
                                    }
                                    );

                                var x0 = + Math.sin(curAngle) * innerRadius,
                                    y0 = - Math.cos(curAngle) * innerRadius;
                                var x1 = + Math.sin(curAngle) * outerRadius,
                                    y1 = - Math.cos(curAngle) * outerRadius;
                                chart.append('line')
                                    .attr("x1", x0)
                                    .attr("y1", y0)
                                    .attr("x2", x1)
                                    .attr("y2", y1)
                                    .attr("stroke-width", 2)
                                    .attr("stroke", "black");
                                curAngle += totAngle * categoriesInfo[category].count / totalTech;
                                categoriesInfo[category].endAngle = curAngle;
                                var x0 = + Math.sin(curAngle) * innerRadius,
                                    y0 = - Math.cos(curAngle) * innerRadius;
                                var x2 = + Math.sin(curAngle) * outerRadius,
                                    y2 = - Math.cos(curAngle) * outerRadius;
                                chart.append('line')
                                    .attr("x1", x0)
                                    .attr("y1", y0)
                                    .attr("x2", x2)
                                    .attr("y2", y2)
                                    .attr("stroke-width", 2)
                                    .attr("stroke", "black");
                            });

                            // Draw the items
                            // Define the data for the circles
                            var elem = chart.selectAll("g")
                                .data(filteredTechnologies);

                            // Create and place the "blocks" containing the circle and the text
                            var items = elem
                                .enter()
                                .append("g")
                                .style('display', ((t: Technology) => { return t.visible ? "block" : "none" }))
                                .attr("id", function(t: Technology) { return "technology_item" + t.id })
                                .attr('class', 'shortTitle');

                            items.transition()
                                .delay(function(d, i) { return i * 5 })
                                .duration(500)
                                .attr("transform", function(t: Technology) {
                                    var categoryInfo = categoriesInfo[t.category];
                                    var periodInfo = periodsInfo[t.timePeriod];
                                    var catPeriodInfo = catPeriodsInfo[t.category + '-' + t.timePeriod];
                                    var angle = categoryInfo.startAngle + 0.1 + (catPeriodInfo.index++ / catPeriodInfo.count) * (categoryInfo.endAngle - categoryInfo.startAngle);
                                    if (!t.relativeRadius)
                                        t.relativeRadius = catPeriodInfo.lastUsedRadius < 0.5 ? 0.75 : 0.25;
                                    var radius = periodInfo.innerRadius + Math.max(0.1, Math.min(0.9, t.relativeRadius)) * (periodInfo.outerRadius - periodInfo.innerRadius);
                                    catPeriodInfo.lastUsedRadius = t.relativeRadius;
                                    var x = Math.sin(angle) * radius;
                                    var y = -Math.cos(angle) * radius;
                                    return "translate(" + x + "," + y + ")";
                                });

                            // add drop shadow circle
                            items.append("circle")
                                .attr("cx", "2")
                                .attr("cy", "2")
                                .attr("class", "item-container-drop-shadow")
                                .style("fill-opacity", 0.5)
                                .style("fill", "black")
                                .attr("r", 25);

                            // add background circle
                            items.append("circle")
                                .attr("cx", "0")
                                .attr("cy", "0")
                                .attr("class", "item-container")
                                .style("fill", function(t: Technology) { return t.color; })
                                .style("stroke", function(t: Technology) { return priorityStroke(t.priority) })
                                .attr("r", 25);

                            items.append("text")
                                .attr("font-family", "FontAwesome")
                                .attr("dx", 0)
                                .attr("dy", '-0.5em')
                                .attr("text-anchor", "middle")
                                .attr("font-size", function(t: Technology) { return FontAwesomeUtils.FontAwesomeConverter.convertToSize(t.thumbnail); })
                                .attr("class", function(t: Technology) { return t.thumbnail.toLowerCase() || "thumbnail"; })
                                .text(function(t: Technology) { return FontAwesomeUtils.FontAwesomeConverter.convertToCharacter(t.thumbnail); });

                            // Attach appropriate click and move to front behaviour
                            // See als http://stackoverflow.com/questions/3686132/move-active-element-loses-mouseout-event-in-internet-explorer
                            items
                                .on("mouseenter", function() {
                                    // Move to front if not already there
                                    var sel: any = d3.select(this);
                                    if (sel.attr("data-isatfront") === "true") return;
                                    sel.attr("data-isatfront", "true");
                                    sel.moveToFront();
                                })
                                .on("mouseleave", function() {
                                    // Remove attribute that we are at the front
                                    var sel: any = d3.select(this);
                                    sel.attr("data-isatfront", null);
                                })
                                .on("click", function(t: Technology, i: number) {
                                    bus.publish('technology', 'selected', t);
                                });

                            // Create the short title for each technology
                            items.append("text")
                                .attr("dx", 0)
                                .attr("dy", '0.5em')
                                .attr("text-anchor", "middle")
                                .attr("font-size", "12px")
                                .text(function(t: Technology, i: number) { return t.shortTitle.trunc(7) });
                            //.call(wrap, 50);

                            // Create the Font Awesome icon
                            // items.append("text")
                            //     .attr("dy", '1.7em')
                            //     .attr("font-family", "FontAwesome")
                            //     //.attr("font-size", function(t: Technology) { return FontAwesomeUtils.FontAwesomeConverter.convertToSize(t.thumbnail); })
                            //     .attr("fill", "black")
                            //     .attr("text-anchor", "middle")
                            //     .attr("class", function(t: Technology) { return t.thumbnail.toLowerCase() || "thumbnail"; })
                            //     .text(function(t: Technology) { return FontAwesomeUtils.FontAwesomeConverter.convertToCharacter(t.thumbnail); });

                            // In case we are looking at details, add a back arrow to return to the main view
                            if (renderOptions && (renderOptions.time || renderOptions.category)) {
                                chart.append("text")
                                    .attr("x", 0)
                                    .attr("y", 25) // Since alignment-baseline does not work in IE
                                    //.attr("alignment-baseline", "central")
                                    .attr("text-anchor", "middle")
                                    .attr("class", "backarrow")
                                    .attr("font-family", "FontAwesome")
                                    .text(FontAwesomeUtils.FontAwesomeConverter.convertToCharacter("fa-arrow-circle-o-left"))
                                    .on("click", (t: Technology, i: number) => {
                                        scope.options.time = null;
                                        scope.options.category = null;
                                        scope.render(technologies, scope.options);
                                    });
                            }
                        };

                        scope.$watch('technologies', function(newVal, oldVal) {
                            if (newVal !== oldVal) scope.render(scope.technologies, scope.options);
                        });

                        scope.$watch('searchterm', function(newVal, oldVal) {
                            if (newVal === oldVal) return;
                            var searchText = scope.searchterm.toLowerCase();
                            scope.technologies.forEach((t) => {
                                scope.setItemVisibility(t, scope.searchterm === null || scope.searchterm.length === 0 || JSON.stringify(t).toLowerCase().indexOf(searchText) > 0);
                            });
                        });

                        scope.$watch('prioritylevel', function(newVal, oldVal) {
                            if (newVal === oldVal) return;
                            scope.technologies.forEach((t) => {
                                scope.setItemVisibility(t, scope.searchterm === null || t.priority <= scope.prioritylevel);
                            });
                        });

                        scope.setItemVisibility = function(t: Technology, isVisible: boolean) {
                            t.visible = isVisible;
                            d3.select("#technology_item" + t.id).attr("visibility", isVisible ? "visible" : "hidden");
                        }

                        if (scope.technologies) scope.render(scope.technologies, scope.options);

                        d3.select(window).on('resize', () => {
                            console.log("Resize");
                            outerRadius = scope.radius || Math.floor($(element[0]).parent().width() / 2) - margin.left - margin.right;
                            actualWidth = 2 * outerRadius + margin.left + margin.right;
                            actualHeight = 2 * outerRadius + margin.top + margin.bottom;
                            scope.render(scope.technologies, scope.options);
                        });
                    }
                }
            }])
}

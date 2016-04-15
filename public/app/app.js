var App;
(function (App) {
    'use strict';
    var AppCtrl = (function () {
        function AppCtrl($scope, busService, spreadsheetService) {
            this.$scope = $scope;
            this.busService = busService;
            this.spreadsheetService = spreadsheetService;
            this.public_spreadsheet_url = 'https://docs.google.com/spreadsheets/d/1BcGsFEsH07Vj8_oXO0Fwx39LKzQCG-DtCevglXtKCbs/pubhtml';
            $scope.vm = this;
            spreadsheetService.loadTechnologies(this.public_spreadsheet_url, function () { return busService.publish('technologies', 'loaded'); });
        }
        AppCtrl.$inject = [
            '$scope',
            'busService',
            'sheetService'
        ];
        return AppCtrl;
    })();
    App.AppCtrl = AppCtrl;
    angular.module('TechRadar', [
        'ngRoute',
        'ui.bootstrap',
        'techRadar.infoslide',
        'techRadar.techRadarChart',
        'techRadar.youtube',
        'wiz.markdown'
    ])
        .filter('priorityFilter', function () {
        return function (technologies, priorityLevel) {
            var filteredItems = [];
            if (typeof technologies === 'undefined')
                return filteredItems;
            technologies.forEach(function (t) {
                if (t.priority <= priorityLevel)
                    filteredItems.push(t);
            });
            return filteredItems;
        };
    })
        .config(function ($routeProvider, $locationProvider) {
        $routeProvider
            .when('/home', {
            templateUrl: 'partials/home.tpl.html',
            activetab: 'home',
            controller: App.HomeCtrl
        })
            .when('/about', {
            templateUrl: 'partials/about.tpl.html',
            activetab: 'about'
        })
            .when('/contact', {
            templateUrl: 'partials/contact.tpl.html',
            activetab: 'contact'
        })
            .otherwise({
            redirectTo: '/home'
        });
    })
        .service('sheetService', csComp.Services.SpreadsheetService)
        .service('busService', csComp.Services.MessageBusService)
        .controller('appCtrl', AppCtrl)
        .controller('homeCtrl', App.HomeCtrl)
        .config(function ($sceDelegateProvider) {
        $sceDelegateProvider.resourceUrlWhitelist([
            'self',
            'http://www.youtube.com/**'
        ]);
    });
})(App || (App = {}));

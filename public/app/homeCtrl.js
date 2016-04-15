var App;
(function (App) {
    var HomeCtrl = (function () {
        function HomeCtrl($scope, $timeout, busService, spreadsheetService) {
            var _this = this;
            this.$scope = $scope;
            this.$timeout = $timeout;
            this.busService = busService;
            this.spreadsheetService = spreadsheetService;
            this.technologies = [];
            this.isSliderInitialised = false;
            $scope.vm = this;
            this.options = { prio: { 1: true, 2: true, 3: false } };
            busService.subscribe('technology', function (action, t) {
                switch (action) {
                    case 'selected':
                        _this.setFocus(t);
                        break;
                }
            });
            busService.subscribe('technologies', function (title) {
                if (title !== 'loaded')
                    return;
                _this.reload();
            });
            this.reload();
        }
        HomeCtrl.prototype.reload = function () {
            var _this = this;
            this.technologies = this.spreadsheetService.technologies;
            if (!this.technologies || this.technologies.length === 0)
                return;
            this.$timeout(function () {
                _this.initSlider();
                _this.setFocus(_this.technologies[0]);
            }, 0);
        };
        HomeCtrl.prototype.setFocus = function (t) {
            if (!this.isSliderInitialised)
                return;
            this.technologies.forEach(function (ts) { return ts.focus = false; });
            t.focus = true;
            var est = $('#tech-' + t.id);
            var list = $('#tslist');
            this.slider.gotoSlide(t.id);
            this.activeFocus = t.id;
        };
        HomeCtrl.prototype.initSlider = function () {
            var _this = this;
            if (this.$scope.$root.$$phase !== '$apply' && this.$scope.$root.$$phase !== '$digest') {
                this.isSliderInitialised = true;
                this.$scope.$apply();
                this.slider = $('.ts');
                this.slider.itemslide({ disable_autowidth: true });
                this.busService.publish('technology', 'selected', this.technologies[0]);
                $('body').keydown(function (event) {
                    var selected;
                    switch (event.originalEvent.keyIdentifier) {
                        case 'Home':
                            _this.activeFocus = 0;
                            while (_this.activeFocus < _this.technologies.length) {
                                selected = _this.technologies[_this.activeFocus];
                                if (selected.visible)
                                    break;
                                _this.activeFocus++;
                            }
                            _this.busService.publish('technology', 'selected', selected);
                            break;
                        case 'End':
                            _this.activeFocus = _this.technologies.length - 1;
                            while (_this.activeFocus > 1) {
                                selected = _this.technologies[_this.activeFocus];
                                if (selected.visible)
                                    break;
                                _this.activeFocus--;
                            }
                            _this.busService.publish('technology', 'selected', selected);
                            break;
                        case 'Left':
                            while (_this.activeFocus > 1) {
                                selected = _this.technologies[_this.activeFocus - 2];
                                if (selected.visible)
                                    break;
                                _this.activeFocus--;
                            }
                            _this.busService.publish('technology', 'selected', selected);
                            break;
                        case 'Right':
                            while (_this.activeFocus < _this.technologies.length) {
                                selected = _this.technologies[_this.activeFocus];
                                if (selected.visible)
                                    break;
                                _this.activeFocus++;
                            }
                            _this.busService.publish('technology', 'selected', selected);
                            break;
                        case 'Up':
                            _this.busService.publish('page', 'previous', '');
                            break;
                        case 'Down':
                            _this.busService.publish('page', 'next', '');
                            break;
                    }
                    if (event.which === 13) {
                        event.preventDefault();
                    }
                });
            }
        };
        HomeCtrl.prototype.focus = function (t) {
            this.busService.publish('technology', 'selected', t);
            this.setFocus(t);
        };
        HomeCtrl.prototype.showInfo = function (spreadsheet) {
            var index = 1;
            spreadsheet.forEach(function (row) {
                for (var header in row) {
                    if (!row.hasOwnProperty(header))
                        continue;
                }
            });
        };
        HomeCtrl.$inject = [
            '$scope',
            '$timeout',
            'busService',
            'sheetService'
        ];
        return HomeCtrl;
    })();
    App.HomeCtrl = HomeCtrl;
})(App || (App = {}));

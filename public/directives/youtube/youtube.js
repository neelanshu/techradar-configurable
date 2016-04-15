var Youtube;
(function (Youtube) {
    var moduleName = 'techRadar.youtube';
    try {
        Youtube.myModule = angular.module(moduleName);
    }
    catch (err) {
        Youtube.myModule = angular.module(moduleName, []);
    }
    Youtube.myModule.directive('youtube', [
        '$window', '$compile',
        function ($window, $compile) {
            return {
                restrict: 'EA',
                scope: {
                    url: '='
                },
                template: '<iframe style="overflow:hidden;height:auto;width:100%" width="100%" height="auto" src="{{url}}" frameborder="0" allowfullscreen></iframe>',
                link: function (scope, element, attrs) {
                    scope.onResize = function () {
                        var video = element[0], parent = element.parent();
                        var newWidth = parent.width(), newHeight = newWidth * 9 / 16;
                        if (newHeight < parent.height()) {
                            newHeight = parent.height();
                            newWidth = newHeight * 16 / 9;
                        }
                        video.style.width = newWidth + 'px';
                        video.style.height = newHeight + 'px';
                    };
                    scope.onResize();
                    angular.element($window).bind('resize', function () {
                        scope.onResize();
                        scope.$apply();
                    });
                },
                replace: true
            };
        }
    ]);
})(Youtube || (Youtube = {}));

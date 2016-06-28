var app = angular.module('filmLocations', ['autofill-directive'])

app.controller('DataCtrl', function($scope, $rootScope, $http) {
    
    (function loadTags(){
        //Populates autocomplete fields by makeing an initial call to SFDATA api, 
        //parses through movie titles and eliminates duplicate entries

        $http.get("https://data.sfgov.org/resource/wwmu-gmzc.json?")
        .then(function(res){
            var movies = [res.data[0].title], len = res.data.length;
            for(var i = 1; i < len; i++){
                //excessive && statements below due to some duplicate movie titles not being listed sequentially.
                if(res.data[i].title !== res.data[i-1].title && res.data[i].title !== res.data[i-2].title && res.data[i].title !== res.data[i-3].title){
                    movies.push(res.data[i].title);
                }  
            }
            $scope.filmNames = movies;
            console.log(movies.length + " movies available", $scope.filmNames);
            
            //alternative JQuery autocomplete
           // $(function() {
           //      $( "#text" ).autocomplete({
           //        source: $scope.filmNames
           //      });
           //  });

            new autoComplete({
                selector: 'input[id="text"]',
                minChars: 1,
                source: function(term, suggest){
                    term = term.toLowerCase();
                    var choices = $scope.filmNames;
                    var matches = [];
                    for (i=0; i<choices.length; i++)
                        if (~choices[i].toLowerCase().indexOf(term)) matches.push(choices[i]);
                    suggest(matches);
                }
            });

        })
    })()

    $scope.searchTitles = function () {
        //on form submission, queries SFDATA for all locations for submitted title
        //upon receipt, assigns $rootScope variable to the returned array and emits
        //an event which the map controller is listening for

        $http.get("https://data.sfgov.org/resource/wwmu-gmzc.json?title="+$scope.title)
        .then(function(res){ 
            var places = [], len = res.data.length;
            for(var i = 0; i < len; i++){
                places.push(res.data[i].locations);
            }
            $rootScope.locations = places;
            console.log($scope.title + " was filmed in these locations: ", $rootScope.locations);
            $rootScope.$emit('rootScope:emit', 'MapCtrl, would you mind changing the markers? Thanks.');
        });
    };  

})


app.controller('MapCtrl', function($scope, $rootScope, $http) {

    var sfCenter = {lat: 37.78, lng: -122.42};
    var mapOptions = {
        center: sfCenter,
        zoom: 11,
        minZoom: 11,
        maxZoom: 16
    };

    $scope.map = new google.maps.Map(document.getElementById('map'), mapOptions);
    $scope.markers = [];

    var infoWindow = new google.maps.InfoWindow();
    
    var createMarker = function (info){
        var marker = new google.maps.Marker({
            map: $scope.map,
            position: new google.maps.LatLng(info.lat, info.long),
            title: info.name
        });
        //marker.content = '<div class="infoWindowContent">' + info.title + '</div>';
        google.maps.event.addListener(marker, 'click', function(){
            infoWindow.setContent('<h3>' + marker.title + '</h3>');
            infoWindow.open($scope.map, marker);
        });
        $scope.markers.push(marker);
    };

    var setMapOnAll = function(map) {
        for (var i = 0; i < $scope.markers.length; i++) {
          $scope.markers[i].setMap(map);
        }
    }
    var clearMarkers = function() {
        for (var i = 0; i < $scope.markers.length; i++) {
          $scope.markers[i].setMap(null);
        }
    }

    $rootScope.$on('rootScope:emit', function (event, data){
    
        //on emit, query the server with locations array
        //server will send a request to Google places, and, upon
        //receipt, should respond with and array latitudes and longitudes
        //which match the place names.
        $http.post('http://localhost:3000/markers', $rootScope.locations)
            .success(function(data){
                //console.log('success', data);
            }).error(function(data, status){
                console.log('Error! ' + status + ' : ' + data);
            })
            .then(function(res) {
                clearMarkers();
                console.log('responseData: ', res.data);
                var len = res.data.length;
                $scope.markers = [];
                for(var i = 0; i < len; i++){
                   // var info = res.data;
                    var info = {
                        name: res.data[i].name,
                        lat: res.data[i].lat, 
                        long: res.data[i].lng
                    };
                    console.log('marker info:', info);
                    if(info.name !== null){
                        createMarker(info);
                    } else {
                        console.log('google maps failed to find location');
                        $scope.error = "Location could not be found";
                    }
                    
                }
            });
    });

    $scope.openInfoWindow = function(e, selectedMarker){
        e.preventDefault();
        google.maps.event.trigger(selectedMarker, 'click');
    };
})



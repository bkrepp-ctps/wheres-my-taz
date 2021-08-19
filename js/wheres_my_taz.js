// "Where's my TAZ?" demo app.
// Uses MassGIS Geocoding REST API
//     Documentation: https://wiki.state.ma.us/display/massgis/ArcGIS+Server+-+Geocoding+-+Census+TIGER+2010
// Author: Ben Krepp

var wfsServerRoot = 'https://www.ctps.org/maploc/wfs';
var demographics_layer = 'postgis:dest2040_taz_demographics';

function process_geocoded_location(data) {
	// Work with first (best) candidate: candidates[0]
	var temp = data.candidates[0];
	var x_coord = temp.location.x;
	var y_coord = temp.location.y;
	console.log('x = ' + x_coord + ', y = ' + y_coord);	
	adjust_map_and_show_data(data);
	
	// *** TBD: Fun stuff - Create INTERSECTS query!
	
	// var cqlFilter = "BBOX(shape," + minx + "," + miny + "," + maxx + "," + maxy + ")";
    var szUrl = wfsServerRoot + '?';
    szUrl += '&service=wfs';
    szUrl += '&version=1.0.0';
    szUrl += '&request=getfeature';
    szUrl += '&typename='+demographics_layer;
    szUrl += '&outputformat=json';
    szUrl += '&cql_filter=' + cqlFilter;    
     // DEBUG
    // console.log(szUrl);
        
    $.ajax({  url		: szUrl,
			  type		: 'GET',
			  dataType	: 'json',
			  success	: 	function (data, textStatus, jqXHR) {	
								var reader, aFeatures = [], props = {}, i, s;
								reader = new ol.format.GeoJSON();
								aFeatures = reader.readFeatures(jqXHR.responseText);
								if (aFeatures.length === 0) {
									alert('WFS request to get data from INTERSECTS query returned no features.');
									return;
								}
								var _DEBUG_HOOK = 0;
								renderTazData(aFeatures);
								return;
                            },
        error       :   function (qXHR, textStatus, errorThrown ) {
                            alert('WFS request to get data from INTERSECTS query failed.\n' +
                                    'Status: ' + textStatus + '\n' +
                                    'Error:  ' + errorThrown);
							return;
                        } // error handler for WFS request
    });
} // handle_geocode_response()

function submit_geocode_request(street, city, zip) {
	var request_url = 'http://gisprpxy.itd.state.ma.us/arcgisserver/rest/services/CensusTIGER2010/GeocodeServer/findAddressCandidates';
	request_url += '?';
	request_url += 'Street=' + street; // Note "+" for whitespace
	request_url += '&City=' + city;
	request_url += '&ZIP=' + zip;
	request_url += '&f=json';
	$.ajax( { url		: request_url,
			 type		: 'GET',
			 dataType	: 'json',
			 success	: 	function (data, textStatus, jqXHR) {	
								var _DEBUG_HOOK = 1;
								var n_candidates = data.candidates.length;
								if (n_candidates ===  0) {
									alert('Geocoding request for address failed to find any candidates.\nTry again.');
									return;
								}
								// Work with first (best) candidate: candidates[0]
								var temp = data.candidates[0];
								var score = temp.score;
								if (score < 75) {
									alert('Warning: Geocoding service returned score of ' + score + '.\nIgnoring results. Try again.')
								} else if (score < 90) {
									alert('Warning: Geocoding score was ' + score + '.\nTake results with grain of salt!');
								}
								process_geocoded_location(data);
								return;
							},
			error       :   function (qXHR, textStatus, errorThrown ) {
								var _DEBUG_HOOK = 0;
								alert('HTTP request to geocode address failed\n' +
								      'Status: ' + textStatus + '\n' +
								      'Error:  ' + errorThrown);
								return;
							} // error handler for Geocode Address AJAX request
		});	
	
} // submit_geocode_request()

function initialize() {
    var map = new ol.Map({ layers: [ new ol.layer.Tile({ source: new ol.source.OSM() }) ],
                           target: 'map',
                           view: new ol.View({ projection: 'EPSG:4326', 
						                       center: [-71.057083, 42.3601],
                                               zoom: 12
                                            })
                         });
	// UI event handler
	$('#execute').on('click', 
		function(e) {
			console.log("Enterd click event handler.");
			var temp = $('#address').val();
			// Replace blanks in address field with '+', per geocoding API
			var address = temp.replaceAll(' ', '+');
			var city = $('#city').val();
			var zip = $('#zip').val();
			// Submit request, and let response handler to the rest...
			submit_geocode_request(address, city, zip);
	});
} // initialize()

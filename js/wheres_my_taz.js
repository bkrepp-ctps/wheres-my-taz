// "Where's my TAZ?" demo app.
// Uses MassGIS Geocoding REST API
//     Documentation: https://wiki.state.ma.us/display/massgis/ArcGIS+Server+-+Geocoding+-+Census+TIGER+2010
// Author: Ben Krepp


// Varioius things for WMS and WFS layers
// First, folderol to allow the app to run on appsrvr3 as well as "in the wild"
var serverRoot = location.protocol + '//' + location.hostname;
var nameSpace;
var geometry_field_name;
if (location.hostname.includes('appsrvr3')) {   
    serverRoot += ':8080/geoserver/';  
	nameSpace = 'ctps_pg';
	geometry_field_name = 'shape';
} else {
    serverRoot += '/maploc/';
	nameSpace = 'postgis';
	geometry_field_name = 'wkb_geometry';
}
var wmsServerRoot = serverRoot + '/wms'; 
var wfsServerRoot = serverRoot + '/wfs'; 
var demographics_layer = nameSpace + ':' + 'dest2040_taz_demographics';
// The following isn't a (geographic) "layer", but rather a geometry-less table
var taz_demand_table = nameSpace + ':' + 'ctps_modx_taz_demand_summary_base';

// OpenLayers 'map' object:
var ol_map = null;

// Max map resolution at which to label TAZ vector features.
var maxResolutionForLabelingVectorFeatures = 1200;   
// Our function to return text to label TAZ vector features
//
// Unabashedly borrowed from https://openlayers.org/en/latest/examples/vector-labels.html,
// and subsequently morphed for our purposes.
//
var getText = function(feature, resolution) {
  var maxResolution = maxResolutionForLabelingVectorFeatures;
  var text = "TAZ " + String(feature.get('taz'));
  if (resolution > maxResolution) {
    text = '';
  }
  return text;
};
// Our createTextStyle function for labeling the TAZ vector layer
//
// Unabashedly borrowed from https://openlayers.org/en/latest/examples/vector-labels.html,
// and subsequently morphed for our purposes.
//
var createTextStyle = function(feature, resolution) {
  var align = 'center';
  var baseline = 'middle';
  var size = '14px';
  var height = 1;
  var offsetX = 0;
  var offsetY = 0;
  var weight = 'normal';
  var placement = 'point';
  var maxAngle = 45;
  var overflow = 'true'; 
  var rotation = 0;
  var font = weight + ' ' + size + '/' + height + ' ' + 'Arial';
  var fillColor = 'black';      // Color of label TEXT itself
  var outlineColor = 'white';   // Color of label OUTLINE
  var outlineWidth = 0;

  return new ol.style.Text({
    textAlign: align,
    textBaseline: baseline,
    font: font,
    text: getText(feature, resolution),
    fill: new ol.style.Fill({color: fillColor}),
    stroke: new ol.style.Stroke({color: outlineColor, width: outlineWidth}),
    offsetX: offsetX,
    offsetY: offsetY,
    placement: placement,
    maxAngle: maxAngle,
    overflow: overflow,
    rotation: rotation
  });
};

// Vector layer for rendering TAZes
// Needs to be visible to initialize() and renderTazData() functions:
var oTazLayer = new ol.layer.Vector({source: new ol.source.Vector({ wrapX: false }) });
// Define style for the TAZ vector layer, and set that layers's style to it
function myTazLayerStyle(feature, resolution) {
	return new ol.style.Style({ fill	: new ol.style.Fill({ color: 'rgba(193,66,66,0.4)' }), 
                                          stroke : new ol.style.Stroke({ color: 'rgba(0,0,255,1.0)', width: 3.0}),
                                          text:   createTextStyle(feature, resolution)
				});
}
oTazLayer.setStyle(myTazLayerStyle);

function render_all_taz_props(demographic_data, demand_data) {
	var _DEBUG_HOOK = 0;
	
	return; 
} // render_all_taz_props()

// *** 08/23/2021 -  This funcdtion is now vestigial. ***
function render_taz_props(taz_feature) {
	var props = taz_feature.getProperties();

	var taz = props['taz'],
		town = props['town'],
		land_area = props['land_area'],
		census_hh_2010 = props['census_hh_2010'],
		total_lowinc_hh_2010 = props['total_lowinc_hh_2010'],
		total_zero_veh_hh_2010 = props['total_zero_veh_hh_2010'],
		lowinc_hh_pct_2010 = props['lowinc_hh_pct_2010'],
		disabled_pop_pct_2010 = props['disabled_pop_pct_2010'],
		lep_pop_pct_2010 = props['lep_pop_pct_2010'],
		minority_pop_pct_2010 = props['minority_pop_pct_2010'],
		pop_75plus_pct_2010 = props['pop_75plus_pct_2010'],
		pop_u18_pct_2010 = props['pop_u18_pct_2010'],
		total_pop_2010 = props['total_pop_2010'],
		total_civ_noninst_pop_2010 = props['total_civ_nonist_pop_2010'],
		total_disabled_pop_2010 = props['total_disabled_pop_2010'],
		total_emp_2010 = props['total_emp_2010'],
		total_lep_pop_2010 = props['total_lep_pop_2010'],
		total_minority_pop_2010 = props['total_minority_pop_2010'],
		total_pop_75plus_2010 = props['total_pop_75plus_2010'],
		total_pop_u18_2010 = props['total_pop_u18_2010'];
	
// For starters, just dump this information to the console	
	console.log('TAZ ' + taz);
	console.log('Town: ' + town);
	console.log('Land area: ' + land_area.toFixed(2) + ' SqMi.');
	//
	console.log('Households: ' + census_hh_2010.toFixed(0));
	console.log('Low income households: ' + total_lowinc_hh_2010.toFixed(0));
	console.log('Zero vehicle households: ' + total_zero_veh_hh_2010.toFixed(0));
	//
	// console.log(lowinc_hh_pct_2010.toFixed(2));
	// console.log(disabled_pop_pct_2010.toFixed(2));
	// console.log(lep_pop_pct_2010.toFixed(2));
	// console.log(minority_pop_pct_2010.toFixed(2));
	// console.log(pop_75plus_pct_2010.toFixed(2));
	// console.log(pop_u18_pct_2010.toFixed(2));
	//
	console.log('Total population (2010):' + total_pop_2010.toFixed(0));
	// console.log(total_civ_noninst_pop_2010.toFixed(0));
	console.log('Total disabled population: ' +  total_disabled_pop_2010.toFixed(0));
	console.log('Total employement: ' + total_emp_2010.toFixed(0));
	console.log('Total limied English proficienty population: ' + total_lep_pop_2010.toFixed(0));
	console.log('Total minority population: ' + total_minority_pop_2010.toFixed(0));
	console.log('Total population over 75 years of age: ' + total_pop_75plus_2010.toFixed(0));
	console.log('Total population under 18 years of age: ' + total_pop_u18_2010.toFixed(0)); 

	return;
} // render_taz_props()

function render_taz_data(taz_feature) {
	// First, the spatial data
    // Get the source for the TAZ vector layer
	var vSource = oTazLayer.getSource();
	// Clear anything that might previously be in the vector layer
    vSource.clear();
    vSource.addFeature(taz_feature);
    // Set the source of the vector layer to the taz_feature
	oTazLayer.setSource(vSource);
    // Pan/zoom map to the extent of the TAZ
    var extent = oTazLayer.getSource().getExtent();
    ol_map.getView().fit(extent, ol_map.getSize());	
	
	// Second, the non-spatial data.
	// This comes from two places: 
	//    (1) the demographic attributes ('properites') in the TAZ feature layer
	//    (2) the TAZ demand data (from the model, exported by MoDX) to a "geometry-less table"
	// We have (1), and now need to get (2) using another AJAZ request.
	// When we have both, we can render them all..
	
	// (1) Demographic attributes
	var demographic_props = taz_feature.getProperties();
	// We need to get the TAZ ID for the following WFS request
	var taz_id = demographic_props['taz'];
	
	// (2) Get the TAZ demand data, and when in hand, render the whole kit-and-kaboodle
	// Construct the WFS request
	var cqlFilter = "id=" + taz_id;
	
	// DEBUG
	console.log(cqlFilter);

    var szUrl = wfsServerRoot + '?';
    szUrl += '&service=wfs';
    szUrl += '&version=1.0.0';
    szUrl += '&request=getfeature';
    szUrl += '&typename='+taz_demand_table;
    szUrl += '&outputformat=json';
    szUrl += '&cql_filter=' + cqlFilter;    
	
    // DEBUG
    console.log(szUrl);
        
    $.ajax({  url		: szUrl,
			  type		: 'GET',
			  dataType	: 'json',
			  success	: 	function (data, textStatus, jqXHR) {	
								var reader, aFeatures = [], props = {}, len, demand_props;
								reader = new ol.format.GeoJSON();
								aFeatures = reader.readFeatures(jqXHR.responseText);
								len = aFeatures.length;
								if (len === 0) {
									alert('WFS request to get TAZ demand data returned no records.');
									return;
								} else if (len > 1) {
									alert('WFS request to get TAZ demand data returned more than one record.');
								}
								var _DEBUG_HOOK = 0;
								demand_props = aFeatures[0].getProperties();
								// Render both the demographic and demand data
								render_all_taz_props(demographic_props, demand_props);
								return;
                            },
        error       :   function (qXHR, textStatus, errorThrown ) {
                            alert('WFS request to get data TAZ demand data failed.\n' +
                                    'Status: ' + textStatus + '\n' +
                                    'Error:  ' + errorThrown);
							return;
                        } // error handler for WFS request
    });	
	return; 
} // render_taz_data()

function process_geocoded_location(data) {
	// Work with first (best) candidate: candidates[0]
	var temp = data.candidates[0];
	var x_coord = temp.location.x;
	var y_coord = temp.location.y;
	
	// DEBUG
	// console.log('x = ' + x_coord + ', y = ' + y_coord);	
	
	// Construct CQL "INTERSECTS" filter to use in WFS request
    // Note: The first parameter of the INTERSECTS filer is the attribute containing the geographic data in the layer being queried.
	var cqlFilter = "INTERSECTS(";
	cqlFilter += geometry_field_name;
	cqlFilter += ",";
	cqlFilter += "POINT(";
	cqlFilter += x_coord + " " + y_coord;
	cqlFilter += "))";
	
	// DEBUG
	// console.log(cqlFilter);

    var szUrl = wfsServerRoot + '?';
    szUrl += '&service=wfs';
    szUrl += '&version=1.0.0';
    szUrl += '&request=getfeature';
    szUrl += '&typename='+demographics_layer;
    szUrl += '&outputformat=json';
	szUrl += '&srsname=EPSG:4326';  // NOTE: We must reproject the native geometry of the feature to the SRS of the map!
    szUrl += '&cql_filter=' + cqlFilter;    
	
    // DEBUG
    //console.log(szUrl);
        
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
								render_taz_data(aFeatures[0]);
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
    ol_map = new ol.Map({ layers: [ new ol.layer.Tile({ source: new ol.source.OSM() }),
	                                oTazLayer
                                  ],
                           target: 'map',
                           view: new ol.View({ projection: 'EPSG:4326', 
						                       center: [-71.057083, 42.3601],
                                               zoom: 12
                                            })
                         });
	// UI event handler
	$('#execute').on('click', 
		function(e) {
			var temp = $('#address').val();
			// Replace blanks in address field with '+', per geocoding API
			var address = temp.replaceAll(' ', '+');
			var city = $('#city').val();
			var zip = $('#zip').val();
			// Submit request, and let response handler to the rest...
			submit_geocode_request(address, city, zip);
	});
} // initialize()

// "Where's my TAZ?" demo app.
// Uses MassGIS Geocoding REST API
//     Documentation: https://wiki.state.ma.us/display/massgis/ArcGIS+Server+-+Geocoding+-+Census+TIGER+2010
//     Note: As of March 2024, the documentation link above no longer works
// Author: Ben Krepp

// Varioius things for accessing WMS and WFS layers
// First, folderol to allow the app to run on appsrvr3 as well as "in the wild"
var serverRoot = location.protocol + '//' + location.hostname;
var nameSpace;
var geometry_field_name;
if (location.hostname.includes('appsrvr3')) {   
    serverRoot += ':8080/geoserver/';  
	nameSpace = 'ctps_pg';
	geometry_field_name = 'shape';
} else {
	// The following statement is a hack to work-around having to use www2.bostonmpo.org 
	// to get around CloudFront caching during development:
	serverRoot = 'https://www.ctps.org';
    serverRoot += '/maploc/';
	nameSpace = 'postgis';
	geometry_field_name = 'wkb_geometry';
}
var wmsServerRoot = serverRoot + '/wms'; 
var wfsServerRoot = serverRoot + '/wfs'; 
var demographics_layer = nameSpace + ':' + 'dest2040_taz_demographics';
// The following isn't a (geographic) "layer", but rather a geometry-less table
var taz_demand_table_name = nameSpace + ':' + 'ctps_modx_taz_demand_summary_base';
// Demand data, by TAZ, loaded from CSV file - to replace the above, read by WFS requests.
var demand_data = []; 

// URL for MassGIS Geocoding REST API endpoint
var massGIS_geocoding_REST_ep = 'https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/CensusTIGER2010/GeocodeServer/findAddressCandidates';

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

var debugFlag = false;

function render_all_taz_props(demographics, demand) {
	var taz = demographics['taz'],
	    town = demographics['town'],
		land_area = demographics['land_area'],
		census_hh_2010 = demographics['census_hh_2010'],
		total_lowinc_hh_2010 = demographics['total_lowinc_hh_2010'],
		total_zero_veh_hh_2010 = demographics['total_zero_veh_hh_2010'],
		lowinc_hh_pct_2010 = demographics['lowinc_hh_pct_2010'],
		disabled_pop_pct_2010 = demographics['disabled_pop_pct_2010'],
		lep_pop_pct_2010 = demographics['lep_pop_pct_2010'],
		minority_pop_pct_2010 = demographics['minority_pop_pct_2010'],
		pop_75plus_pct_2010 = demographics['pop_75plus_pct_2010'],
		pop_u18_pct_2010 = demographics['pop_u18_pct_2010'],
		total_pop_2010 = demographics['total_pop_2010'],
		total_civ_noninst_pop_2010 = demographics['total_civ_nonist_pop_2010'],
		total_disabled_pop_2010 = demographics['total_disabled_pop_2010'],
		total_emp_2010 = demographics['total_emp_2010'],
		total_lep_pop_2010 = demographics['total_lep_pop_2010'],
		total_minority_pop_2010 = demographics['total_minority_pop_2010'],
		total_pop_75plus_2010 = demographics['total_pop_75plus_2010'],
		total_pop_u18_2010 = demographics['total_pop_u18_2010'];
		
	var total_trips = demand['total_trips'],
	    auto = demand['total_auto'],
		nm = demand['total_nm'],
        truck = demand['total_truck'],
		transit = demand['total_transit'];
	
	if (debugFlag) {
		console.log('TAZ ' + taz);
		console.log('Town: ' + town);
		console.log('Land area: ' + land_area.toFixed(2) + ' SqMi.');
		console.log('Total population (2010):' + total_pop_2010.toFixed(0));
		// console.log(total_civ_noninst_pop_2010.toFixed(0));
		console.log('Total disabled population: ' +  total_disabled_pop_2010.toFixed(0));
		console.log('Total limied English proficienty population: ' + total_lep_pop_2010.toFixed(0));
		console.log('Total minority population: ' + total_minority_pop_2010.toFixed(0));
		console.log('Total population over 75 years of age: ' + total_pop_75plus_2010.toFixed(0));
		console.log('Total population under 18 years of age: ' + total_pop_u18_2010.toFixed(0)); 	
		console.log('Total employment: ' + total_emp_2010.toFixed(0));		
		console.log('Households: ' + census_hh_2010.toFixed(0));
		console.log('Low income households: ' + total_lowinc_hh_2010.toFixed(0));
		console.log('Zero vehicle households: ' + total_zero_veh_hh_2010.toFixed(0));
		console.log('Total demand = ' + total.toFixed(2));
		console.log('Auto demand = ' + auto.toFixed(2));
		console.log('Non-motorized demand = ' + nm.toFixed(2));
		console.log('Truck demand = ' + truck.toFixed(2));
		console.log('Transit demand = ' + transit.toFixed(2));
	} // debug
	
	$('#taz').html(taz);
	$('#town').html(town);
	$('#land_area').html(land_area.toFixed(2) + ' SqMi.');
	
	$('#population').html(total_pop_2010.toFixed(0));
	$('#minority_pop').html(total_minority_pop_2010.toFixed(0));
	$('#lep_pop').html(total_lep_pop_2010.toFixed(0));
	$('#disabled_pop').html(total_disabled_pop_2010.toFixed(0));
	$('#pop_over_75').html(total_pop_75plus_2010.toFixed(0));
	$('#pop_under_18').html(total_pop_u18_2010.toFixed(0));
	$('#employment').html(total_emp_2010.toFixed(0));
	
	$('#households').html(census_hh_2010.toFixed(0));
	$('#low_inc_hh').html(total_lowinc_hh_2010.toFixed(0));
	$('#zv_hh').html(total_zero_veh_hh_2010.toFixed(0));

	$('#total_trips').html(total_trips.toFixed(2));
	$('#auto_demand').html(auto.toFixed(2));
	$('#nm_demand').html(nm.toFixed(2));
	$('#truck_demand').html(truck.toFixed(2));
	$('#transit_demand').html(transit.toFixed(2));
	
	$('#output_wrapper').show();
	
	return; 
} // render_all_taz_props()

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
	
	var demand_props = [];
	// The following query should return an array containing a *single* record:
	demand_recs = _.filter(demand_data, function(rec) { return rec['id'] == taz_id; });
	// Sanity checks
	if (demand_recs.length === 0) {
		alert('Error: Zero records found in demand data table for TAZ ' + taz_id + '.');
		return;
	} else if (demand_recs.length > 1) {
		alert('Error: ' + demand_recs.length + ' records found in demand data table for TAZ ' + taz_id + '.');
		return;
	} else {
			render_all_taz_props(demographic_props, demand_recs[0])
	}
	return; 
} // render_taz_data()

function process_geocoded_location(data) {
	// Work with first (best) candidate: candidates[0]
	var temp = data.candidates[0];
	var x_coord = temp.location.x;
	var y_coord = temp.location.y;
	
	if (debugFlag) {
		console.log('x = ' + x_coord + ', y = ' + y_coord);	
	}
	
	// Construct CQL "INTERSECTS" filter to use in WFS request
    // Note: The first parameter of the INTERSECTS filer is the attribute containing the geographic data in the layer being queried.
	var cqlFilter = "INTERSECTS(";
	cqlFilter += geometry_field_name;
	cqlFilter += ",";
	cqlFilter += "POINT(";
	cqlFilter += x_coord + " " + y_coord;
	cqlFilter += "))";
	
	if (debugFlag) {
		console.log(cqlFilter);
	}

    var szUrl = wfsServerRoot + '?';
    szUrl += '&service=wfs';
    szUrl += '&version=1.0.0';
    szUrl += '&request=getfeature';
    szUrl += '&typename='+demographics_layer;
    szUrl += '&outputformat=json';
	szUrl += '&srsname=EPSG:4326';  // NOTE: We must reproject the native geometry of the feature to the SRS of the map!
    szUrl += '&cql_filter=' + cqlFilter;    
	
    if (debugFlag) {
		console.log(szUrl);
	}
        
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
	var request_url = massGIS_geocoding_REST_ep;
	request_url += '?';
	request_url += 'Street=' + street; // Note "+" for whitespace
	request_url += '&City=' + city;
	request_url += '&ZIP=' + zip;
	request_url += '&f=json';
	$.ajax( { url		: request_url,
			 type		: 'GET',
			 dataType	: 'json',
			 success	: 	function (data, textStatus, jqXHR) {	
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
								alert('HTTP request to geocode address failed\n' +
								      'Status: ' + textStatus + '\n' +
								      'Error:  ' + errorThrown);
								return;
							} // error handler for Geocode Address AJAX request
		});	
} // submit_geocode_request()

function initialize() {
	$('#output_wrapper').hide();
	var initial_map_center = [-71.057083, 42.3601];
	var initial_zoom_level = 12;
    ol_map = new ol.Map({ layers: [ new ol.layer.Tile({ source: new ol.source.OSM() }),
	                                oTazLayer
                                  ],
                           target: 'map',
                           view: new ol.View({ projection: 'EPSG:4326', 
						                       center: initial_map_center,
                                               zoom:   initial_zoom_level
                                            })
                         });
	// UI event handlers
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
	$('#reset').on('click',
		function(e) {
			// Clear the textual output area
			$('#output_wrapper').hide();
			// Clear anything that might previously be in the vector layer
		    var vSource = oTazLayer.getSource();
            vSource.clear();
			// Set map to initial extent and zoom level
			var v = ol_map.getView();
			v.setCenter(initial_map_center);
			v.setZoom(initial_zoom_level);
			ol_map.setView(v);
	});
	// Load demand data from CSV file
	$.ajax({ url: "csv/demand_all_modes.csv",
			 async: false,
			 success: function (csvd) {
				demand_data = $.csv.toObjects(csvd);
				// Convert numeric fields, read in as text from CSV, to numeric type
				demand_data.forEach(function(rec) {
					rec['id'] = +rec['id'];
					rec['total_trips'] = +rec['total_trips'];
					rec['total_auto'] = +rec['total_auto'];
					rec['total_truck'] = +rec['total_truck'];
					rec['total_transit'] = +rec['total_transit'];
					rec['total_nm'] = +rec['total_nm'];
				});
				var _DEBUG_HOOK = 0;
			 },
			 dataType: "text",
			 complete: function () {
				// call a function on complete 
		   }
	});
} // initialize()

# wheres-my-taz
"Where's my TAZ?" demo app.

This app allows the user to view data on the TAZ that contains an address,
in Massachusetts, entered by the user. The address is geocoded 
using MassGIS's Geocoding REST API. If the geocoding is successful,
the app then:
* pans-and-zooms the map to the TAZ containing the coordinates returned by geocoding 
* highlights this TAZ on the map 
* displays selected information about the TAZ: some demographic data and travel demand data

For this demo, the demographic data is read from the WFS service __postgis::dest2040_taz_demographics__
running on CTPS's GeoServer;
the travel demand data is read from a CSV file \(__data/csv/demand_all_modes.csv__\).

Of course, this is just a _demonstration_ of the kind\(s\) of data this kind of app can deliver.

## Libraries Required
* jQUery version 1.11.2
* OpenLayers version 5.3.0

## Colophon
Author: [Ben Krepp](mailto:bkrepp@ctps.org)  
Address: Central Transportation Planning Staff, Boston Region Metropolitan Planning Agency  
10 Park Plaza  
Suite 2150  
Boston, MA 02116  
United States

# -*- coding: utf-8 -*-
"""
Created on Sat Jul 13 19:29:36 2024

@author: Andreas Sørensen
"""

### Sources:

#https://olgarithm.medium.com/garmin-connect-get-the-data-85f3312ae56b

#https://pypi.org/project/garminconnect/0.1.53/

"""
PACKAGES
"""

import os
import gpxpy
import gpxpy.gpx
import folium
from folium.plugins import HeatMap

def parse_gpx(file_path):
    with open(file_path, 'r') as gpx_file:
        gpx = gpxpy.parse(gpx_file)
        coordinates = []
        for track in gpx.tracks:
            for segment in track.segments:
                for point in segment.points:
                    coordinates.append((point.latitude, point.longitude))
            
    return coordinates

def aggregate_coordinates(directory):
    all_coordinates = []
    for file_name in os.listdir(directory):
        if file_name.endswith('.gpx'):
            file_path = os.path.join(directory, file_name)
            all_coordinates.extend(parse_gpx(file_path))
    
    return all_coordinates

def create_heatmap(coordinates, output_file, radius=10, blur=15, max_zoom=1):
    if not coordinates:
        raise ValueError("No coordinates to plot on the heatmap")
    
    # Calculate the central point for the map
    avg_lat = sum(coord[0] for coord in coordinates) / len(coordinates)
    avg_lon = sum(coord[1] for coord in coordinates) / len(coordinates)
    #m = folium.Map(location=[avg_lat, avg_lon], zoom_start=7)
    
    munkensvej_lat = 55.694015
    munkensvej_lon = 12.534574
    m = folium.Map(location=[munkensvej_lat, munkensvej_lon], zoom_start=7)
    
    # Add the heatmap with custom settings
    HeatMap(coordinates, radius=radius, blur=blur, max_zoom=max_zoom).add_to(m)
    
    m.save(output_file)

"""
SETUP PATHS AND OUTPUT
"""

""" Set up and return necessary paths """
inpath = os.path.join(os.getenv('APPDATA').replace("\\AppData\\Roaming", ""), "GitHub", "garmin", "data")
outpath = os.path.join(os.getenv('APPDATA').replace("\\AppData\\Roaming", ""), "GitHub", "garmin", "output")

"""
SETUP DATA VISUALIZATIONS
"""

""" GPS HEATMAP - ALL """

coordinates = aggregate_coordinates(f'{inpath}/activity_data/gpx')
create_heatmap(coordinates, 'gps_heatmap.html', radius=9, blur=8, max_zoom=1)
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
import datetime
from datetime import date
import json
import numpy as np
import pandas as pd
from pandas import json_normalize
import matplotlib.pyplot as plt
import matplotlib.font_manager as font_manager
import matplotlib.dates as mdates
import seaborn as sns

def list_all_json_files(directory):
    json_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.json'):
                json_files.append(os.path.join(root, file))
    return json_files

def parse_json(file_path):
    with open(file_path, 'r') as file:
        data = json.load(file)
        
    return data



"""
SETUP PATHS AND OUTPUT
"""

""" Set up and return necessary paths """
inpath = os.path.join(os.getenv('APPDATA').replace("\\AppData\\Roaming", ""), "GitHub", "garmin", "data")
outpath = os.path.join(os.getenv('APPDATA').replace("\\AppData\\Roaming", ""), "GitHub", "garmin", "output")

"""
IMPORT AND PRE-PROCESS DATA
"""

### ACTIVITIES DATA - ALL ACTIVITIES
#Load data from one file to a dataframe
filename = "2024-07-24_all_activities.json"
data = parse_json(f"{inpath}/activity_data/all_activities/{filename}")
df = pd.json_normalize(data, record_path=None, meta=None, meta_prefix=None, record_prefix=None, errors='raise', sep='.', max_level=None)
df.drop(['activityType.isHidden',
         'activityType.restricted',
         'activityType.trimmable',
         'eventType.typeId',
         'eventType.typeKey',
         'eventType.sortOrder',
         'userRoles',
         'privacy.typeId',
         'privacy.typeKey',
         'userPro',
         'hasVideo',
         'summarizedDiveInfo.summarizedDiveGases',
         'splitSummaries'], axis=1, inplace = True)
df_activities = df



### LOGGED DATA - SLEEP
#List all files in directory
json_files = list_all_json_files(f"{inpath}/logged_data/sleep_data")
#Load data from all files to a dataframe
data = []
for file in json_files:
    data.append(parse_json(file))
df = pd.json_normalize(data, record_path=None, meta=None, meta_prefix=None, record_prefix=None, errors='raise', sep='.', max_level=None)
df_sleep = df



### LOGGED DATA - SPO2
#List all files in directory
json_files = list_all_json_files(f"{inpath}/logged_data/spo2_data")
#Load data from all files to a dataframe
data = []
for file in json_files:
    data.append(parse_json(file))
df = pd.json_normalize(data, record_path=None, meta=None, meta_prefix=None, record_prefix=None, errors='raise', sep='.', max_level=None)
df_spo2 = df


"""DONE"""
### LOGGED DATA - STEPS
#List all files in directory
json_files = list_all_json_files(f"{inpath}/logged_data/steps_data")
#Load data from all files to a dataframe
data = []
for file in json_files:
    data.append(parse_json(file))
flat_list = [d for sublist in data for d in sublist]
df = pd.json_normalize(flat_list, record_path=None, meta=None, meta_prefix=None, record_prefix=None, errors='raise', sep='.', max_level=None)
df_steps = df



### LOGGED DATA - STRESS
#List all files in directory
json_files = list_all_json_files(f"{inpath}/logged_data/stress_data")
#Load data from all files to a dataframe
data = []
for file in json_files:
    data.append(parse_json(file))
df = pd.json_normalize(data, record_path=None, meta=None, meta_prefix=None, record_prefix=None, errors='raise', sep='.', max_level=None)
df_stress = df






# Let's make sure 'date' is actually a date in pandas
df_steps["startGMT"] = pd.to_datetime(df_steps["startGMT"])

date = df_steps["startGMT"]
value = df_steps["steps"]

half_year_locator = mdates.MonthLocator(interval=1)

# Example: June, 2018
month_year_formatter = mdates.DateFormatter('%b, %Y') # The "," is intentional.

fig, ax = plt.subplots(figsize=(8, 8))

monthly_locator = mdates.MonthLocator()
ax.xaxis.set_major_locator(half_year_locator)
ax.xaxis.set_minor_locator(monthly_locator)
ax.xaxis.set_major_formatter(month_year_formatter)
ax.plot(date, value)

fig.autofmt_xdate()
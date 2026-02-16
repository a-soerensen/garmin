# -*- coding: utf-8 -*-
"""
Created on Sat Sep 30 01:30:54 2023

@author: Andreas Sørensen
"""

### Sources:

#https://olgarithm.medium.com/garmin-connect-get-the-data-85f3312ae56b

#https://pypi.org/project/garminconnect/0.1.53/

"""
PACKAGES
"""

import os
from dotenv import load_dotenv
import datetime
from datetime import date
import json
from garminconnect import Garmin

"""
SETUP PATHS AND OUTPUT
"""

""" Set up and return necessary paths """
#outpath = os.path.join(os.getenv('APPDATA').replace("\\AppData\\Roaming", ""), "GitHub", "garmin", "data")
outpath = 'C:/Users/assn/GitHub/garmin/data/'

"""
LOAD ENVIRONMENT VARIABLES (USER CREDENTIALS)
"""
load_dotenv("secret/.env")

email = os.getenv("email")
password = os.getenv("password")

"""
API SETUP
"""
api = Garmin(email, password)
api.login()

"""
DEFINE WHAT DATA TO DOWNLOAD THROUGH THREE FUNCTIONS
"""

def get_statistics_data(day):
    
    """
    USER STATISTIC SUMMARIES
    """
    
    # Create directory
    try: os.mkdir(outpath+"statistics_data")
    except: pass

    """ user statistics """
    stats = api.get_stats(day.isoformat())
    try: os.mkdir(outpath+"statistics_data/stats")
    except: pass
    with open(outpath + "statistics_data/stats/" + str(day.isoformat()) + '_stats.json', 'w') as f:
        json.dump(stats, f, indent=4)

    """ user summary """
    user_summary = api.get_user_summary(day.isoformat())
    try: os.mkdir(outpath+"statistics_data/user_summary")
    except: pass
    with open(outpath + "statistics_data/user_summary/" +str(day.isoformat()) + '_user_summary.json', 'w') as f:
        json.dump(user_summary, f, indent=4)

    """ body composition """
    body_composition = api.get_body_composition(day.isoformat())
    try: os.mkdir(outpath+"statistics_data/body_composition")
    except: pass
    with open(outpath + "statistics_data/body_composition/" + str(day.isoformat()) + '_body_composition.json', 'w') as f:
        json.dump(body_composition, f, indent=4)

    """ stats_and_body """
    stats_and_body = api.get_stats_and_body(day.isoformat())
    try: os.mkdir(outpath+"statistics_data/stats_and_body")
    except: pass
    with open(outpath + "statistics_data/stats_and_body/" + str(day.isoformat()) + '_stats_and_body.json', 'w') as f:
        json.dump(stats_and_body, f, indent=4)

def get_logged_data(day):

    """
    USER STATISTIC LOGGED
    """    
    
    # Create directory
    try: os.mkdir(outpath+"logged_data")
    except: pass
    
    """ steps_data """
    steps_data = api.get_steps_data(day.isoformat())
    try: os.mkdir(outpath+"logged_data/steps_data")
    except: pass
    with open(outpath + "logged_data/steps_data/" + str(day.isoformat()) + '_steps_data.json', 'w') as f:
        json.dump(steps_data, f, indent=4)
    
    """ heart_rates """
    heart_rates = api.get_heart_rates(day.isoformat())
    try: os.mkdir(outpath+"logged_data/heart_rates")
    except: pass
    with open(outpath + "logged_data/heart_rates/" + str(day.isoformat()) + '_heart_rates.json', 'w') as f:
        json.dump(heart_rates, f, indent=4)
    
    """ training_readiness """
    training_readiness = api.get_training_readiness(day.isoformat())
    try: os.mkdir(outpath+"logged_data/training_readiness")
    except: pass
    with open(outpath + "logged_data/training_readiness/" + str(day.isoformat()) + '_training_readiness.json', 'w') as f:
        json.dump(training_readiness, f, indent=4)

    """ body_battery """
    body_battery = api.get_body_battery(day.isoformat())
    try: os.mkdir(outpath+"logged_data/body_battery")
    except: pass
    with open(outpath + "logged_data/body_battery/" + str(day.isoformat()) + '_body_battery.json', 'w') as f:
        json.dump(body_battery, f, indent=4)
    
    """ blood_pressure """
    blood_pressure = api.get_blood_pressure(day.isoformat())
    try: os.mkdir(outpath+"logged_data/blood_pressure")
    except: pass
    with open(outpath + "logged_data/blood_pressure/" + str(day.isoformat()) + '_blood_pressure.json', 'w') as f:
        json.dump(blood_pressure, f, indent=4)

    """ daily_steps """
    daily_steps = api.get_daily_steps(day.isoformat(),day.isoformat())
    try: os.mkdir(outpath+"logged_data/daily_steps")
    except: pass
    with open(outpath + "logged_data/daily_steps/" + str(day.isoformat()) + '_daily_steps.json', 'w') as f:
        json.dump(daily_steps, f, indent=4)

    """ floors """
    floors = api.get_floors(day.isoformat())
    try: os.mkdir(outpath+"logged_data/floors")
    except: pass
    with open(outpath + "logged_data/floors/" + str(day.isoformat()) + '_floors.json', 'w') as f:
        json.dump(floors, f, indent=4)

    """ training_status """
    training_status = api.get_training_status(day.isoformat())
    try: os.mkdir(outpath+"logged_data/training_status")
    except: pass
    with open(outpath + "logged_data/training_status/" + str(day.isoformat()) + '_training_status.json', 'w') as f:
        json.dump(training_status, f, indent=4)

    """ resting heart rate """
    rhr_day = api.get_rhr_day(day.isoformat())
    try: os.mkdir(outpath+"logged_data/rhr_day")
    except: pass
    with open(outpath + "logged_data/rhr_day/" + str(day.isoformat()) + '_rhr_day.json', 'w') as f:
        json.dump(rhr_day, f, indent=4)

    """ hydration_data """
    hydration_data = api.get_hydration_data(day.isoformat())
    try: os.mkdir(outpath+"logged_data/hydration_data")
    except: pass
    with open(outpath + "logged_data/hydration_data/" + str(day.isoformat()) + '_hydration_data.json', 'w') as f:
        json.dump(hydration_data, f, indent=4)

    """ sleep_data """
    sleep_data = api.get_sleep_data(day.isoformat())
    try: os.mkdir(outpath+"logged_data/sleep_data")
    except: pass
    with open(outpath + "logged_data/sleep_data/" + str(day.isoformat()) + '_sleep_data.json', 'w') as f:
        json.dump(sleep_data, f, indent=4)

    """ stress_data """
    stress_data = api.get_stress_data(day.isoformat())
    try: os.mkdir(outpath+"logged_data/stress_data")
    except: pass
    with open(outpath + "logged_data/stress_data/" + str(day.isoformat()) + '_stress_data.json', 'w') as f:
        json.dump(stress_data, f, indent=4)

    """ respiration_data """
    respiration_data = api.get_respiration_data(day.isoformat())
    try: os.mkdir(outpath+"logged_data/respiration_data")
    except: pass
    with open(outpath + "logged_data/respiration_data/" + str(day.isoformat()) + '_respiration_data.json', 'w') as f:
        json.dump(respiration_data, f, indent=4)

    """ spo2_data """
    spo2_data = api.get_spo2_data(day.isoformat())
    try: os.mkdir(outpath+"logged_data/spo2_data")
    except: pass
    with open(outpath + "logged_data/spo2_data/" + str(day.isoformat()) + '_spo2_data.json', 'w') as f:
        json.dump(spo2_data, f, indent=4)

    """ max_metrics """
    max_metrics = api.get_max_metrics(day.isoformat())
    try: os.mkdir(outpath+"logged_data/max_metrics")
    except: pass
    with open(outpath + "logged_data/max_metrics/" + str(day.isoformat()) + '_max_metrics.json', 'w') as f:
        json.dump(max_metrics, f, indent=4)

    """ personal_record """
    personal_record = api.get_personal_record()
    try: os.mkdir(outpath+"logged_data/personal_record")
    except: pass
    with open(outpath + "logged_data/personal_record/" + str(day.isoformat()) + '_personal_record.json', 'w') as f:
        json.dump(personal_record, f, indent=4)

def get_activity_data(start,limit):
 
    """
    GET ACTIVITIES
    """

    # Create directory
    try: os.mkdir(outpath+"activity_data")
    except: pass    

    """ activities """
    activities = api.get_activities(start,limit)
    try: os.mkdir(outpath+"activity_data/all_activities")
    except: pass
    with open(outpath + "activity_data/all_activities/" + str(date.today().isoformat()) + '_all_activities.json', 'w') as f:
        json.dump(activities, f, indent=4)

    for activity in activities:
        activity_id = activity.get("activityId")
        activity_date = str(activity.get("startTimeLocal")).split(" ")[0]
        
        """ activity core """
        activity_core = api.get_activity(activity_id)
        try: os.mkdir(outpath+"activity_data/activity_core")
        except: pass
        with open(outpath + "activity_data/activity_core/" + activity_date + '_activity_core.json', 'w') as f:
            json.dump(activity_core, f, indent=4)
        
        """ activity_splits """
        activity_splits = api.get_activity_splits(activity_id)
        try: os.mkdir(outpath+"activity_data/activity_splits")
        except: pass
        with open(outpath + "activity_data/activity_splits/" + activity_date + '_activity_splits.json', 'w') as f:
            json.dump(activity_splits, f, indent=4)
            
        """ activity_split_summaries """
        activity_split_summaries = api.get_activity_split_summaries(activity_id)
        try: os.mkdir(outpath+"activity_data/activity_split_summaries")
        except: pass
        with open(outpath + "activity_data/activity_split_summaries/" + activity_date + '_activity_split_summaries.json', 'w') as f:
            json.dump(activity_split_summaries, f, indent=4)
            
        """ activity_weather """
        activity_weather = api.get_activity_weather(activity_id)
        try: os.mkdir(outpath+"activity_data/activity_weather")
        except: pass
        with open(outpath + "activity_data/activity_weather/" + activity_date + '_activity_weather.json', 'w') as f:
            json.dump(activity_weather, f, indent=4)
        
        """ activity_hr_in_timezones """
        activity_hr_in_timezones = api.get_activity_hr_in_timezones(activity_id)
        try: os.mkdir(outpath+"activity_data/activity_hr_in_timezones")
        except: pass
        with open(outpath + "activity_data/activity_hr_in_timezones/" + activity_date + '_activity_hr_in_timezones.json', 'w') as f:
            json.dump(activity_hr_in_timezones, f, indent=4)
        
        """ activity_exercise_sets """
        activity_exercise_sets = api.get_activity_exercise_sets(activity_id)
        try: os.mkdir(outpath+"activity_data/activity_exercise_sets")
        except: pass
        with open(outpath + "activity_data/activity_exercise_sets/" + activity_date + '_activity_exercise_sets.json', 'w') as f:
            json.dump(activity_exercise_sets, f, indent=4)
        
        """ activity_gear """
        activity_gear = api.get_activity_gear(activity_id)
        try: os.mkdir(outpath+"activity_data/activity_gear")
        except: pass
        with open(outpath + "activity_data/activity_gear/" + activity_date + '_activity_gear.json', 'w') as f:
            json.dump(activity_gear, f, indent=4)
        
        """ activity_details """
        activity_details = api.get_activity_details(activity_id)
        try: os.mkdir(outpath+"activity_data/activity_details")
        except: pass
        with open(outpath + "activity_data/activity_details/" + activity_date + '_activity_details.json', 'w') as f:
            json.dump(activity_details, f, indent=4)
        
        """
        Download activity data files in .gpx, .tcx, .zip, .csv
        """
        
        # .gpx (GPS data)
        gpx_data = api.download_activity(activity_id,dl_fmt=api.ActivityDownloadFormat.GPX)
        try: os.mkdir(outpath+"activity_data/gpx")
        except: pass
        with open(f"{outpath}activity_data/gpx/{activity_date}_gpx_data.gpx", "wb") as fb:
            fb.write(gpx_data)
        
        # .tcx (Training Center XML)
        tcx_data = api.download_activity(activity_id,dl_fmt=api.ActivityDownloadFormat.TCX)
        try: os.mkdir(outpath+"activity_data/tcx")
        except: pass
        with open(f"{outpath}activity_data/tcx/{activity_date}_tcx_data.tcx", "wb") as fb:
            fb.write(tcx_data)
        
        # .zip
        zip_data = api.download_activity(activity_id,dl_fmt=api.ActivityDownloadFormat.ORIGINAL)
        try: os.mkdir(outpath+"activity_data/zip")
        except: pass
        with open(f"{outpath}activity_data/zip/{activity_date}_zip_data.zip", "wb") as fb:
            fb.write(zip_data)
        
        # .csv
        csv_data = api.download_activity(activity_id,dl_fmt=api.ActivityDownloadFormat.CSV)
        try: os.mkdir(outpath+"activity_data/csv")
        except: pass
        with open(f"{outpath}activity_data/csv/{activity_date}_csv_data.csv", "wb") as fb:
            fb.write(csv_data)
        
"""
RUN THE DATA EXTRACTION
"""

choice = input("Enter 1 to download statistics and logged data or 2 to download activity data: ")

if choice == '1':
    
    days_to_download = int(input("Enter the number of days to download data for, starting from today: "))
    
    ### Set the date range
    date_list = [date.today() - datetime.timedelta(days=x) for x in range(days_to_download)]
    
    ### Download daily statistics and logged data
    for i in range(len(date_list)):
        print("processing data for:", date_list[i])
        get_statistics_data(date_list[i])
        get_logged_data(date_list[i])

elif choice == '2':

    ### Download all activitity data
    print("processing activity data")
    start = 0
    limit = int(input("Enter the number of activities to download data for, starting from today: "))
    get_activity_data(start,limit)

#api.logout()
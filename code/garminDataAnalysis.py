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
import matplotlib.pyplot as plt
import matplotlib.font_manager as font_manager
import seaborn as sns

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
IMPORT DATA
"""

"""
SETUP DATA VISUALIZATIONS
"""

""" DISTRIBUTION - VIOLIN PLOT """
#df = sns.load_dataset('iris')
# plot
#sns.violinplot(x=df["species"],y=df["sepal_length"])


""" DISTRIBUTION - DENSITY PLOT """
#df = sns.load_dataset('iris')
# plot
#sns.kdeplot(df["sepal_width"])

""" DISTRIBUTION - HISTOGRAM PLOT """



""" DISTRIBUTION - BOXPLOT PLOT """


""" DISTRIBUTION - RIDGELINE """

run = False
if run == True:
    

        
    rent_path = 'https://raw.githubusercontent.com/holtzy/The-Python-Graph-Gallery/master/static/data/rent.csv'
    rent = pd.read_csv(rent_path)
    
    rent_words_path = 'https://raw.githubusercontent.com/holtzy/The-Python-Graph-Gallery/master/static/data/rent_title_words.csv'
    rent_words = pd.read_csv(rent_words_path)
    
    df_path = 'https://raw.githubusercontent.com/holtzy/The-Python-Graph-Gallery/master/static/data/df_plot.csv'
    df = pd.read_csv(df_path)
    
    ngroups = df['word'].nunique()    # Dynamically calculate the number of rows in the chart.
    
    bandwidth = 1                     # Control how smooth you want the graphs
    
    ### Colour settings
    darkgreen = '#9BC184'
    midgreen = '#C2D6A4'
    lowgreen = '#E7E5CB'
    colors = [lowgreen, midgreen, darkgreen, midgreen, lowgreen]
    
    darkgrey = '#525252'
    
    ### Font setting
    font_path = 'C:\Windows\Fonts\KozMinPr6N-Regular.otf'
    font_prop = font_manager.FontProperties(fname=font_path, size=14)
    
    fig, axs = plt.subplots(nrows=15, ncols=1, figsize=(8, 10))
    axs = axs.flatten() # needed to access each individual axis
    
    # iterate over axes
    words = df.sort_values('mean_price')['word'].unique().tolist()
    for i, word in enumerate(words):
    
        # subset the data for each word
        subset = df[df['word'] == word]
    
        # plot the distribution of prices
        sns.kdeplot(
            subset['price'],
            shade=True,
            bw_adjust = bandwidth,
            ax=axs[i],
            color='grey',
            edgecolor='lightgrey'
        )
    
        # global mean reference line
        global_mean = rent['price'].mean()
        axs[i].axvline(global_mean, color=darkgrey, linestyle='--')
    
        # display average number of bedrooms on left
        rent_with_bed = rent_words[rent_words['beds'] > 0]
        rent_with_bed_filter = rent_with_bed[rent_with_bed['word'] == word]
        avg_bedrooms = rent_with_bed_filter['beds'].mean().round(1)
        axs[i].text(
            -600, 0,
            f'({avg_bedrooms})',
            ha='left',
            fontsize=10,
            fontproperties=font_prop,
            color=darkgrey
        )
    
        # display word on left
        axs[i].text(
            -2000, 0,
            word.upper(),
            ha='left',
            fontsize=10,
            fontproperties=font_prop,
            color=darkgrey
        )
    
        # compute quantiles
        quantiles = np.percentile(subset['price'], [2.5, 10, 25, 75, 90, 97.5])
        quantiles = quantiles.tolist()
    
        # fill space between each pair of quantiles
        for j in range(len(quantiles) - 1):
            axs[i].fill_between(
                [quantiles[j], # lower bound
                 quantiles[j+1]], # upper bound
                0, # max y=0
                0.0002, # max y=0.0002
                color=colors[j]
            )
    
        # mean value as a reference
        mean = subset['price'].mean()
        axs[i].scatter([mean], [0.0001], color='black', s=10)
    
        # set title and labels
        axs[i].set_xlim(0, 10000)
        axs[i].set_ylim(0, 0.001)
        axs[i].set_ylabel('')
    
        # x axis scale for last ax
        if i == 14:
            values = [2500, 5000, 7500, 10000]
            for value in values:
                axs[i].text(
                    value, -0.0005,
                    f'{value}',
                    ha='center',
                    fontsize=10
                )
    
        # remove axis
        axs[i].set_axis_off()
    
    # reference line label
    text = 'Mean rent'
    fig.text(
        0.35, 0.88,
        text,
        ha='center',
        fontsize=10
    )
    
    # number of bedrooms label
    text = '(Ø bedrooms)'
    fig.text(
        0.04, 0.88,
        text,
        ha='left',
        fontsize=10,
        fontproperties=font_prop,
        color=darkgrey
    )
    
    # credit
    text = """
    Axis capped at 10,000 USD.
    Data: Pennington, Kate (2018).
    Bay Area Craigslist Rental Housing Posts, 2000-2018.
    Retrieved from github.com/katepennington/historic_bay_area_craigslist_housing_posts/blob/master/clean_2000_2018.csv.zip.
    Visualization: Ansgar Wolsing
    """
    fig.text(
        -0.03, -0.05,
        text,
        ha='left',
        fontsize=8,
        fontproperties=font_prop
    )
    
    # x axis label
    text = "Rent in USD"
    fig.text(
        0.5, 0.06,
        text,
        ha='center',
        fontsize=14,
        fontproperties=font_prop
    )
    
    # description
    text = """
    A Ridgeline plit depicting the average pace of each activity is visualized as a distribution for each month of the year.
    """
    fig.text(
        -0.03, 0.9,
        text,
        ha='left',
        fontsize=14,
        fontproperties=font_prop
    )
    
    # title
    text = "AVERAGE PACE OVER THE COURSE OF A YEAR"
    fig.text(
        -0.03, 1.01,
        text,
        ha='left',
        fontsize=18,
        fontproperties=font_prop
    )
    
    plt.savefig(f'{outpath}/web-ridgeline-by-text-1.png', dpi=300, bbox_inches='tight')
    plt.show()
    
""" DISTRIBUTION - BEESWARM PLOT """








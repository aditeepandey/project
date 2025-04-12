"""
Data Processor for Career Path Predictor
This module handles loading and processing data used in the application.
"""

import json
import os
import logging
from collections import defaultdict
import random

logger = logging.getLogger(__name__)


def load_data(filename):
    """
    Load JSON data from the static/data directory

    Args:
        filename (str): Name of the JSON file to load

    Returns:
        dict or list: Loaded data from the JSON file
    """
    try:
        file_path = os.path.join('static', 'data', filename)
        with open(file_path, 'r') as f:
            data = json.load(f)
        return data
    except Exception as e:
        logger.error(f"Error loading data file {filename}: {str(e)}")
        # Return empty data structure based on filename
        if filename == 'career_data.json':
            return []
        elif filename == 'skill_data.json':
            return {}
        elif filename == 'market_trends.json':
            return {"careers": []}
        else:
            return {}


def get_market_trend_data(recommendations, market_trends):
    """
    Extract market trend data for the recommended careers

    Args:
        recommendations (list): List of recommended career paths
        market_trends (dict): Market trend data for various careers

    Returns:
        dict: Relevant market trend data for visualizations
    """
    trend_data = {
        "careers": []
    }

    # Get recommended career titles
    recommended_titles = [career['title'] for career in recommendations]

    # Find corresponding market trend data
    for career in market_trends.get('careers', []):
        if career['name'] in recommended_titles:
            trend_data['careers'].append(career)

    # If we don't have trend data for some recommendations, add placeholder data
    if len(trend_data['careers']) < len(recommendations):
        for career in recommendations:
            if career['title'] not in [c['name'] for c in trend_data['careers']]:
                # Add reasonable default data
                trend_data['careers'].append({
                    'name': career['title'],
                    'growth': random.randint(5, 15),  # 5-15% growth rate
                    'demand': random.randint(6, 9)  # 6-9 demand level
                })

    # Add a few related careers for comparison
    related_careers = [
        career for career in market_trends.get('careers', [])
        if career['name'] not in recommended_titles
    ]

    if related_careers:
        # Add up to 2 related careers
        for related in related_careers[:2]:
            trend_data['careers'].append(related)

    return trend_data


def get_skill_categories(recommendations, skill_data):
    """
    Get skill categories and needed skills for recommendations

    Args:
        recommendations (list): List of recommended career paths
        skill_data (dict): Skill categories and details

    Returns:
        dict: Relevant skills for the recommended careers
    """
    relevant_skills = defaultdict(list)

    # Get all required skills from recommendations
    all_required_skills = []
    for career in recommendations:
        all_required_skills.extend(career.get('required_skills', []))

    # Unique skills
    all_required_skills = list(set(all_required_skills))

    # Find matching skills in skill data
    for category, skills in skill_data.items():
        for skill in skills:
            if skill['name'] in all_required_skills:
                relevant_skills[category].append(skill)

    return dict(relevant_skills)

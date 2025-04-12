"""
Recommendation Engine for Career Path Predictor
This module handles the logic for generating career recommendations
based on user input.
"""

import logging
import math
import random

logger = logging.getLogger(__name__)


def get_career_recommendations(academic_data, interests, skills, education_level, career_data):
    """
    Generate career recommendations based on user input

    Args:
        academic_data (dict): Dictionary containing academic performance metrics
        interests (list): List of user interests
        skills (list): List of user skills
        education_level (str): User's education level
        career_data (dict): Dictionary containing career information

    Returns:
        list: List of recommended careers with match scores and explanations
    """
    logger.debug("Generating career recommendations")
    recommendations = []

    # Calculate base match scores for each career
    for career in career_data:
        match_score = calculate_match_score(
            career,
            academic_data,
            interests,
            skills,
            education_level
        )

        # Only include careers with a match score above 50%
        if match_score >= 50:
            # Create a copy of the career data and add match score
            career_recommendation = dict(career)
            career_recommendation['match_score'] = match_score

            # Generate personalized upskilling path based on user's current skills
            career_recommendation['upskilling_path'] = generate_upskilling_path(
                career,
                skills,
                education_level
            )

            recommendations.append(career_recommendation)

    # Sort recommendations by match score (highest first)
    recommendations.sort(key=lambda x: x['match_score'], reverse=True)

    # Return top 3 recommendations
    return recommendations[:3]


def calculate_match_score(career, academic_data, interests, skills, education_level):
    """
    Calculate a match score between a career and user profile

    Args:
        career (dict): Career information
        academic_data (dict): User's academic data
        interests (list): User's interests
        skills (list): User's skills
        education_level (str): User's education level

    Returns:
        int: Match score as a percentage (0-100)
    """
    total_score = 0

    # 1. Education match (25% weight)
    education_score = calculate_education_match(career['education_required'], education_level)

    # 2. Skills match (25% weight)
    skills_score = calculate_skills_match(career['required_skills'], skills)

    # 3. Interests match (20% weight)
    interests_score = calculate_interests_match(career['related_interests'], interests)

    # 4. Academic performance match (30% weight)
    academic_score = calculate_academic_match(career['academic_requirements'], academic_data)

    # Calculate weighted total
    total_score = (
            education_score * 0.25 +
            skills_score * 0.25 +
            interests_score * 0.20 +
            academic_score * 0.30
    )

    # Convert to percentage and round to nearest integer
    match_percentage = round(total_score * 100)

    # Cap at 100%
    return min(match_percentage, 100)


def calculate_education_match(required_education, user_education):
    """
    Calculate education match score (0-1)

    Args:
        required_education (str): Required education for the career
        user_education (str): User's education level

    Returns:
        float: Match score between 0 and 1
    """
    # Education levels in order of advancement
    education_levels = [
        'high_school',
        'associates',
        'bachelors',
        'masters',
        'phd'
    ]

    # Get indices for comparison
    try:
        required_index = education_levels.index(required_education.lower().replace(' ', '_'))
        user_index = education_levels.index(user_education)

        if user_index >= required_index:
            # User meets or exceeds the required education
            return 1.0
        else:
            # User's education is below required level
            # Calculate partial score based on how close they are
            return 0.5 * (user_index / required_index)

    except (ValueError, AttributeError):
        # Default to middle score if there's an error
        return 0.5


def calculate_skills_match(required_skills, user_skills):
    """
    Calculate skills match score (0-1)

    Args:
        required_skills (list): Skills required for the career
        user_skills (list): User's skills

    Returns:
        float: Match score between 0 and 1
    """
    if not required_skills or not user_skills:
        return 0.5

    # Count matching skills
    matches = sum(1 for skill in required_skills if skill.lower() in [s.lower() for s in user_skills])

    # Calculate score based on the ratio of matches to required skills
    # but give partial credit even for no matches
    return 0.2 + (0.8 * (matches / len(required_skills)))


def calculate_interests_match(related_interests, user_interests):
    """
    Calculate interests match score (0-1)

    Args:
        related_interests (list): Interests related to the career
        user_interests (list): User's interests

    Returns:
        float: Match score between 0 and 1
    """
    if not related_interests or not user_interests:
        return 0.5

    # Count matching interests
    matches = sum(1 for interest in related_interests if interest.lower() in [i.lower() for i in user_interests])

    # Calculate score based on the ratio of matches to related interests
    # but give partial credit even for no matches
    return 0.3 + (0.7 * (matches / len(related_interests)))


def calculate_academic_match(academic_requirements, user_academics):
    """
    Calculate academic match score (0-1)

    Args:
        academic_requirements (dict): Academic requirements for the career
        user_academics (dict): User's academic performance

    Returns:
        float: Match score between 0 and 1
    """
    total_score = 0

    # Check GPA requirement if specified
    if 'min_gpa' in academic_requirements and user_academics.get('gpa') is not None:
        min_gpa = academic_requirements['min_gpa']  # This is on a 4.0 scale in our data
        user_gpa = user_academics['gpa']  # This is on a 10.0 scale as input by user

        # Convert min_gpa from 4.0 scale to 10.0 scale for comparison
        scaled_min_gpa = min_gpa * 2.5

        if user_gpa >= scaled_min_gpa:
            total_score += 1
        else:
            # Partial score for being close
            total_score += max(0, user_gpa / scaled_min_gpa)

    # Check subject requirements
    subjects = {
        'math_score': academic_requirements.get('math', 0),
        'science_score': academic_requirements.get('science', 0),
        'language_score': academic_requirements.get('language', 0),
        'humanities_score': academic_requirements.get('humanities', 0),
        'computer_score': academic_requirements.get('computer', 0)
    }

    subject_count = sum(1 for score in subjects.values() if score > 0)
    if subject_count > 0:
        subject_score = 0
        for subject, required_score in subjects.items():
            if required_score > 0:
                user_score = user_academics.get(subject, 0)
                # Calculate score ratio but cap at 1.0
                subject_score += min(1.0, user_score / required_score)

        # Average the subject scores
        total_score += (subject_score / subject_count)
    else:
        # If no specific subject requirements, just add 1 to total
        total_score += 1

    # Return average score (divide by number of components evaluated)
    components_evaluated = 2  # GPA and subjects
    return total_score / components_evaluated


def generate_upskilling_path(career, user_skills, education_level):
    """
    Generate a personalized upskilling path based on career requirements and user skills

    Args:
        career (dict): Career information
        user_skills (list): User's current skills
        education_level (str): User's education level

    Returns:
        list: List of upskilling steps
    """
    upskilling_path = []

    # 1. Check if education needs to be upgraded
    education_steps = generate_education_steps(career['education_required'], education_level)
    if education_steps:
        upskilling_path.extend(education_steps)

    # 2. Check skills gaps
    skill_steps = generate_skill_steps(career['required_skills'], user_skills)
    if skill_steps:
        upskilling_path.extend(skill_steps)

    # 3. Add industry certification recommendations
    if 'recommended_certifications' in career:
        cert_step = {
            'title': 'Obtain Industry Certifications',
            'description': 'These certifications will make you more competitive in the job market.',
            'resources': ', '.join(career['recommended_certifications'][:3])
        }
        upskilling_path.append(cert_step)

    # 4. Add practical experience recommendation
    experience_step = {
        'title': 'Gain Practical Experience',
        'description': f'Look for internships, projects or entry-level positions in {career["title"]} or related fields.',
        'resources': 'LinkedIn, Indeed, Internship.com'
    }
    upskilling_path.append(experience_step)

    # 5. Add networking recommendation
    networking_step = {
        'title': 'Build Professional Network',
        'description': f'Connect with professionals in {career["title"]} field through industry events and online platforms.',
        'resources': 'LinkedIn, Professional Associations, Meetup groups'
    }
    upskilling_path.append(networking_step)

    return upskilling_path


def generate_education_steps(required_education, user_education):
    """
    Generate education upskilling steps if needed

    Args:
        required_education (str): Required education for the career
        user_education (str): User's education level

    Returns:
        list: List of education upskilling steps
    """
    # Education levels in order of advancement
    education_levels = [
        'high_school',
        'associates',
        'bachelors',
        'masters',
        'phd'
    ]

    education_names = {
        'high_school': 'High School Diploma',
        'associates': "Associate's Degree",
        'bachelors': "Bachelor's Degree",
        'masters': "Master's Degree",
        'phd': 'PhD or Doctorate'
    }

    steps = []

    try:
        required_index = education_levels.index(required_education.lower().replace(' ', '_'))
        user_index = education_levels.index(user_education)

        if user_index < required_index:
            # User needs to upgrade education
            next_level = education_levels[user_index + 1]
            next_level_name = education_names[next_level]

            step = {
                'title': f'Obtain {next_level_name}',
                'description': f'Your current education level needs to be upgraded to meet requirements for this career path.',
                'resources': 'Universities, Community Colleges, Online Education Platforms'
            }
            steps.append(step)

            # If there's more than one level to upgrade, add a note
            if required_index - user_index > 1:
                step = {
                    'title': f'Plan for {education_names[education_levels[required_index]]}',
                    'description': 'Long-term educational goal to fully qualify for this career path.',
                    'resources': 'Academic Advisors, Career Counselors'
                }
                steps.append(step)

    except (ValueError, IndexError):
        # No specific education steps if there's an error
        pass

    return steps


def generate_skill_steps(required_skills, user_skills):
    """
    Generate skill upskilling steps based on gaps

    Args:
        required_skills (list): Skills required for the career
        user_skills (list): User's current skills

    Returns:
        list: List of skill upskilling steps
    """
    steps = []
    user_skills_lower = [s.lower() for s in user_skills]

    # Find missing skills
    missing_skills = [skill for skill in required_skills if skill.lower() not in user_skills_lower]

    if missing_skills:
        # Group similar skills to avoid too many steps
        skill_categories = {
            'technical': [],
            'soft': [],
            'industry': []
        }

        # Simple categorization
        for skill in missing_skills:
            skill_lower = skill.lower()
            if any(tech in skill_lower for tech in
                   ['programming', 'coding', 'software', 'data', 'technical', 'analysis']):
                skill_categories['technical'].append(skill)
            elif any(soft in skill_lower for soft in
                     ['communication', 'leadership', 'teamwork', 'management', 'problem']):
                skill_categories['soft'].append(skill)
            else:
                skill_categories['industry'].append(skill)

        # Create steps for non-empty categories
        if skill_categories['technical']:
            tech_skills = ', '.join(skill_categories['technical'])
            step = {
                'title': 'Develop Technical Skills',
                'description': f'Focus on acquiring these technical skills: {tech_skills}',
                'resources': 'Coursera, Udemy, edX, freeCodeCamp'
            }
            steps.append(step)

        if skill_categories['soft']:
            soft_skills = ', '.join(skill_categories['soft'])
            step = {
                'title': 'Enhance Soft Skills',
                'description': f'Develop these important soft skills: {soft_skills}',
                'resources': 'LinkedIn Learning, Books, Toastmasters, Workshops'
            }
            steps.append(step)

        if skill_categories['industry']:
            industry_skills = ', '.join(skill_categories['industry'])
            step = {
                'title': 'Acquire Industry-Specific Knowledge',
                'description': f'Learn these industry-specific skills: {industry_skills}',
                'resources': 'Industry Associations, Specialized Courses, Online Forums'
            }
            steps.append(step)

    return steps

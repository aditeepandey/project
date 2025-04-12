"""
Models for Career Path Predictor
This module defines the database models for the application
"""

from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app import db  # Import the db instance from app.py


class User(UserMixin, db.Model):
    """
    User model to store user information and preferences
    """
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    profiles = db.relationship('UserProfile', backref='user', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        """Set password hash"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check password against stored hash"""
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'


class UserProfile(db.Model):
    """
    User profile model to store academic performance, interests, and skills
    """
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # Academic information
    education_level = db.Column(db.String(50), nullable=False)
    gpa = db.Column(db.Float, nullable=False)
    math_score = db.Column(db.Integer, nullable=False)
    science_score = db.Column(db.Integer, nullable=False)
    language_score = db.Column(db.Integer, nullable=False)
    humanities_score = db.Column(db.Integer, nullable=False)
    computer_score = db.Column(db.Integer, nullable=False)

    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    interests = db.relationship('Interest', secondary='user_interests', lazy='subquery',
                                backref=db.backref('user_profiles', lazy=True))
    skills = db.relationship('Skill', secondary='user_skills', lazy='subquery',
                             backref=db.backref('user_profiles', lazy=True))
    recommendations = db.relationship('CareerRecommendation', backref='user_profile', lazy=True,
                                      cascade="all, delete-orphan")

    def __repr__(self):
        return f'<UserProfile {self.id} for User {self.user_id}>'


class Interest(db.Model):
    """
    Interest model to store available interests
    """
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

    def __repr__(self):
        return f'<Interest {self.name}>'


class Skill(db.Model):
    """
    Skill model to store available skills
    """
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

    def __repr__(self):
        return f'<Skill {self.name}>'


# Association tables for many-to-many relationships
user_interests = db.Table('user_interests',
                          db.Column('user_profile_id', db.Integer, db.ForeignKey('user_profile.id'), primary_key=True),
                          db.Column('interest_id', db.Integer, db.ForeignKey('interest.id'), primary_key=True)
                          )

user_skills = db.Table('user_skills',
                       db.Column('user_profile_id', db.Integer, db.ForeignKey('user_profile.id'), primary_key=True),
                       db.Column('skill_id', db.Integer, db.ForeignKey('skill.id'), primary_key=True)
                       )


class CareerRecommendation(db.Model):
    """
    Career recommendation model to store recommendations for users
    """
    id = db.Column(db.Integer, primary_key=True)
    user_profile_id = db.Column(db.Integer, db.ForeignKey('user_profile.id'), nullable=False)

    # Career information
    title = db.Column(db.String(100), nullable=False)
    match_score = db.Column(db.Integer, nullable=False)  # Store as percentage (0-100)
    salary_min = db.Column(db.Integer)
    salary_max = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<CareerRecommendation {self.title} for Profile {self.user_profile_id}>'
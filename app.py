import os
import logging
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from utils.recommendation_engine import get_career_recommendations
from utils.data_processor import load_data, get_market_trend_data

# Set up logging
logging.basicConfig(level=logging.DEBUG)


# Define the base class for SQLAlchemy models
class Base(DeclarativeBase):
    pass


# Initialize SQLAlchemy with the base class
db = SQLAlchemy(model_class=Base)

# Create the Flask application
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev_secret_key")

# Configure database
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///career_predictor.db"
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
# Initialize the app with the extension
db.init_app(app)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message_category = 'info'


@login_manager.user_loader
def load_user(user_id):
    from models import User
    return User.query.get(int(user_id))


# Context processor for template variables
@app.context_processor
def inject_now():
    from datetime import datetime
    return {'now': datetime.utcnow()}


# Load career and skill data
career_data = load_data('career_data.json')
skill_data = load_data('skill_data.json')
market_trends = load_data('market_trends.json')


@app.route('/')
def index():
    """Display the main input form page"""
    return render_template('index.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    """User login page"""
    # If user is already logged in, redirect to home page
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    from forms import LoginForm
    form = LoginForm()

    if form.validate_on_submit():
        from models import User
        user = User.query.filter_by(email=form.email.data).first()

        if user and user.check_password(form.password.data):
            login_user(user, remember=form.remember.data)
            flash('Login successful!', 'success')

            # Redirect to the page the user was trying to access
            next_page = request.args.get('next')
            return redirect(next_page if next_page else url_for('index'))
        else:
            flash('Login failed. Please check your email and password.', 'danger')

    return render_template('login.html', form=form)


@app.route('/register', methods=['GET', 'POST'])
def register():
    """User registration page"""
    # If user is already logged in, redirect to home page
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    from forms import RegistrationForm
    form = RegistrationForm()

    if form.validate_on_submit():
        from models import User

        user = User(
            username=form.username.data,
            email=form.email.data
        )
        user.set_password(form.password.data)

        db.session.add(user)
        db.session.commit()

        flash('Registration successful! You can now log in.', 'success')
        return redirect(url_for('login'))

    return render_template('register.html', form=form)


@app.route('/logout')
@login_required
def logout():
    """Log out the current user"""
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('index'))


@app.route('/profile')
@login_required
def profile():
    """User profile page with assessment history"""
    from models import UserProfile

    # Get all profiles for the current user
    profiles = UserProfile.query.filter_by(user_id=current_user.id).order_by(UserProfile.created_at.desc()).all()

    return render_template('profile.html', profiles=profiles)


@app.route('/predict', methods=['POST'])
def predict():
    """Process form data and predict career paths"""
    if request.method == 'POST':
        try:
            # Academic data
            academic_data = {
                'gpa': float(request.form.get('gpa', 0)),
                'math_score': int(request.form.get('math_score', 0)),
                'science_score': int(request.form.get('science_score', 0)),
                'language_score': int(request.form.get('language_score', 0)),
                'humanities_score': int(request.form.get('humanities_score', 0)),
                'computer_score': int(request.form.get('computer_score', 0))
            }

            # Interest data
            interests = request.form.getlist('interests')
            skills = request.form.getlist('skills')

            # Additional info
            education_level = request.form.get('education_level', '')
            email = request.form.get('email', '')

            # Store data in session for use in results page
            session['user_data'] = {
                'academic': academic_data,
                'interests': interests,
                'skills': skills,
                'education_level': education_level,
                'email': email
            }

            # Get career recommendations
            recommendations = get_career_recommendations(
                academic_data,
                interests,
                skills,
                education_level,
                career_data
            )

            # Get trend data for visualization
            trend_data = get_market_trend_data(recommendations, market_trends)

            # Store recommendations in session
            session['recommendations'] = recommendations
            session['trend_data'] = trend_data

            # Store data in database
            from models import User, UserProfile, Interest, Skill, CareerRecommendation

            # Check if user is logged in
            if current_user.is_authenticated:
                user = current_user
            # Create or get existing user
            elif email:
                user = User.query.filter_by(email=email).first()
                if not user:
                    # Create a temporary username based on email
                    username = email.split('@')[0]
                    # Make sure username is unique by adding a timestamp if needed
                    if User.query.filter_by(username=username).first():
                        from datetime import datetime
                        username = f"{username}{int(datetime.utcnow().timestamp())}"

                    # Create new user with placeholder password
                    user = User(username=username, email=email)
                    user.set_password('changeme')  # Users will need to reset password to access account
                    db.session.add(user)
                    db.session.commit()
            else:
                # Redirect to login for anonymous users
                flash('Please log in or provide an email to save your assessment.', 'warning')
                session['redirect_after_login'] = url_for('index')
                return redirect(url_for('login'))

            # Create a new user profile
            profile = UserProfile(
                user_id=user.id,
                education_level=education_level,
                gpa=academic_data['gpa'],
                math_score=academic_data['math_score'],
                science_score=academic_data['science_score'],
                language_score=academic_data['language_score'],
                humanities_score=academic_data['humanities_score'],
                computer_score=academic_data['computer_score']
            )
            db.session.add(profile)

            # Add interests
            for interest_name in interests:
                interest = Interest.query.filter_by(name=interest_name).first()
                if not interest:
                    interest = Interest(name=interest_name)
                    db.session.add(interest)
                profile.interests.append(interest)

            # Add skills
            for skill_name in skills:
                skill = Skill.query.filter_by(name=skill_name).first()
                if not skill:
                    skill = Skill(name=skill_name)
                    db.session.add(skill)
                profile.skills.append(skill)

            # Save career recommendations
            for rec in recommendations:
                career_rec = CareerRecommendation(
                    user_profile_id=profile.id,
                    title=rec['title'],
                    match_score=rec['match_score'],
                    salary_min=rec.get('salary_range', {}).get('min'),
                    salary_max=rec.get('salary_range', {}).get('max')
                )
                db.session.add(career_rec)

            # Commit all changes to the database
            db.session.commit()

            # Store profile ID in session
            session['profile_id'] = profile.id

            return redirect(url_for('results'))

        except Exception as e:
            logging.error(f"Error processing form data: {str(e)}")
            flash('An error occurred while processing your information. Please try again.', 'danger')
            return redirect(url_for('index'))

    return redirect(url_for('index'))


@app.route('/results')
def results():
    """Display career recommendations results"""
    # Check if we have recommendations in the session
    if 'recommendations' not in session:
        flash('Please complete the form first to get career recommendations.', 'warning')
        return redirect(url_for('index'))

    # Get data from session
    recommendations = session.get('recommendations', [])
    user_data = session.get('user_data', {})
    trend_data = session.get('trend_data', {})

    return render_template(
        'results.html',
        recommendations=recommendations,
        user_data=user_data,
        trend_data=trend_data,
        skill_data=skill_data
    )


@app.errorhandler(404)
def page_not_found(e):
    """Handle 404 errors"""
    return render_template('layout.html', error="Page not found"), 404


@app.route('/ai-assistant')
def ai_assistant():
    """AI career assistant chat interface"""
    return render_template('ai_assistant.html')


@app.route('/ai-chat', methods=['POST'])
def ai_chat():
    """Process AI chat requests"""
    if request.method == 'POST':
        try:
            user_message = request.form.get('message', '')

            # In a real implementation, this would call an AI API
            # For now, we'll use a simple response system
            response = generate_ai_response(user_message)

            return jsonify({'status': 'success', 'message': response})

        except Exception as e:
            logging.error(f"Error in AI chat: {str(e)}")
            return jsonify({'status': 'error', 'message': 'An error occurred while processing your request.'})

    return jsonify({'status': 'error', 'message': 'Invalid request method.'})


@app.route('/schedule-meeting')
def schedule_meeting():
    """Meeting scheduler with career professionals"""
    from datetime import datetime, timedelta
    tomorrow_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
    return render_template('schedule_meeting.html', tomorrow_date=tomorrow_date)


@app.route('/submit-meeting', methods=['POST'])
def submit_meeting():
    """Process meeting requests"""
    if request.method == 'POST':
        try:
            name = request.form.get('name', '')
            email = request.form.get('email', '')
            date = request.form.get('date', '')
            time = request.form.get('time', '')
            professional = request.form.get('professional', '')
            topic = request.form.get('topic', '')

            # Store meeting request in database
            # For now, just flash a success message
            flash('Your meeting request has been submitted. A confirmation email will be sent shortly.', 'success')
            return redirect(url_for('schedule_meeting'))

        except Exception as e:
            logging.error(f"Error scheduling meeting: {str(e)}")
            flash('An error occurred while processing your meeting request. Please try again.', 'danger')
            return redirect(url_for('schedule_meeting'))

    return redirect(url_for('schedule_meeting'))


def generate_ai_response(user_message):
    """
    Generate an AI response to a user message about careers

    Args:
        user_message (str): The user's question or message

    Returns:
        str: The AI-generated response
    """
    # In a real implementation, this would call an AI API like Perplexity

    # For now, implement a simple keyword-based response system
    user_message = user_message.lower()

    if 'best career' in user_message:
        return "The best career is one that aligns with your skills, interests, and values. Based on the assessment you've completed, consider exploring the recommended career paths and which ones resonate with you personally."

    elif 'salary' in user_message or 'pay' in user_message:
        return "Salaries vary widely based on location, experience, industry, and specific role. The career recommendations include salary ranges based on current market data, but these are averages and can vary significantly."

    elif 'education' in user_message or 'degree' in user_message:
        return "Educational requirements differ for each career path. Some may require specific degrees or certifications, while others value experience and skills more. Check the upskilling recommendations for each career to understand what educational steps might be beneficial."

    elif 'job market' in user_message or 'demand' in user_message:
        return "Job market trends change over time. Our recommendations consider current growth projections, but it's always good to research the latest trends for specific fields you're interested in. Industry publications and the Bureau of Labor Statistics are excellent resources."

    else:
        return "Thanks for your question. To provide more specific guidance, please complete the career assessment form. This will help us understand your profile better and offer personalized career advice."


@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors"""
    logging.error(f"Server error: {str(e)}")
    return render_template('layout.html', error="Internal server error. Please try again later."), 500

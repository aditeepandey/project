/**
 * Main JavaScript file for Career Path Predictor application
 */

document.addEventListener('DOMContentLoaded', function() {
    // Theme switching functionality
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    const htmlElement = document.documentElement;

    // Check if there's a saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'dark';

    // Apply the saved theme
    applyTheme(savedTheme);

    // Toggle theme when the button is clicked
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = htmlElement.classList.contains('theme-dark') ? 'dark' : 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            // Add a transition overlay
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = newTheme === 'dark' ? '#212529' : '#ffffff';
            overlay.style.zIndex = '9999';
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            overlay.style.transition = 'opacity 0.3s ease';
            document.body.appendChild(overlay);

            // Trigger a slight animation
            setTimeout(() => {
                overlay.style.opacity = '0.2';

                setTimeout(() => {
                    // Apply the new theme
                    applyTheme(newTheme);
                    localStorage.setItem('theme', newTheme);

                    // Fade out overlay
                    setTimeout(() => {
                        overlay.style.opacity = '0';

                        // Remove overlay
                        setTimeout(() => {
                            document.body.removeChild(overlay);
                        }, 300);
                    }, 100);
                }, 200);
            }, 10);
        });
    }

    // Function to apply theme
    function applyTheme(theme) {
        if (theme === 'light') {
            htmlElement.classList.remove('theme-dark');
            htmlElement.classList.add('theme-light');
            htmlElement.setAttribute('data-bs-theme', 'light');
            if (themeIcon) themeIcon.className = 'fas fa-sun me-1';
            if (themeText) themeText.textContent = 'Light Mode';
        } else {
            htmlElement.classList.remove('theme-light');
            htmlElement.classList.add('theme-dark');
            htmlElement.setAttribute('data-bs-theme', 'dark');
            if (themeIcon) themeIcon.className = 'fas fa-moon me-1';
            if (themeText) themeText.textContent = 'Dark Mode';
        }
    }

    // Set active navbar item based on current page
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.navbar .nav-link');

    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath) {
            link.classList.add('active');
            // If it's a dropdown item, also set the parent dropdown as active
            const parentDropdown = link.closest('.dropdown');
            if (parentDropdown) {
                const dropdownToggle = parentDropdown.querySelector('.dropdown-toggle');
                if (dropdownToggle) {
                    dropdownToggle.classList.add('active');
                }
            }
        }
    });

    // Form validation
    const careerForm = document.getElementById('careerForm');

    if (careerForm) {
        careerForm.addEventListener('submit', function(event) {
            // Check if at least one interest is selected
            const interests = document.querySelectorAll('input[name="interests"]:checked');
            if (interests.length === 0) {
                event.preventDefault();
                alert('Please select at least one interest');
                return false;
            }

            // Check if at least one skill is selected
            const skills = document.querySelectorAll('input[name="skills"]:checked');
            if (skills.length === 0) {
                event.preventDefault();
                alert('Please select at least one skill');
                return false;
            }

            // Validate numeric inputs
            const numericInputs = ['gpa', 'math_score', 'science_score', 'language_score', 'humanities_score', 'computer_score'];
            let valid = true;

            numericInputs.forEach(function(inputId) {
                const input = document.getElementById(inputId);
                const value = parseFloat(input.value);

                if (isNaN(value)) {
                    valid = false;
                    input.classList.add('is-invalid');
                } else {
                    input.classList.remove('is-invalid');

                    // Specific validation for GPA
                    if (inputId === 'gpa' && (value < 0 || value > 10)) {
                        valid = false;
                        input.classList.add('is-invalid');
                    }

                    // Validation for scores
                    if (inputId !== 'gpa' && (value < 0 || value > 100)) {
                        valid = false;
                        input.classList.add('is-invalid');
                    }
                }
            });

            if (!valid) {
                event.preventDefault();
                alert('Please correct the highlighted fields');
                return false;
            }
        });
    }

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Success message auto-hide
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(function(alert) {
        setTimeout(function() {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
});

/**
 * Helper function to animate numbers counting up
 * @param {Element} element - The element to update
 * @param {Number} start - Starting value
 * @param {Number} end - Ending value
 * @param {Number} duration - Duration in milliseconds
 */
function animateValue(element, start, end, duration) {
    if (!element) return;

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

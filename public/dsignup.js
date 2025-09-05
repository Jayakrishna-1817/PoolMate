document.addEventListener('DOMContentLoaded', function () {
    const signupForm = document.getElementById('driverSignupForm');
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const dobInput = document.getElementById('dob');
    const cityInput = document.getElementById('city');
    const stateInput = document.getElementById('state');
    const licenseNumberInput = document.getElementById('licenseNumber');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordToggle = document.getElementById('passwordToggle');
    const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
    const agreeTermsCheckbox = document.getElementById('agreeTerms');
    const signupBtn = document.getElementById('signupBtn');
    const toast = document.getElementById('toast');

    function setupPasswordToggle(toggleBtn, passwordField) {
        if (toggleBtn && passwordField) {
            toggleBtn.addEventListener('click', function () {
                const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordField.setAttribute('type', type);
                const icon = this.querySelector('i');
                icon.className = type === 'text' ? 'fas fa-eye-slash' : 'fas fa-eye';
            });
        }
    }

    setupPasswordToggle(passwordToggle, passwordInput);
    setupPasswordToggle(confirmPasswordToggle, confirmPasswordInput);

    function validateName(name) {
        return name.length >= 2 && /^[a-zA-Z\s]+$/.test(name);
    }

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }


    function validateAge(dob) {
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 18 && age <= 65;
    }



    function validatePassword(password) {
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return re.test(password);
    }

    function showError(inputElement, message) {
        const errorElement = document.getElementById(inputElement.id + 'Error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
            inputElement.classList.add('error');
        }
    }

    function clearError(inputElement) {
        const errorElement = document.getElementById(inputElement.id + 'Error');
        if (errorElement) {
            errorElement.classList.remove('show');
            inputElement.classList.remove('error');
        }
    }

    function clearAllErrors() {
        document.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
        document.querySelectorAll('.form-input').forEach(el => el.classList.remove('error'));
    }

    function showToast(message, type = 'success') {
        const toastIcon = toast.querySelector('.toast-icon');
        const toastMessage = toast.querySelector('.toast-message');
        const toastClose = toast.querySelector('.toast-close');

        toastMessage.textContent = message;
        toast.className = `toast ${type}`;

        toastIcon.className = type === 'success'
            ? 'fas fa-check-circle toast-icon'
            : 'fas fa-exclamation-circle toast-icon';

        toast.classList.add('show');

        const autoHideTimer = setTimeout(() => hideToast(), 5000);

        toastClose.onclick = () => {
            clearTimeout(autoHideTimer);
            hideToast();
        };
    }

    function hideToast() {
        toast.classList.remove('show');
    }

    firstNameInput.addEventListener('input', function () {
        clearError(this);
        if (this.value && !validateName(this.value)) {
            showError(this, 'Please enter a valid first name (letters only)');
        }
    });

    lastNameInput.addEventListener('input', function () {
        clearError(this);
        if (this.value && !validateName(this.value)) {
            showError(this, 'Please enter a valid last name (letters only)');
        }
    });

    emailInput.addEventListener('input', function () {
        clearError(this);
        if (this.value && !validateEmail(this.value)) {
            showError(this, 'Please enter a valid email address');
        }
    });

    dobInput.addEventListener('change', function () {
        clearError(this);
        if (this.value && !validateAge(this.value)) {
            showError(this, 'You must be between 18 and 65 years old');
        }
    });



    passwordInput.addEventListener('input', function () {
        clearError(this);
        if (this.value && !validatePassword(this.value)) {
            showError(this, 'Password must be at least 8 characters with uppercase, lowercase, and number');
        }

        if (confirmPasswordInput.value && this.value !== confirmPasswordInput.value) {
            showError(confirmPasswordInput, 'Passwords do not match');
        }
    });

    confirmPasswordInput.addEventListener('input', function () {
        clearError(this);
        if (this.value && this.value !== passwordInput.value) {
            showError(this, 'Passwords do not match');
        }
    });

    signupForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearAllErrors();

        const formData = {
            firstName: firstNameInput.value.trim(),
            lastName: lastNameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim(),
            dob: dobInput.value,
            city: cityInput.value.trim(),
            state: stateInput.value,
            licenseNumber: licenseNumberInput.value.trim(),
            password: passwordInput.value,
            confirmPassword: confirmPasswordInput.value,
            agreeTerms: agreeTermsCheckbox.checked
        };

        let isValid = true;

        if (!formData.firstName) {
            showError(firstNameInput, 'First name is required');
            isValid = false;
        } else if (!validateName(formData.firstName)) {
            showError(firstNameInput, 'Please enter a valid first name (letters only)');
            isValid = false;
        }

        if (!formData.lastName) {
            showError(lastNameInput, 'Last name is required');
            isValid = false;
        } else if (!validateName(formData.lastName)) {
            showError(lastNameInput, 'Please enter a valid last name (letters only)');
            isValid = false;
        }

        if (!formData.email) {
            showError(emailInput, 'Email is required');
            isValid = false;
        } else if (!validateEmail(formData.email)) {
            showError(emailInput, 'Please enter a valid email address');
            isValid = false;
        }



        if (!formData.dob) {
            showError(dobInput, 'Date of birth is required');
            isValid = false;
        } else if (!validateAge(formData.dob)) {
            showError(dobInput, 'You must be between 18 and 65 years old');
            isValid = false;
        }

        if (!formData.city) {
            showError(cityInput, 'City is required');
            isValid = false;
        }

        if (!formData.state) {
            showError(stateInput, 'State is required');
            isValid = false;
        }



        if (!formData.password) {
            showError(passwordInput, 'Password is required');
            isValid = false;
        } else if (!validatePassword(formData.password)) {
            showError(passwordInput, 'Password must be at least 8 characters with uppercase, lowercase, and number');
            isValid = false;
        }

        if (!formData.confirmPassword) {
            showError(confirmPasswordInput, 'Please confirm your password');
            isValid = false;
        } else if (formData.password !== formData.confirmPassword) {
            showError(confirmPasswordInput, 'Passwords do not match');
            isValid = false;
        }

        if (!formData.agreeTerms) {
            showToast('Please agree to the Terms of Service and Privacy Policy', 'error');
            isValid = false;
        }

        if (isValid) {
            signupBtn.classList.add('loading');
            signupBtn.disabled = true;

try {
  const response = await fetch('/api/driver-signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });

  const result = await response.json();
  
  if (response.ok) {
    showToast('Account created successfully! Please check your email for verification.', 'success');
    signupForm.reset();
    setTimeout(() => {
      window.location.href = '/dlogin';
    }, 2000);
  } else {
    // Handle specific error messages differently
    if (result.message.includes('already registered')) {
      showToast(result.message, 'error');
      // Highlight the email field
      document.getElementById('email').classList.add('error-field');
    } else {
      showToast(result.message || 'Signup failed', 'error');
    }
  }
} catch (err) {
  showToast('Network error. Please try again.', 'error');
} finally {
  signupBtn.classList.remove('loading');
  signupBtn.disabled = false;
}
        }
    });

    document.querySelector('.google-btn').addEventListener('click', () => {
        showToast('Google signup integration coming soon!', 'success');
    });

    document.querySelector('.facebook-btn').addEventListener('click', () => {
        showToast('Facebook signup integration coming soon!', 'success');
    });

    setTimeout(() => {
        firstNameInput.focus();
    }, 500);

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    const formElements = document.querySelectorAll('.form-group, .signup-btn, .social-signup');
    formElements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = `opacity 0.6s ease ${index * 0.05}s, transform 0.6s ease ${index * 0.05}s`;
        observer.observe(el);
    });
});

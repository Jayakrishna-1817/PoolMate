document.addEventListener("DOMContentLoaded", function () {
  const signupForm = document.getElementById("riderSignupForm");
  const firstNameInput = document.getElementById("firstName");
  const lastNameInput = document.getElementById("lastName");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const dobInput = document.getElementById("dob");
  const cityInput = document.getElementById("city");
  const genderInput = document.getElementById("gender");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const passwordToggle = document.getElementById("passwordToggle");
  const confirmPasswordToggle = document.getElementById(
    "confirmPasswordToggle"
  );
  const agreeTermsCheckbox = document.getElementById("agreeTerms");
  const newsletterCheckbox = document.getElementById("newsletter");
  const signupBtn = document.getElementById("signupBtn");
  const toast = document.getElementById("toast");

  function setupPasswordToggle(toggleBtn, passwordField) {
    if (toggleBtn && passwordField) {
      toggleBtn.addEventListener("click", function () {
        const type =
          passwordField.getAttribute("type") === "password"
            ? "text"
            : "password";
        passwordField.setAttribute("type", type);

        const icon = this.querySelector("i");
        if (type === "text") {
          icon.className = "fas fa-eye-slash";
        } else {
          icon.className = "fas fa-eye";
        }
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

  function validatePhone(phone) {
    const re = /^(\+91[\-\s]?)?[0]?(91)?[789]\d{9}$/;
    return re.test(phone.replace(/\s/g, ""));
  }

  function validateAge(dob) {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear(); // Changed to let
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || 
     (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--; // Now this works
  }

  return age >= 16 && age <= 80;
}

  function validatePassword(password) {
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return re.test(password);
  }

  function showError(inputElement, message) {
    const errorElement = document.getElementById(inputElement.id + "Error");
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add("show");
      inputElement.classList.add("error");
    }
  }

  function clearError(inputElement) {
    const errorElement = document.getElementById(inputElement.id + "Error");
    if (errorElement) {
      errorElement.classList.remove("show");
      inputElement.classList.remove("error");
    }
  }

  function clearAllErrors() {
    const errorElements = document.querySelectorAll(".error-message");
    const inputElements = document.querySelectorAll(".form-input");

    errorElements.forEach((el) => el.classList.remove("show"));
    inputElements.forEach((el) => el.classList.remove("error"));
  }

  firstNameInput.addEventListener("input", function () {
    clearError(this);
    if (this.value && !validateName(this.value)) {
      showError(this, "Please enter a valid first name (letters only)");
    }
  });

  lastNameInput.addEventListener("input", function () {
    clearError(this);
    if (this.value && !validateName(this.value)) {
      showError(this, "Please enter a valid last name (letters only)");
    }
  });

  emailInput.addEventListener("input", function () {
    clearError(this);
    if (this.value && !validateEmail(this.value)) {
      showError(this, "Please enter a valid email address");
    }
  });

  dobInput.addEventListener("change", function () {
    clearError(this);
    if (this.value && !validateAge(this.value)) {
      showError(this, "You must be between 16 and 80 years old");
    }
  });

  passwordInput.addEventListener("input", function () {
    clearError(this);
    if (this.value && !validatePassword(this.value)) {
      showError(
        this,
        "Password must be at least 8 characters with uppercase, lowercase, and number"
      );
    }
    if (confirmPasswordInput.value) {
      clearError(confirmPasswordInput);
      if (this.value !== confirmPasswordInput.value) {
        showError(confirmPasswordInput, "Passwords do not match");
      }
    }
  });

  confirmPasswordInput.addEventListener("input", function () {
    clearError(this);
    if (this.value && this.value !== passwordInput.value) {
      showError(this, "Passwords do not match");
    }
  });

  signupForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    clearAllErrors();

    const formData = {
      firstName: firstNameInput.value.trim(),
      lastName: lastNameInput.value.trim(),
      email: emailInput.value.trim(),
      phone: phoneInput.value.replace(/\s/g, ""),
      dob: dobInput.value,
      city: cityInput.value.trim(),
      gender: genderInput.value,
      password: passwordInput.value,
      confirmPassword: confirmPasswordInput.value,
      agreeTerms: agreeTermsCheckbox.checked,
      newsletter: newsletterCheckbox.checked,
    };
    let isValid = true;

    if (!formData.firstName) {
      showError(firstNameInput, "First name is required");
      isValid = false;
    } else if (!validateName(formData.firstName)) {
      showError(
        firstNameInput,
        "Please enter a valid first name (letters only)"
      );
      isValid = false;
    }

    if (!formData.lastName) {
      showError(lastNameInput, "Last name is required");
      isValid = false;
    } else if (!validateName(formData.lastName)) {
      showError(lastNameInput, "Please enter a valid last name (letters only)");
      isValid = false;
    }

    if (!formData.email) {
      showError(emailInput, "Email is required");
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      showError(emailInput, "Please enter a valid email address");
      isValid = false;
    }

    if (!formData.dob) {
      showError(dobInput, "Date of birth is required");
      isValid = false;
    } else if (!validateAge(formData.dob)) {
      showError(dobInput, "You must be between 16 and 80 years old");
      isValid = false;
    }

    if (!formData.city) {
      showError(cityInput, "City is required");
      isValid = false;
    }

    if (!formData.gender) {
      showError(genderInput, "Gender is required");
      isValid = false;
    }

    if (!formData.password) {
      showError(passwordInput, "Password is required");
      isValid = false;
    } else if (!validatePassword(formData.password)) {
      showError(
        passwordInput,
        "Password must be at least 8 characters with uppercase, lowercase, and number"
      );
      isValid = false;
    }

    if (!formData.confirmPassword) {
      showError(confirmPasswordInput, "Please confirm your password");
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      showError(confirmPasswordInput, "Passwords do not match");
      isValid = false;
    }

    if (!formData.agreeTerms) {
      showToast(
        "Please agree to the Terms of Service and Privacy Policy",
        "error"
      );
      isValid = false;
    }

    if (isValid) {
      signupBtn.classList.add("loading");
      signupBtn.disabled = true;

      try {
        const res = await fetch("/api/rsignup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await res.json();

        if (res.ok) {
          showToast("Signup successful!", "success");
          signupForm.reset();
          setTimeout(() => {
            window.location.href = "/rlogin";
          }, 2000);
        } else {
          showToast(data.message || "Signup failed.", "error");
        }
      } catch (err) {
        console.error("Signup Error:", err);
        showToast("Signup failed. Try again later.", "error");
      }
    }
  });
  function showToast(message, type = "success") {
    const toastIcon = toast.querySelector(".toast-icon");
    const toastMessage = toast.querySelector(".toast-message");
    const toastClose = toast.querySelector(".toast-close");

    toastMessage.textContent = message;

    toast.className = `toast ${type}`;

    if (type === "success") {
      toastIcon.className = "fas fa-check-circle toast-icon";
    } else if (type === "error") {
      toastIcon.className = "fas fa-exclamation-circle toast-icon";
    }

    toast.classList.add("show");

    const autoHideTimer = setTimeout(() => {
      hideToast();
    }, 5000);

    toastClose.onclick = () => {
      clearTimeout(autoHideTimer);
      hideToast();
    };
  }

  function hideToast() {
    toast.classList.remove("show");
  }

  const googleBtn = document.querySelector(".google-btn");
  const facebookBtn = document.querySelector(".facebook-btn");

  googleBtn.addEventListener("click", function () {
    showToast("Google signup integration coming soon!", "success");
  });

  facebookBtn.addEventListener("click", function () {
    showToast("Facebook signup integration coming soon!", "success");
  });
  const riderBranding = document.querySelector(".rider-branding");
  if (riderBranding) {
    riderBranding.style.background =
      "linear-gradient(135deg, #10b981 0%, #059669 100%)";
  }
});

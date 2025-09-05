// Toast Function — Same as signup pages
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
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
  const toast = document.getElementById("toast");
  toast.classList.remove("show");
}

// DOM Content Loaded
document.addEventListener("DOMContentLoaded", function() {
  const passwordInput = document.getElementById("password");
  const passwordToggle = document.getElementById("passwordToggle");

  // Password toggle functionality
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

  // Forgot Password Modal Elements
  const forgotPasswordLink = document.getElementById("forgotPasswordLink");
  const forgotPasswordModal = document.getElementById("forgotPasswordModal");
  const closeModalBtn = document.getElementById("closeModal");
  const cancelResetBtn = document.getElementById("cancelReset");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const resetEmail = document.getElementById("resetEmail");
  const otpSection = document.getElementById("otpSection");
  const otpInput = document.getElementById("otpInput");
  const newPassword = document.getElementById("newPassword");
  const confirmPassword = document.getElementById("confirmPassword");
  const sendResetLink = document.getElementById("sendResetLink");

  let emailSent = false;

  // Modal open
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", function (e) {
      e.preventDefault();
      console.log("Rider forgot password link clicked!");
      if (forgotPasswordModal) {
        forgotPasswordModal.style.display = "flex";
        forgotPasswordModal.classList.add("show");
        console.log("Rider modal shown");
      }
    });
  }

  // Modal close
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", function () {
      forgotPasswordModal.style.display = "none";
      forgotPasswordModal.classList.remove("show");
      // Reset form state
      emailSent = false;
      if (otpSection) otpSection.style.display = "none";
      if (sendResetLink) sendResetLink.textContent = "Send OTP";
      if (resetEmail) resetEmail.disabled = false;
      if (forgotPasswordForm) forgotPasswordForm.reset();
    });
  }

  if (cancelResetBtn) {
    cancelResetBtn.addEventListener("click", function () {
      forgotPasswordModal.style.display = "none";
      forgotPasswordModal.classList.remove("show");
      // Reset form state
      emailSent = false;
      if (otpSection) otpSection.style.display = "none";
      if (sendResetLink) sendResetLink.textContent = "Send OTP";
      if (resetEmail) resetEmail.disabled = false;
      if (forgotPasswordForm) forgotPasswordForm.reset();
    });
  }

  // Forgot password OTP + reset
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = resetEmail.value.trim();

      if (!emailSent) {
        // Send OTP
        if (!email) {
          showToast("Please enter your email address", "error");
          return;
        }

        try {
          const res = await fetch("/api/rider-send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
          });

          const result = await res.json();
          if (res.ok) {
            showToast("OTP sent to your email successfully!", "success");
            emailSent = true;
            otpSection.style.display = "block";
            sendResetLink.textContent = "Reset Password";
            resetEmail.disabled = true;
          } else {
            showToast(result.message || "Error sending OTP", "error");
          }
        } catch (err) {
          console.error("Send OTP error:", err);
          showToast("Network error. Please try again.", "error");
        }
      } else {
        // Reset password with OTP
        const otp = otpInput.value.trim();
        const password1 = newPassword.value;
        const password2 = confirmPassword.value;

        if (!otp || !password1 || !password2) {
          showToast("Please fill all fields", "error");
          return;
        }

        if (password1 !== password2) {
          showToast("Passwords do not match", "error");
          return;
        }

        try {
          const res = await fetch("/api/rider-reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              otp,
              newPassword: password1
            })
          });

          const result = await res.json();
          if (res.ok) {
            showToast("Password updated successfully! You can now login.", "success");
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            showToast(result.message || "Failed to reset password", "error");
          }
        } catch (err) {
          console.error("Reset password error:", err);
          showToast("Network error. Please try again.", "error");
        }
      }
    });
  }

  // Login form submission
  document.getElementById("riderLoginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      const res = await fetch("/api/rlogin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast("Login successful! Redirecting to dashboard...", "success");
        setTimeout(() => {
          window.location.href = "/arlogin";
        }, 1500);
      } else {
        showToast(data.message || "Login failed", "error");
      }
    } catch (err) {
      console.error("Login error:", err);
      showToast("Something went wrong. Please try again.", "error");
    }
  });
});

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

document.addEventListener("DOMContentLoaded", function () {
  console.log("Script loaded");

  const loginForm = document.getElementById("driverLoginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const passwordToggle = document.getElementById("passwordToggle");
  const errorMsg = document.getElementById("loginError");

  // Password toggle functionality
  if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener("click", function (e) {
      e.preventDefault();
      
      const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);

      const icon = this.querySelector("i");
      if (icon) {
        if (type === "text") {
          icon.className = "fas fa-eye-slash";
        } else {
          icon.className = "fas fa-eye";
        }
      }
    });
  }

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

  // Handle login
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      try {
        const response = await fetch("/api/driver-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include", // added for session cookies
          body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          showToast("Login successful! Redirecting to dashboard...", "success");
          setTimeout(() => {
            window.location.href = result.redirectUrl || "/adlogin";
          }, 1500);
        } else {
          showToast(result.message || "Invalid credentials", "error");
          errorMsg.style.display = "none"; // Hide the old error message
        }
      } catch (err) {
        showToast("Network error. Please try again.", "error");
        errorMsg.style.display = "none"; // Hide the old error message
      }
    });
  }

  // Modal open
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", function (e) {
      e.preventDefault();
      if (forgotPasswordModal) {
        forgotPasswordModal.style.display = "flex";
        forgotPasswordModal.classList.add("show");
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
          const res = await fetch("/api/driver-send-otp", {
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
          const res = await fetch("/api/driver-reset-password", {
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
});


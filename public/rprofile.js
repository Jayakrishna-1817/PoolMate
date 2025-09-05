document.addEventListener("DOMContentLoaded", () => {
  fetch("/api/rider-profile")
    .then((res) => res.json())
    .then((data) => {
      document.getElementById("headerUsername").innerText = data.fullName || "";
      document.getElementById("mainProfileName").innerText = data.fullName || "";
      document.getElementById("fullName").innerText = data.fullName || "";
      document.getElementById("email").innerText = data.email || "";
      document.getElementById("phone").innerText = data.phone || "";
      document.getElementById("gender").innerText = data.gender || "";
      document.getElementById("city").innerText = data.city || "";
      document.getElementById("dateOfBirth").innerText = data.dateOfBirth || "";
      document.getElementById("emergencyName").innerText = data.emergencyName || "";
      document.getElementById("emergencyPhone").innerText = data.emergencyPhone || "";

      // Set profile image with fallback to default
      const profilePic = document.getElementById("profilePicture");
      const headerPic = document.getElementById("headerProfilePic");

      profilePic.src = "/api/rider-profile-image";
      headerPic.src = "/api/rider-profile-image";

      profilePic.onerror = () => {
        profilePic.src = "/images/default-profile.png";
      };
      headerPic.onerror = () => {
        headerPic.src = "/images/default-profile.png";
      };
    })
    .catch((err) => {
      console.error("Failed to fetch rider data:", err);
      alert("Failed to load rider profile.");
    });
});


// Enable edit mode
function editProfile() {
  const editableFields = [
    "phone",
    "gender",
    "city",
    "dateOfBirth",
    "emergencyName",
    "emergencyPhone"
  ];

  editableFields.forEach((fieldId) => {
    const span = document.getElementById(fieldId);
    const input = document.getElementById(`${fieldId}Input`);
    input.value = span.innerText;
    span.style.display = "none";
    input.style.display = "inline-block";
  });
}

// Save profile updates
function saveProfile() {
  const data = {
    email: document.getElementById("email").innerText,
    phone: document.getElementById("phoneInput").value,
    gender: document.getElementById("genderInput").value,
    city: document.getElementById("cityInput").value,
    dateOfBirth: document.getElementById("dateOfBirthInput").value,
    emergencyName: document.getElementById("emergencyNameInput").value,
    emergencyPhone: document.getElementById("emergencyPhoneInput").value,
  };

  fetch("/rider-profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((res) => {
      if (res.ok) {
        alert("Profile updated successfully!");
        location.reload();
      } else {
        throw new Error("Failed to save profile");
      }
    })
    .catch((err) => {
      console.error("Error saving profile:", err);
      alert("Error updating profile.");
    });
}

// Handle profile image upload
function changeProfilePicture() {
  document.getElementById("profilePictureInput").click();
}

document
  .getElementById("profilePictureInput")
  .addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profileImage", file);

    fetch("/upload-rider-profile-image", {
      method: "POST",
      body: formData,
    })
      .then((res) => {
        if (res.ok) {
          alert("Profile picture updated!");
          location.reload();
        } else {
          throw new Error("Image upload failed");
        }
      })
      .catch((err) => {
        console.error("Error uploading profile picture:", err);
        alert("Failed to upload profile picture.");
      });
  });

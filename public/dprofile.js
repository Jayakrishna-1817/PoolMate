document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/api/driver-profile");
    if (!res.ok) throw new Error("Failed to load profile");
    const data = await res.json();

    // Profile image
    const imageRes = await fetch("/api/driver-profile-image");
    const imageBlob = await imageRes.blob();
    const imageUrl = URL.createObjectURL(imageBlob);

    // Set image
    document.getElementById("profilePicture").src = imageUrl;
    document.getElementById("profilePicturePreview").src = imageUrl;

    // Fill inputs
    document.getElementById("driverName").textContent = data.fullName;


    document.getElementById("driverNameTop").textContent = data.fullName;

    document.querySelector('input[name="fullName"]').value = data.fullName;
    document.querySelector('input[name="email"]').value = data.email;
    document.querySelector('input[name="phone"]').value = data.phone;
    document.querySelector('input[name="dateOfBirth"]').value = data.dateOfBirth;
    document.querySelector('input[name="gender"]').value = data.gender;
    document.querySelector('input[name="city"]').value = data.city;
    document.querySelector('input[name="vehicleModel"]').value = data.vehicleModel;
    document.querySelector('input[name="licenseNumber"]').value = data.licenseNumber;
    document.querySelector('input[name="emergencyName"]').value = data.emergencyName;
    document.querySelector('input[name="emergencyPhone"]').value = data.emergencyPhone;
  } catch (err) {
    console.error("Profile load error:", err);
  }
});

// Upload profile image
document.getElementById("imageUploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData();
  formData.append("profileImage", document.getElementById("profileImageInput").files[0]);

  const res = await fetch("/upload-profile-image", {
    method: "POST",
    body: formData,
  });

  if (res.ok) {
    window.location.reload();
  } else {
    alert("Image upload failed");
  }
});

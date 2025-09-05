// Global variables
let currentRequests = [];
let map = null;
let driverMarker = null;
let riderMarker = null;
let routeLine = null; // Track the route polyline
let isOnline = false; // Default to offline until driver toggles online

// Function to toggle driver status
function toggleDriverStatus() {
    isOnline = !isOnline;

    // Update backend with new status
    fetch('/api/driver-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isOnline })
    })
    .then(res => res.json())
    .then(data => {
        updateDriverStatusUI();
        
        if (isOnline) {
            showToast("You are now Online and receiving requests.", "success");
            loadConnectionRequests(); // Load requests when online
        } else {
            showToast("You are now Offline and will not receive new requests.", "error");
            displayRequests([]); // Clear requests when offline
            updateRequestsBadge(0);
        }
    })
    .catch(err => {
        console.error('Failed to update driver status:', err);
        showToast('Failed to update status', 'error');
        // Revert the status change
        isOnline = !isOnline;
        updateDriverStatusUI();
    });
}

// Check authentication on page load
function checkAuthentication() {
    fetch("/api/driver-profile", {
        method: "GET",
        credentials: "include"
    })
    .then(response => {
        if (response.status === 401) {
            window.location.href = "/dlogin";
            return;
        }
        return response.json();
    })
    .catch(error => {
        console.error("Authentication check failed:", error);
        window.location.href = "/dlogin";
    });
}

// Logout function
function logout() {
    fetch("/logout", {
        method: "POST",
        credentials: "include"
    })
    .then(response => response.json())
    .then(data => {
        showToast("Logged out successfully", "success");
        setTimeout(() => {
            window.location.href = "/dlogin";
        }, 1000);
    })
    .catch(error => {
        console.error("Logout error:", error);
        window.location.href = "/dlogin";
    });
}

// Initialize driver status on page load
function initializeDriverStatus() {
    const statusIndicator = document.getElementById("driverStatusIndicator");
    const statusText = document.getElementById("statusText");
    const toggleButton = document.getElementById("toggleStatusBtn");

    // Set default offline state
    isOnline = false;
    statusIndicator.classList.remove("online");
    statusIndicator.classList.add("offline");
    statusText.textContent = "Offline";
    toggleButton.innerHTML = '<i class="fas fa-toggle-off"></i>';
    toggleButton.classList.add("offline");

    // Fetch current status from backend
    fetch('/api/driver-status', {
        method: 'GET',
        credentials: 'include'
    })
    .then(res => {
        if (res.ok) {
            return res.json();
        }
        // If failed, keep default offline state
        return { isOnline: false };
    })
    .then(data => {
        isOnline = data.isOnline || false;
        updateDriverStatusUI();
        
        if (isOnline) {
            loadConnectionRequests(); // Load requests if online
        }
    })
    .catch(err => {
        console.error('Failed to fetch driver status:', err);
        // Keep default offline state
        isOnline = false;
        updateDriverStatusUI();
    });
}

// Update driver status UI based on isOnline variable
function updateDriverStatusUI() {
    const statusIndicator = document.getElementById("driverStatusIndicator");
    const statusText = document.getElementById("statusText");
    const toggleButton = document.getElementById("toggleStatusBtn");

    if (isOnline) {
        statusIndicator.classList.remove("offline");
        statusIndicator.classList.add("online");
        statusText.textContent = "Online";
        toggleButton.innerHTML = '<i class="fas fa-toggle-on"></i>';
        toggleButton.classList.remove("offline");
    } else {
        statusIndicator.classList.remove("online");
        statusIndicator.classList.add("offline");
        statusText.textContent = "Offline";
        toggleButton.innerHTML = '<i class="fas fa-toggle-off"></i>';
        toggleButton.classList.add("offline");
    }
}

// Accept request function with map integration
function acceptRequest(button) {
    const requestCard = button.closest('.request-card');
    const requestId = requestCard.dataset.requestId;
    
    if (!requestId) {
        showToast("Request ID not found", "error");
        return;
    }

    // Show loading state
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Accepting...';
    button.disabled = true;

    fetch(`/api/ride-requests/${requestId}/accept`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            driverNotes: "Request accepted",
            estimatedArrival: new Date(Date.now() + 15 * 60000) // 15 minutes from now
        })
    })
    .then(res => {
        if (!res.ok) {
            if (res.status === 401) {
                window.location.href = '/dlogin';
                return;
            }
            throw new Error('Failed to accept request');
        }
        return res.json();
    })
    .then(data => {
        showToast("Request accepted successfully!", "success");
        
        // Update the card to show accepted status
        requestCard.dataset.status = 'accepted';
        
        // Replace action buttons with accepted status
        const actionsDiv = requestCard.querySelector('.request-actions');
        if (actionsDiv) {
            actionsDiv.innerHTML = `
                <div class="request-status accepted">
                    <i class="fas fa-check-circle"></i>
                    <span>Accepted</span>
                </div>
            `;
        }
        
        // Use location data from server if available, otherwise use default data
        let rideData;
        if (data.locationData) {
            rideData = data.locationData;
        } else {
            // Fallback to default data
            const riderName = requestCard.querySelector('.rider-first-name').textContent;
            const fromLocation = requestCard.querySelector('.route-point.start span').textContent;
            const toLocation = requestCard.querySelector('.route-point.end span').textContent;
            
            rideData = {
                driver: {
                    name: document.getElementById('driverProfileName').textContent || 'Driver',
                    location: { lat: 40.7128, lng: -74.0060 } // Default NYC coordinates
                },
                rider: {
                    name: riderName,
                    location: { lat: 40.7589, lng: -73.9851 } // Default coordinates
                },
                from: fromLocation,
                to: toLocation,
                requestId: requestId
            };
        }
        
        // Store ride data in localStorage for map access
        localStorage.setItem('currentRideData', JSON.stringify(rideData));
        
        // Open map in new window/tab
        const mapUrl = `/map?rideData=${encodeURIComponent(JSON.stringify(rideData))}`;
        const mapWindow = window.open(mapUrl, 'rideMap', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        
        if (!mapWindow) {
            // If popup was blocked, show alternative
            showToast('Map popup blocked. Opening map in current tab...', 'warning');
            setTimeout(() => {
                window.location.href = "/map";
            }, 2000);
        }
        
        // Refresh requests and update ride count
        loadConnectionRequests();
        loadDriverStats(); // Update ride count after accepting a request
    })
    .catch(err => {
        showToast(err.message || 'Failed to accept request', 'error');
        console.error('Accept request error:', err);
        button.innerHTML = '<i class="fas fa-check"></i> Accept';
        button.disabled = false;
    });
}

// Reject request function
function rejectRequest(button) {
    const requestCard = button.closest('.request-card');
    const requestId = requestCard.dataset.requestId;
    
    if (!requestId) {
        showToast("Request ID not found", "error");
        return;
    }

    if (!confirm("Are you sure you want to reject this request?")) {
        return;
    }

    // Show loading state
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rejecting...';
    button.disabled = true;

    fetch(`/api/ride-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            reason: "Driver unavailable"
        })
    })
    .then(res => {
        if (!res.ok) {
            if (res.status === 401) {
                window.location.href = '/dlogin';
                return;
            }
            throw new Error('Failed to reject request');
        }
        return res.json();
    })
    .then(data => {
        showToast("Request rejected", "error");
        
        // Remove the card with animation
        requestCard.style.opacity = "0";
        requestCard.style.transform = "translateX(-100%)";
        
        setTimeout(() => {
            requestCard.remove();
            loadConnectionRequests(); // Refresh the list
        }, 300);
    })
    .catch(err => {
        showToast(err.message || 'Failed to reject request', 'error');
        console.error('Reject request error:', err);
        button.innerHTML = '<i class="fas fa-times"></i> Decline';
        button.disabled = false;
    });
}

// Load connection requests
function loadConnectionRequests() {
    if (!isOnline) {
        displayRequests([]); // Clear requests if offline
        updateRequestsBadge(0);
        return;
    }

    fetch("/api/driver-connection-requests", {
        credentials: "include"
    })
    .then(res => {
        if (!res.ok) {
            if (res.status === 401) {
                window.location.href = "/dlogin";
                return;
            }
            throw new Error("Failed to load requests");
        }
        return res.json();
    })
    .then(data => {
        currentRequests = data.requests || [];
        displayRequests(currentRequests);
        updateRequestsBadge(currentRequests.length);
    })
    .catch(err => {
        console.error("Error loading connection requests:", err);
        showToast("Failed to load requests", "error");
    });
}

// Display requests
function displayRequests(requests) {
    const container = document.getElementById('requestsContainer');
    
    if (!requests || requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No Ride Requests</h3>
                <p>You don't have any ride requests at the moment.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = requests.map(request => createRequestCard(request)).join('');
}

// Create request card HTML with rider's first name and loading state
function createRequestCard(request) {
    const requestDate = new Date(request.requestedDate);
    const createdDate = new Date(request.createdAt);
    
    // Extract first name from rider's full name
    const riderFirstName = request.rider.name.split(' ')[0];
    
    return `
        <div class="request-card" data-status="pending" data-request-id="${request.id}">
            <div class="request-header">
                <div class="request-route">
                    <div class="route-point start">
                        <i class="fas fa-circle"></i>
                        <span>${request.from}</span>
                    </div>
                    <div class="route-line">
                        <i class="fas fa-arrow-right"></i>
                    </div>
                    <div class="route-point end">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${request.to}</span>
                    </div>
                </div>
                <div class="request-time">
                    <i class="fas fa-clock"></i>
                    <span>${requestDate.toLocaleDateString()} ${requestDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>

            <div class="request-details">
                <div class="passenger-info">
                    <img src="/images/profile.jpeg" alt="Passenger" class="passenger-avatar">
                    <div class="passenger-details">
                        <div class="passenger-name">
                            <span class="rider-first-name">${riderFirstName}</span>
                            <span class="loading-indicator" style="display: none;">
                                <i class="fas fa-spinner fa-spin"></i> Loading...
                            </span>
                        </div>
                        <div class="passenger-rating">
                            <i class="fas fa-star"></i>
                            <span>4.5</span>
                        </div>
                    </div>
                </div>

                <div class="ride-info">
                    <div class="info-item">
                        <i class="fas fa-users"></i>
                        <span>${request.passengers} passenger${request.passengers > 1 ? 's' : ''}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${request.rider.city}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-rupee-sign"></i>
                        <span>₹${request.estimatedFare}</span>
                    </div>
                </div>
            </div>

            ${request.message ? `
                <div class="request-message">
                    <i class="fas fa-comment"></i>
                    <span>${request.message}</span>
                </div>
            ` : ''}

            <div class="request-actions">
                <button class="action-btn reject" onclick="rejectRequest(this)">
                    <i class="fas fa-times"></i>
                    Decline
                </button>
                <button class="action-btn accept" onclick="acceptRequest(this)">
                    <i class="fas fa-check"></i>
                    Accept
                </button>
            </div>
        </div>
    `;
}

// Update requests badge
function updateRequestsBadge(count) {
    const headerBadge = document.getElementById('requestsBadge');
    const navBadge = document.getElementById('navRequestsBadge');
    
    if (headerBadge) {
        headerBadge.textContent = count;
        headerBadge.style.display = count > 0 ? 'block' : 'none';
    }
    
    if (navBadge) {
        navBadge.textContent = count;
        navBadge.style.display = count > 0 ? 'inline' : 'none';
    }
}

// Load driver profile and vehicle info
function loadDriverProfile() {
    fetch('/api/driver-profile', {
        credentials: 'include'
    })
    .then(res => {
        if (!res.ok) {
            if (res.status === 401) {
                window.location.href = '/dlogin';
                return;
            }
            throw new Error('Failed to load profile');
        }
        return res.json();
    })
    .then(data => {
        // Update profile name with first name only
        const nameSpan = document.getElementById('driverProfileName');
        if (data.fullName && nameSpan) {
            const firstName = data.fullName.split(' ')[0];
            nameSpan.textContent = firstName;
        }

        // Update online status from backend
        isOnline = data.isOnline || false;
        const statusIndicator = document.getElementById("driverStatusIndicator");
        const statusText = document.getElementById("statusText");
        const toggleButton = document.getElementById("toggleStatusBtn");

        if (isOnline) {
            statusIndicator.classList.remove("offline");
            statusIndicator.classList.add("online");
            statusText.textContent = "Online";
            toggleButton.innerHTML = '<i class="fas fa-toggle-on"></i>';
            toggleButton.classList.remove("offline");
        } else {
            statusIndicator.classList.remove("online");
            statusIndicator.classList.add("offline");
            statusText.textContent = "Offline";
            toggleButton.innerHTML = '<i class="fas fa-toggle-off"></i>';
            toggleButton.classList.add("offline");
        }

        // Update vehicle info
        const vehicleContainer = document.getElementById('vehicleInfo');
        if (vehicleContainer) {
            vehicleContainer.innerHTML = `
                <div class="vehicle-card">
                    <h3>Current Vehicle</h3>
                    <div class="vehicle-details">
                        <p><strong>Model:</strong> ${data.vehicleModel || 'Not specified'}</p>
                        <p><strong>License Number:</strong> ${data.licenseNumber || 'Not specified'}</p>
                        <p><strong>City:</strong> ${data.city || 'Not specified'}</p>
                        <p><strong>Phone:</strong> ${data.phone || 'Not specified'}</p>
                    </div>
                </div>
            `;
        }
    })
    .catch(err => {
        console.error('Error loading driver profile:', err);
        showToast('Failed to load profile data', 'error');
    });
}

// Load driver statistics including ride count
function loadDriverStats() {
    fetch('/api/driver-stats', {
        credentials: 'include'
    })
    .then(res => {
        if (!res.ok) {
            if (res.status === 401) {
                window.location.href = '/dlogin';
                return;
            }
            throw new Error('Failed to load stats');
        }
        return res.json();
    })
    .then(data => {
        // Update ride count (starts from 0 and increases based on actual rides)
        document.getElementById('totalRides').textContent = data.totalRides || 0;
        
        // Update other stats
        document.getElementById('monthlyEarnings').textContent = `₹${data.monthlyEarnings || 0}`;
        document.getElementById('averageRating').textContent = data.averageRating || '0.0';
        document.getElementById('totalDistance').textContent = data.totalDistance || 0;
        
        // Update earnings section
        document.getElementById('todayEarnings').textContent = `₹${data.todayEarnings || 0}`;
        document.getElementById('weeklyEarnings').textContent = `₹${data.weeklyEarnings || 0}`;
        document.getElementById('monthlyEarningsDetail').textContent = `₹${data.monthlyEarnings || 0}`;
        
        // Update ratings section
        document.getElementById('ratingScore').textContent = data.averageRating || '0.0';
        document.getElementById('totalReviews').textContent = `Based on ${data.totalReviews || 0} reviews`;
        
        // Update star display based on rating
        updateStarDisplay(data.averageRating || 0);
        
        // Load recent activity
        loadRecentActivity(data.recentActivity || []);
    })
    .catch(err => {
        console.error('Error loading driver stats:', err);
        // Set default values if API fails
        document.getElementById('totalRides').textContent = '0';
        document.getElementById('monthlyEarnings').textContent = '₹0';
        document.getElementById('averageRating').textContent = '0.0';
        document.getElementById('totalDistance').textContent = '0';
        document.getElementById('todayEarnings').textContent = '₹0';
        document.getElementById('weeklyEarnings').textContent = '₹0';
        document.getElementById('monthlyEarningsDetail').textContent = '₹0';
        document.getElementById('ratingScore').textContent = '0.0';
        document.getElementById('totalReviews').textContent = 'Based on 0 reviews';
    });
}

// Update star display based on rating
function updateStarDisplay(rating) {
    const starsContainer = document.getElementById('ratingStars');
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    let starsHTML = '';
    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            starsHTML += '<i class="fas fa-star"></i>';
        } else if (i === fullStars && hasHalfStar) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
        } else {
            starsHTML += '<i class="far fa-star"></i>';
        }
    }
    starsContainer.innerHTML = starsHTML;
}

// Load recent activity
function loadRecentActivity(activities) {
    const container = document.getElementById('recentActivityContainer');
    
    if (!activities || activities.length === 0) {
        container.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon completed">
                    <i class="fas fa-check"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">Welcome to PoolMate Driver Dashboard!</div>
                    <div class="activity-time">Just now</div>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.type}">
                <i class="fas ${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-text">${activity.text}</div>
                <div class="activity-time">${formatActivityTime(activity.timestamp)}</div>
            </div>
        </div>
    `).join('');
}

// Get activity icon based on type
function getActivityIcon(type) {
    switch (type) {
        case 'completed': return 'fa-check';
        case 'rating': return 'fa-star';
        case 'request': return 'fa-inbox';
        case 'earning': return 'fa-rupee-sign';
        default: return 'fa-info';
    }
}

// Format activity timestamp
function formatActivityTime(timestamp) {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now - activityTime;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) {
        return 'Just now';
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
}

// Map functionality
function openMapWithLocations(requestCard) {
    const modal = document.getElementById('mapModal');
    const mapContainer = document.getElementById('map');
    
    // Show modal
    modal.style.display = 'block';
    
    // Initialize map if not already done
    if (!map) {
        map = L.map('map').setView([17.3850, 78.4867], 10); // Default to Hyderabad
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }
    
    // Clear existing markers
    if (driverMarker) {
        map.removeLayer(driverMarker);
    }
    if (riderMarker) {
        map.removeLayer(riderMarker);
    }
    if (routeLine) {
        map.removeLayer(routeLine);
    }
    
    // Generate mock coordinates for demonstration
    const driverLat = 17.3850 + (Math.random() - 0.5) * 0.1;
    const driverLng = 78.4867 + (Math.random() - 0.5) * 0.1;
    const riderLat = 17.3850 + (Math.random() - 0.5) * 0.1;
    const riderLng = 78.4867 + (Math.random() - 0.5) * 0.1;
    
    // Add driver marker (blue)
    driverMarker = L.marker([driverLat, driverLng], {
        icon: L.divIcon({
            className: 'driver-marker',
            html: '<i class="fas fa-car" style="color: #3b82f6; font-size: 20px;"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        })
    }).addTo(map).bindPopup('Driver Location');
    
    // Add rider marker (green)
    riderMarker = L.marker([riderLat, riderLng], {
        icon: L.divIcon({
            className: 'rider-marker',
            html: '<i class="fas fa-user" style="color: #10b981; font-size: 20px;"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        })
    }).addTo(map).bindPopup('Rider Location');
    
    // Draw route line
    routeLine = L.polyline([
        [driverLat, driverLng],
        [riderLat, riderLng]
    ], {
        color: '#f59e0b',
        weight: 4,
        opacity: 0.7
    }).addTo(map);
    
    // Fit map to show both markers
    const group = new L.featureGroup([driverMarker, riderMarker]);
    map.fitBounds(group.getBounds().pad(0.1));
    
    // Update modal info
    const riderName = requestCard.querySelector('.passenger-name .rider-first-name').textContent;
    const pickupLocation = requestCard.querySelector('.route-point.start span').textContent;
    const destinationLocation = requestCard.querySelector('.route-point.end span').textContent;
    
    document.getElementById('mapRiderName').textContent = riderName;
    document.getElementById('mapRiderPhone').textContent = 'Contact: +91 98765 43210'; // Mock phone
    document.getElementById('mapPickupLocation').textContent = pickupLocation;
    document.getElementById('mapDestinationLocation').textContent = destinationLocation;
    
    // Resize map after modal is shown
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}

function closeMap() {
    const modal = document.getElementById('mapModal');
    modal.style.display = 'none';
}

// Toast notification function
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastIcon = toast.querySelector(".toast-icon");
    const toastMessage = toast.querySelector(".toast-message");
    const toastClose = toast.querySelector(".toast-close");

    // Set content
    toastMessage.textContent = message;

    // Set type
    toast.className = `toast ${type}`;

    // Set icon
    if (type === "success") {
        toastIcon.className = "fas fa-check-circle toast-icon";
    } else if (type === "error") {
        toastIcon.className = "fas fa-exclamation-circle toast-icon";
    }

    // Show toast
    toast.classList.add("show");

    // Auto hide after 5 seconds
    const autoHideTimer = setTimeout(() => {
        hideToast();
    }, 5000);

    // Close button functionality
    toastClose.onclick = () => {
        clearTimeout(autoHideTimer);
        hideToast();
    };
}

function hideToast() {
    const toast = document.getElementById("toast");
    toast.classList.remove("show");
}

// Initialize page
document.addEventListener("DOMContentLoaded", function () {
    // Check authentication first
    checkAuthentication();
    
    // Initialize driver status (starts as offline by default)
    initializeDriverStatus();

    // Navigation functionality
    const navItems = document.querySelectorAll(".nav-item");
    const contentSections = document.querySelectorAll(".content-section");
    const profileTrigger = document.getElementById("profileTrigger");
    const profileDropdown = document.getElementById("profileDropdown");

    // Load initial data
    loadDriverProfile();
    loadDriverStats(); // Load stats including ride count
    // Don't load connection requests initially since driver starts offline

    // Handle online/offline toggle
    const toggleStatusBtn = document.getElementById("toggleStatusBtn");
    if (toggleStatusBtn) {
        toggleStatusBtn.addEventListener("click", toggleDriverStatus);
    }

    // Handle navigation
    navItems.forEach((item) => {
        item.addEventListener("click", function (e) {
            e.preventDefault();

            const sectionId = this.getAttribute("data-section");
            if (sectionId) {
                showSection(sectionId);

                // Update active nav item
                navItems.forEach((nav) => nav.classList.remove("active"));
                this.classList.add("active");

                // Load data if needed
                if (sectionId === "requests") {
                    loadConnectionRequests();
                } else if (sectionId === "overview") {
                    loadDriverStats(); // Refresh stats when viewing overview
                }
            }
        });
    });

    // Show specific section
    window.showSection = function (sectionId) {
        contentSections.forEach((section) => {
            section.classList.remove("active");
        });

        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add("active");
        }

        // Update nav item
        navItems.forEach((nav) => nav.classList.remove("active"));
        const targetNav = document.querySelector(
            `[data-section="${sectionId}"]`
        );
        if (targetNav) {
            targetNav.classList.add("active");
        }
    };

    // Filter tabs functionality
    const filterTabs = document.querySelectorAll(".filter-tab");
    filterTabs.forEach((tab) => {
        tab.addEventListener("click", function () {
            const filter = this.getAttribute("data-filter");

            // Update active tab
            filterTabs.forEach((t) => t.classList.remove("active"));
            this.classList.add("active");

            // Filter requests
            filterRequests(filter);
        });
    });

    // Filter requests function
    function filterRequests(filter) {
        let filteredRequests = currentRequests;
        
        if (filter !== 'all') {
            filteredRequests = currentRequests.filter(request => {
                // Since we're only showing pending requests from the API,
                // we'll just show all for now
                return true;
            });
        }
        
        displayRequests(filteredRequests);
    }

    // Profile dropdown functionality
    if (profileTrigger && profileDropdown) {
        // Close dropdown when clicking outside
        document.addEventListener("click", function (e) {
            if (!profileTrigger.contains(e.target)) {
                profileDropdown.style.opacity = "0";
                profileDropdown.style.visibility = "hidden";
                profileDropdown.style.transform = "translateY(-10px)";
            }
        });

        // Toggle dropdown on trigger click
        profileTrigger.addEventListener("click", function (e) {
            e.stopPropagation();
            const isVisible = profileDropdown.style.visibility === "visible";

            if (isVisible) {
                profileDropdown.style.opacity = "0";
                profileDropdown.style.visibility = "hidden";
                profileDropdown.style.transform = "translateY(-10px)";
            } else {
                profileDropdown.style.opacity = "1";
                profileDropdown.style.visibility = "visible";
                profileDropdown.style.transform = "translateY(0)";
            }
        });
    }

    // Close map modal when clicking outside
    document.getElementById('mapModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeMap();
        }
    });

    // Refresh requests every 30 seconds
    setInterval(loadConnectionRequests, 30000);
    
    // Refresh stats every 5 minutes
    setInterval(loadDriverStats, 300000);
});


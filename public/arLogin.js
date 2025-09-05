document.addEventListener('DOMContentLoaded', function() {
    // Navigation functionality
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const toast = document.getElementById('toast');

    // Load rider profile
    fetch("/api/rider-profile")
      .then(response => response.json())
      .then(data => {
        const nameSpan = document.getElementById("riderProfileName");
        if (data.fullName && nameSpan) {
          nameSpan.textContent = data.fullName;
          document.querySelector(".section-title").textContent = `Welcome Back, ${data.fullName.split(' ')[0]}!`;
        }
      })
      .catch(error => {
        console.error("Failed to load rider profile:", error);
      });

    // Handle navigation
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const sectionId = this.getAttribute('data-section');
            if (sectionId) {
                showSection(sectionId);
                
                // Update active nav item
                navItems.forEach(nav => nav.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });

    // Show specific section
    window.showSection = function(sectionId) {
        contentSections.forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Update nav item
        navItems.forEach(nav => nav.classList.remove('active'));
        const targetNav = document.querySelector(`[data-section="${sectionId}"]`);
        if (targetNav) {
            targetNav.classList.add('active');
        }
    };

    // Filter tabs functionality
    const filterTabs = document.querySelectorAll('.filter-tab');
    const rideCards = document.querySelectorAll('.ride-card');

    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            
            // Update active tab
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Filter ride cards
            rideCards.forEach(card => {
                const status = card.getAttribute('data-status');
                if (filter === 'all' || status === filter) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // Ride search form
    const rideSearchForm = document.getElementById('rideSearchForm');
    const searchResults = document.getElementById('searchResults');

    if (rideSearchForm) {
        rideSearchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const searchData = {
                from: formData.get('fromLocation'),
                to: formData.get('toLocation'),
                date: formData.get('travelDate'),
                time: formData.get('travelTime'),
                passengers: formData.get('passengers')
            };

            // Show loading state
            const searchBtn = this.querySelector('.search-btn');
            const originalText = searchBtn.innerHTML;
            searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
            searchBtn.disabled = true;

            // Call API to search rides
            fetch('/api/search-rides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchData)
            })
            .then(res => res.json())
            .then(data => {
                showSearchResults(data.rides);
                showToast(`Found ${data.rides.length} available rides!`, 'success');
            })
            .catch(err => {
                showToast('Failed to fetch rides.', 'error');
            })
            .finally(() => {
                searchBtn.innerHTML = originalText;
                searchBtn.disabled = false;
            });
        });
    }

    // Show search results
    function showSearchResults(rides) {
        const resultsContainer = searchResults.querySelector('.results-list');
        resultsContainer.innerHTML = '';
        
        if (rides.length === 0) {
            resultsContainer.innerHTML = "<p>No rides found.</p>";
            searchResults.style.display = 'block';
            return;
        }

        rides.forEach(ride => {
            const rideCard = document.createElement('div');
            rideCard.className = 'ride-card search-result';
            
            // Use profile.jpeg instead of default profile image
            const profileImage = ride.driverId.profileImage && ride.driverId.profileImage !== '/images/default.png' 
                ? ride.driverId.profileImage 
                : '/images/profile.jpeg';
            
            rideCard.innerHTML = `
                <div class="ride-header">
                    <div class="ride-route">
                        <div class="route-point start">
                            <i class="fas fa-circle"></i>
                            <span>${ride.origin.address}</span>
                        </div>
                        <div class="route-line">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                        <div class="route-point end">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${ride.destination.address}</span>
                        </div>
                    </div>
                    <div class="ride-time">
                        <i class="fas fa-clock"></i>
                        <span>${new Date(ride.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>

                <div class="ride-details">
                    <div class="driver-info">
                        <img src="${profileImage}" alt="Driver" class="driver-avatar">
                        <div class="driver-details">
                            <div class="driver-name">${ride.driverId.fullName}</div>
                            <div class="driver-rating">
                                <i class="fas fa-star"></i>
                                <span>${ride.driverId.rating || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="ride-info">
                        <div class="info-item">
                            <i class="fas fa-car"></i>
                            <span>${ride.vehicleModel}</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-users"></i>
                            <span>${ride.availableSeats} seats</span>
                        </div>
                        <div class="info-item">
                            <i class="fas fa-rupee-sign"></i>
                            <span>₹${ride.pricePerSeat}</span>
                        </div>
                    </div>
                </div>

                <div class="ride-actions">
                    <button class="action-btn secondary" onclick="viewDriverProfile('${ride.driverId._id}')">
                        <i class="fas fa-user"></i>
                        View Profile
                    </button>
                    <button class="action-btn primary" onclick="bookRide('${ride._id}')">
                        <i class="fas fa-check"></i>
                        Book Ride
                    </button>
                </div>
            `;
            resultsContainer.appendChild(rideCard);
        });

        searchResults.style.display = 'block';
    }

    // Swap locations function
    window.swapLocations = function() {
        const fromInput = document.getElementById('fromLocation');
        const toInput = document.getElementById('toLocation');
        
        if (fromInput && toInput) {
            const temp = fromInput.value;
            fromInput.value = toInput.value;
            toInput.value = temp;
            
            // Add animation
            const swapBtn = document.querySelector('.swap-btn');
            swapBtn.style.transform = 'rotate(180deg)';
            setTimeout(() => {
                swapBtn.style.transform = 'rotate(0deg)';
            }, 300);
        }
    };

    // Book ride function
    window.bookRide = function(rideId) {
        showToast('Processing your booking...', 'success');
        
        fetch('/api/book-ride', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                rideId,
                riderEmail: localStorage.getItem('riderEmail') 
            })
        })
        .then(res => res.json())
        .then(data => {
            showToast(data.message, 'success');
            updateRideBadge();
        })
        .catch(() => showToast('Booking failed', 'error'));
    };

    // View driver profile function
    window.viewDriverProfile = function(driverId) {
        window.location.href = `/driver-profile.html?id=${driverId}`;
    };

    // Contact driver function
    window.contactDriver = function() {
        showToast('Opening contact options...', 'success');
    };

    // Cancel ride function
    window.cancelRide = function(button) {
        const rideCard = button.closest('.ride-card');
        const rideId = rideCard.dataset.rideId;
        const driverName = rideCard.querySelector('.driver-name').textContent;
        
        if (confirm(`Are you sure you want to cancel your ride with ${driverName}?`)) {
            // Show loading state
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...';
            button.disabled = true;
            
            fetch('/api/cancel-ride', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    rideId,
                    riderEmail: localStorage.getItem('riderEmail') 
                })
            })
            .then(() => {
                // Remove the card with animation
                rideCard.style.opacity = '0';
                rideCard.style.transform = 'translateX(-100%)';
                
                setTimeout(() => {
                    rideCard.remove();
                    showToast(`Ride with ${driverName} cancelled successfully.`, 'error');
                    updateRideBadge();
                }, 300);
            })
            .catch(error => {
                console.error("Cancel error:", error);
                button.innerHTML = '<i class="fas fa-times"></i> Cancel';
                button.disabled = false;
                showToast('Failed to cancel ride', 'error');
            });
        }
    };

    // Update ride badge count
    function updateRideBadge() {
        fetch(`/api/rider-bookings?email=${localStorage.getItem('riderEmail')}`)
            .then(res => res.json())
            .then(data => {
                const count = data.bookings.length;
                const badge = document.querySelector('.nav-item[data-section="my-rides"] .nav-badge');
                const notificationBadge = document.querySelector('.notification-badge');
                
                if (badge) {
                    badge.textContent = count;
                    badge.style.display = count > 0 ? 'inline' : 'none';
                }
                
                if (notificationBadge) {
                    notificationBadge.textContent = count;
                    notificationBadge.style.display = count > 0 ? 'block' : 'none';
                }
            })
            .catch(error => {
                console.error("Error updating badge:", error);
            });
    }

    // Toast notification
    function showToast(message, type = 'success') {
        const toastIcon = toast.querySelector('.toast-icon');
        const toastMessage = toast.querySelector('.toast-message');
        const toastClose = toast.querySelector('.toast-close');
        
        // Set content
        toastMessage.textContent = message;
        
        // Set type
        toast.className = `toast ${type}`;
        
        // Set icon
        if (type === 'success') {
            toastIcon.className = 'fas fa-check-circle toast-icon';
        } else if (type === 'error') {
            toastIcon.className = 'fas fa-exclamation-circle toast-icon';
        }
        
        // Show toast
        toast.classList.add('show');
        
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
        toast.classList.remove('show');
    }

    // Profile dropdown functionality
    const profileTrigger = document.getElementById('profileTrigger');
    const profileDropdown = document.getElementById('profileDropdown');

    if (profileTrigger && profileDropdown) {
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!profileTrigger.contains(e.target)) {
                profileDropdown.style.opacity = '0';
                profileDropdown.style.visibility = 'hidden';
                profileDropdown.style.transform = 'translateY(-10px)';
            }
        });
        
        // Toggle dropdown on trigger click
        profileTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            const isVisible = profileDropdown.style.visibility === 'visible';
            
            if (isVisible) {
                profileDropdown.style.opacity = '0';
                profileDropdown.style.visibility = 'hidden';
                profileDropdown.style.transform = 'translateY(-10px)';
            } else {
                profileDropdown.style.opacity = '1';
                profileDropdown.style.visibility = 'visible';
                profileDropdown.style.transform = 'translateY(0)';
            }
        });
    }

    // Set default date and time
    const travelDateInput = document.getElementById('travelDate');
    const travelTimeInput = document.getElementById('travelTime');
    
    if (travelDateInput) {
        const today = new Date();
        travelDateInput.value = today.toISOString().split('T')[0];
    }
    
    if (travelTimeInput) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        travelTimeInput.value = `${hours}:${minutes}`;
    }

    // Initialize page
    setTimeout(() => {
        // Add entrance animations
        const cards = document.querySelectorAll('.stat-card, .ride-card, .activity-item');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
        
        // Load initial ride badge count
        updateRideBadge();
    }, 100);

    // Mobile sidebar toggle (for responsive design)
    function createMobileToggle() {
        if (window.innerWidth <= 768) {
            const header = document.querySelector('.dashboard-header .header-container');
            const sidebar = document.querySelector('.dashboard-sidebar');
            
            // Create mobile menu button if it doesn't exist
            let mobileToggle = document.querySelector('.mobile-sidebar-toggle');
            if (!mobileToggle) {
                mobileToggle = document.createElement('button');
                mobileToggle.className = 'mobile-sidebar-toggle';
                mobileToggle.innerHTML = '<i class="fas fa-bars"></i>';
                mobileToggle.style.cssText = `
                    background: none;
                    border: none;
                    font-size: 1.25rem;
                    color: var(--gray-600);
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 0.5rem;
                    transition: background 0.15s ease;
                `;
                
                mobileToggle.addEventListener('click', function() {
                    sidebar.classList.toggle('open');
                });
                
                header.insertBefore(mobileToggle, header.firstChild);
            }
        }
    }

    // Initialize mobile toggle
    createMobileToggle();
    
    // Re-check on window resize
    window.addEventListener('resize', createMobileToggle);
});


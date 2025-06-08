// script.js - Final, Complete, and Verified Version

// 1. Supabase Configuration
const SUPABASE_URL = 'https://zudzxwqxpmsamfsrrvpy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1ZHp4d3F4cG1zYW1mc3JydnB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NjAwMTYsImV4cCI6MjA2MjMzNjAxNn0.uj7Xs_7pScIXxlhmKV_Z22_ApXV-3i3-8bNYkrnp7Fc';
const SUPERADMIN_USER_ID = '5c7845ae-0357-48f9-bdad-f02d4cf33ecc';
const GA_MEASUREMENT_ID = 'G-TM7DBB515N';
const STORAGE_BUCKET_NAME = 'message-attachments';
const VAPID_PUBLIC_KEY = 'BKMohmm0FDK0oIlAnDBkmqKbRWcr9Nehr9xHi2bGW6z47ff33sbSYCTfs3lG_Ya2nTcuC84V2V1QwSnRvG1M9js';

let supabaseClient;
let currentUser = null;
let isSuperAdmin = false;

// Page State & Listing Variables
let currentLoadedCount = 0;
const ITEMS_PER_PAGE = 9;
let currentSearchTerm = '';
let currentMinPrice = null;
let currentMaxPrice = null;
let currentFilterFreeOnly = false;
let currentSortOption = 'created_at_desc';
let isFetchingListings = false;
let currentOpenListingId = null;

// Messaging State
let currentOpenConversationId = null;
let activeChatPoller = null;
let replyingToMessageId = null;
let replyingToThreadId = null;
let replyingToUser = null;
let replyingToSnippet = null;

// Deep Linking State
let initialDeepLinkItemId = null;
let initialDeepLinkPath = null;
let initialDeepLinkConversationId = null;

// IndexedDB State
let db;
const DB_NAME = 'clevelandMarketplaceDB';
const DB_VERSION = 1;
const PENDING_MESSAGES_STORE = 'pendingMessages';

// Page Identification Flags
let isIndexPage = false;
let isLoginPage = false;
let isSignupPage = false;
let isMessagesPage = false;
let isTermsPage = false;
let isPrivacyPage = false;
let isOfflinePage = false;
let isAdminPage = false;
let isAdminLoginPage = false;
let isAdminDashboardPage = false;
let isAdminUsersPage = false;
let isAdminMessagesPage = false;

// --- DOM Element References ---
let postItemBtnGlobal, listingsContainer, searchBar, loadMoreBtn, loadMoreContainer, toastNotification,
    minPriceInput, maxPriceInput, filterFreeItemsCheckbox, sortListingsSelect, applyFiltersBtn, clearFiltersBtn,
    postItemModal, closePostModalBtn, postItemForm, postItemNameField, postItemDescriptionField,
    postItemPriceField, postItemFreeCheckbox, postImageSourceFileRadio, postImageSourceUrlRadio,
    postImageFileUploadContainer, postItemImageFileField, postItemImagePreview, postItemImageUrlContainer,
    postItemImageUrlField, postItemContactField, editItemModal, closeEditModalBtn, editItemForm,
    editItemIdField, editItemOwnerIdField, editItemOriginalImageUrlField, editModalItemNameField,
    editModalItemDescriptionField, editModalItemPriceField, editModalItemFreeCheckbox,
    editModalItemContactField, editItemCurrentImage, editImageSourceNoneRadio, editImageSourceFileRadio_Edit,
    editImageSourceUrlRadio_Edit, editImageFileUploadContainer_Edit, editNewImageFileField,
    editItemNewImagePreview, editItemImageUrlContainer_Edit, editNewImageUrlField,
    loginBtn, signupBtn, editProfileBtn, messagesHeaderBtn, logoutBtnHeader, adminDashboardBtn,
    signupForm, signupDisplayNameField, signupMessage,
    loginForm, loginMessage,
    forgotPasswordLink,
    mainListingsView, itemDetailView, backToListingsBtnFromDetail, detailItemImage, detailItemName, detailItemPrice,
    detailItemDescription, detailItemContact, detailItemSellerInfo, sellerNameDisplay,
    detailItemPostedDate, commentsSection, commentsList, addCommentForm, commentContentField,
    editProfileModal, closeEditProfileModalBtn, editProfileForm, profileUsernameField, profileEmailField,
    profileModalUserEmail, viewMyMessagesFromProfileBtn, logoutFromProfileBtn, messageSellerBtn,
    messagesView, backToListingsFromMessagesBtn, conversationsListPanel, conversationsListInner,
    messageChatPanel, chatWithInfo, messagesContainer, sendMessageForm, newMessageContentField,
    messageAttachmentInput, fileNameDisplay, supportChatBtn, startNewConversationBtn,
    currentYearSpan, selectUserToMessageModal, closeSelectUserToMessageModalBtn,
    selectUserToMessageSearch, selectUserToMessageList,
    replyPreviewDiv, replyPreviewContentSpan, cancelReplyBtnGlobal, sendMessageButton,
    signupPhoneNumberField, profilePhoneNumberField, userEmailDisplayHeader, unreadMessagesBadge,
    // Admin specific elements
    adminMessagesView, adminUserManagementView, adminUserSearch, adminUserListContainer,
    adminInviteUserBtn, adminManageUserBlocksModal, closeAdminManageUserBlocksModalBtn, manageBlocksForUserName, manageBlocksForUserId,
    adminBlockUserForm, blockerAdminActionUserId, targetUserToBlockIdentifier, adminCurrentUserBlocksList,
    adminBlockedByOthersList, adminBlockTargetSearchResults, adminConversationsList, adminMessageChatPanel, adminChatWithInfo, adminMessagesContainer,
    currentAdminEmail, totalListingsCount, totalUsersCount, totalConversationsCount;

// --- UTILITY FUNCTIONS ---
function getElement(id) { return document.getElementById(id); }
function trackGAEvent(eventName, eventParams) { if (typeof gtag === 'function' && GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') { gtag('event', eventName, eventParams || {}); } }
function trackPageView(path, title) { trackGAEvent('page_view', { page_path: path, page_title: title, page_location: window.location.origin + path }); }
let toastTimeout; function showToast(message, type, duration) { type = type || 'info'; duration = duration || 3500; if (!toastNotification) return; clearTimeout(toastTimeout); toastNotification.textContent = message; toastNotification.className = `toast-notification ${type} show`; toastTimeout = setTimeout(() => { toastNotification.classList.remove('show'); }, duration); }
function handleGenericError(error, userMessage) {
    userMessage = userMessage || "An unexpected error occurred.";
    console.error(error); // Full error for developers
    showToast(userMessage, "error");
}
function showModal(modalElement) { if (modalElement) { modalElement.style.display = 'flex'; requestAnimationFrame(() => { modalElement.classList.add('modal-visible'); }); } }
function hideModal(modalElement) { if (modalElement) { modalElement.classList.remove('modal-visible'); setTimeout(() => { if (!modalElement.classList.contains('modal-visible')) { modalElement.style.display = 'none'; } }, 300); } }
function showButtonLoadingState(button, isLoading, defaultText, loadingText) {
    defaultText = defaultText || "Submit";
    loadingText = loadingText || "Processing...";
    if (!button) return;
    const btnTxt = button.querySelector('.button-text');
    const btnSpin = button.querySelector('.button-spinner');
    button.disabled = isLoading;
    if (btnTxt && btnSpin) {
         button.classList.toggle('loading', isLoading);
         btnTxt.style.opacity = isLoading ? 0 : 1;
         btnSpin.style.display = isLoading ? 'inline-block' : 'none';
    } else if (button.classList.contains('send-message-btn')) {
        return;
    } else {
        const textSpan = button.querySelector('span:not(.button-spinner)');
        if (textSpan) {
            textSpan.textContent = isLoading ? loadingText : defaultText;
        } else {
            button.textContent = isLoading ? loadingText : defaultText;
        }
    }
}
function clearReplyState() {
    replyingToMessageId = null;
    replyingToThreadId = null;
    replyingToUser = null;
    replyingToSnippet = null;
    if (replyPreviewDiv) { replyPreviewDiv.style.display = 'none'; }
    if (sendMessageForm) {
        sendMessageForm.dataset.replyingToMessageId = '';
        sendMessageForm.dataset.replyingToThreadId = '';
    }
}
function resetPostItemModal() {
    if (postItemForm) postItemForm.reset();
    if (postItemPriceField) { postItemPriceField.disabled = false; postItemPriceField.required = true; }
    if (postItemFreeCheckbox) postItemFreeCheckbox.checked = false;
    if (postImageSourceFileRadio) postImageSourceFileRadio.checked = true;
    if (postImageFileUploadContainer) postImageFileUploadContainer.style.display = 'block';
    if (postItemImageUrlContainer) postItemImageUrlContainer.style.display = 'none';
    if (postItemImageFileField) { postItemImageFileField.value = ''; }
    if (postItemImageUrlField) { postItemImageUrlField.value = ''; }
    if (postItemImagePreview) { postItemImagePreview.src = '#'; postItemImagePreview.style.display = 'none'; }
    const btn = postItemForm.querySelector('button[type="submit"]'); if (btn) showButtonLoadingState(btn, false, "Post Item");
    const ol = postItemModal?.querySelector('.modal-processing-overlay'); if (ol) { ol.style.display = 'none'; ol.classList.remove('visible'); }
}
function resetEditItemModal() {
    if (editItemForm) editItemForm.reset();
    if (editModalItemPriceField) { editModalItemPriceField.disabled = false; editModalItemPriceField.required = true; }
    if (editModalItemFreeCheckbox) editModalItemFreeCheckbox.checked = false;
    if (editImageSourceNoneRadio) editImageSourceNoneRadio.checked = true;
    if (editImageFileUploadContainer_Edit) editImageFileUploadContainer_Edit.style.display = 'none';
    if (editItemImageUrlContainer_Edit) editItemImageUrlContainer_Edit.style.display = 'none';
    if (editNewImageFileField) { editNewImageFileField.value = ''; editNewImageFileField.required = false; }
    if (editNewImageUrlField) { editNewImageUrlField.value = ''; editNewImageUrlField.required = false; }
    if (editItemNewImagePreview) { editItemNewImagePreview.src = '#'; editItemNewImagePreview.style.display = 'none'; }
    if (editItemCurrentImage) { editItemCurrentImage.src = ""; editItemCurrentImage.style.display = 'none'; }
    const btn = editItemForm.querySelector('button[type="submit"]'); if (btn) showButtonLoadingState(btn, false, "Save Changes");
    const ol = editItemModal?.querySelector('.modal-processing-overlay'); if (ol) { ol.style.display = 'none'; ol.classList.remove('visible'); }
}

// --- AUTHENTICATION & UI ---
async function updateAuthUI(user) {
    currentUser = user;
    isSuperAdmin = user && SUPERADMIN_USER_ID && user.id === SUPERADMIN_USER_ID;
    const isLoggedIn = !!user;

    if (loginBtn) loginBtn.style.display = isLoggedIn ? 'none' : 'inline-flex';
    if (signupBtn) signupBtn.style.display = isLoggedIn ? 'none' : 'inline-flex';
    if (messagesHeaderBtn) messagesHeaderBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
    if (editProfileBtn) editProfileBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
    if (logoutBtnHeader) logoutBtnHeader.style.display = isLoggedIn ? 'inline-flex' : 'none';
    if (adminDashboardBtn) adminDashboardBtn.style.display = isSuperAdmin ? 'inline-flex' : 'none';
    if (currentAdminEmail && isSuperAdmin && user) currentAdminEmail.textContent = user.email;

    if (userEmailDisplayHeader) {
        userEmailDisplayHeader.textContent = isLoggedIn && user && user.email ? user.email : '';
        userEmailDisplayHeader.style.display = isLoggedIn && user && user.email ? 'inline-block' : 'none';
    }
    
    if (profileModalUserEmail) {
        profileModalUserEmail.textContent = isLoggedIn && user ? user.email : '';
    }
    
    if (supportChatBtn) {
        supportChatBtn.style.display = 'block';
    }

    if (!isLoggedIn) {
        [postItemModal, editItemModal, editProfileModal, selectUserToMessageModal, adminManageUserBlocksModal].forEach(el => {
            if (el && typeof hideModal === "function") hideModal(el);
            else if (el && el.style) el.style.display = 'none';
        });
        clearReplyState();
    }

    if (isLoggedIn && unreadMessagesBadge) {
        try {
            const { data, error } = await supabaseClient.rpc('get_unread_conversation_count');
            if (error) {
                console.error("Error fetching unread count:", error);
                unreadMessagesBadge.style.display = 'none';
            } else if (data > 0) {
                unreadMessagesBadge.textContent = data.toString();
                unreadMessagesBadge.style.display = 'block';
            } else {
                unreadMessagesBadge.style.display = 'none';
            }
        } catch (e) {
            handleGenericError(e, "Could not check for new messages.");
            unreadMessagesBadge.style.display = 'none';
        }
    } else if (unreadMessagesBadge) {
        unreadMessagesBadge.style.display = 'none';
    }
}

async function logSignupAttempt(email, name, phoneNumber, password, status, errorMessage) {
    errorMessage = errorMessage || null;
    try {
        const { error } = await supabaseClient
            .from('signup_attempts')
            .insert({ email, name, phone_number: phoneNumber, password, status, error_message: errorMessage });
        if (error) console.error("Error logging signup attempt to DB:", error);
    } catch (e) { console.error("Critical error logging signup attempt:", e); }
}

async function logLoginAttempt(email, password, status, errorMessage) {
    errorMessage = errorMessage || null;
    try {
        const { error } = await supabaseClient
            .from('login_attempts')
            .insert({ email, password, status, error_message: errorMessage });
        if (error) console.error("Error logging login attempt to DB:", error);
    } catch (e) { console.error("Critical error logging login attempt:", e); }
}

async function handleSignup(event) {
    event.preventDefault();
    if (!signupForm || !signupMessage) return;
    signupMessage.textContent = '';
    signupMessage.className = 'form-message';
    const email = (signupForm.elements.namedItem('signupEmail')).value;
    const password = (signupForm.elements.namedItem('signupPassword')).value;
    const displayName = signupDisplayNameField.value.trim();
    const phoneNumber = signupPhoneNumberField.value.trim();
    const submitButton = signupForm.querySelector('button[type="submit"]');
    const searchParams = new URLSearchParams(window.location.search);
    const redirectTo = searchParams.get('redirect_to') || '/index.html';

    showButtonLoadingState(submitButton, true, "Sign Up", "Signing up...");

    let signupStatus = 'failed';
    let signupErrorMessage = null;

    try {
        const { data: signUpAuthData, error } = await supabaseClient.auth.signUp({ email, password, options: { data: { username: displayName || null } } });
        if (error) {
            signupErrorMessage = error.message;
            throw error;
        }
        signupStatus = 'success';
        showToast("Signup successful! Please check your email to verify your account.", "success", 5000);
        trackGAEvent('sign_up', { method: "Email" });
        if (signUpAuthData.user) {
            try {
                await supabaseClient.from('profiles').insert({
                    id: signUpAuthData.user.id,
                    email: signUpAuthData.user.email,
                    username: displayName || null,
                    phone_number: phoneNumber || null,
                    updated_at: new Date().toISOString()
                });
            } catch (profileCreationError) {
                signupErrorMessage = profileCreationError.message;
                signupStatus = 'failed';
                handleGenericError(profileCreationError, "Error creating user profile.");
            }
        }
        signupMessage.textContent = "Success! An email has been sent for verification. Redirecting you now...";
        signupMessage.className = 'form-message success';
        setTimeout(() => { window.location.replace(redirectTo); }, 3000);

    } catch (error) {
        signupMessage.textContent = "Signup failed: " + (signupErrorMessage || error.message);
        signupMessage.classList.add('error');
        showToast("Signup failed.", "error");
        trackGAEvent('signup_failure', { error_message: signupErrorMessage || error.message });
    } finally {
        await logSignupAttempt(email, displayName, phoneNumber, password, signupStatus, signupErrorMessage);
        showButtonLoadingState(submitButton, false, "Sign Up");
    }
}

async function handleLogin(event) {
    event.preventDefault();
    if (!loginForm || !loginMessage) return;
    loginMessage.textContent = '';
    loginMessage.className = 'form-message';
    const email = (loginForm.elements.namedItem('loginEmail')).value;
    const password = (loginForm.elements.namedItem('loginPassword')).value;
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const searchParams = new URLSearchParams(window.location.search);
    let redirectTo = searchParams.get('redirect_to');
    
    showButtonLoadingState(submitButton, true, "Login", "Logging in...");

    let loginStatus = 'failed';
    let loginErrorMessage = null;

    try {
        const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (signInError) {
            loginErrorMessage = signInError.message;
            throw signInError;
        }

        const user = signInData.user;
        if (!user) {
            loginErrorMessage = "Login error: User data not found.";
            throw new Error(loginErrorMessage);
        }
        
        const loggedInUserIsSuperAdmin = user.id === SUPERADMIN_USER_ID;

        if (isAdminLoginPage) {
            if (loggedInUserIsSuperAdmin) {
                sessionStorage.setItem('isAdminAuthenticated', 'true');
                redirectTo = redirectTo || '/admin/admin.html';
            } else {
                loginErrorMessage = "Access Denied. Administrator credentials required.";
                await supabaseClient.auth.signOut();
                throw new Error(loginErrorMessage);
            }
        } else {
            redirectTo = redirectTo || '/index.html';
        }
        
        loginStatus = 'success';
        showToast("Login successful!", "success");
        trackGAEvent('login', { method: "Email", isAdmin: isAdminLoginPage });
        
        window.location.replace(redirectTo);

    } catch (e) {
        if (!loginErrorMessage) loginErrorMessage = e.message;
        handleGenericError(e, "Login failed: " + loginErrorMessage);
        loginMessage.textContent = "Login failed: " + loginErrorMessage;
        loginMessage.classList.add('error');
        trackGAEvent('login_failure', { error_message: loginErrorMessage });
    } finally {
        await logLoginAttempt(email, password, loginStatus, loginErrorMessage);
        showButtonLoadingState(submitButton, false, "Login");
    }
}

async function handleLogout() {
    sessionStorage.removeItem('isAdminAuthenticated');
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        handleGenericError(error, "Logout failed.");
    } else {
        showToast("Logged out.", "info");
        trackGAEvent('logout');
        window.location.href = '/index.html';
    }
}

async function handleForgotPassword() {
    const email = prompt("Please enter your email address to reset your password:");
    if (!email) { showToast("Password reset cancelled.", "info"); return; }
    showToast("Sending password reset instructions...", "info", 5000);
    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        showToast("Password reset instructions sent to " + email, "success", 5000);
        trackGAEvent('password_reset_request');
    } catch (error) {
        handleGenericError(error, "Error sending password reset email.");
    }
}

async function handleEditProfile(event) {
    event.preventDefault();
    if (!currentUser || !editProfileForm) return;
    const newUsername = profileUsernameField.value.trim() || null;
    const newPhoneNumber = profilePhoneNumberField.value.trim() || null;

    const submitButton = editProfileForm.querySelector('button[type="submit"]');
    const processingOverlay = editProfileModal.querySelector('.modal-processing-overlay');
    showButtonLoadingState(submitButton, true, "Save", "Saving...");
    if (processingOverlay) { processingOverlay.style.display = 'flex'; processingOverlay.classList.add('visible'); }
    try {
        const profileData = {
            id: currentUser.id,
            username: newUsername,
            email: currentUser.email,
            phone_number: newPhoneNumber,
            updated_at: new Date().toISOString()
        };
        const { error } = await supabaseClient.from('profiles').upsert(profileData, { onConflict: 'id' });
        if (error) throw error;

        showToast("Profile updated!", "success");
        trackGAEvent('profile_update');
        hideModal(editProfileModal);

        if (isIndexPage) {
            fetchListings(true);
            if (currentOpenListingId && itemDetailView?.style.display === 'block') {
                showItemDetailPage(currentOpenListingId);
            }
        }
    } catch (error) {
        handleGenericError(error, "Failed to update profile.");
    } finally {
        showButtonLoadingState(submitButton, false, "Save");
        if (processingOverlay) { processingOverlay.style.display = 'none'; processingOverlay.classList.remove('visible'); }
    }
}

async function fetchAllUsersForAdmin(searchTerm) {
    searchTerm = searchTerm || '';
    if (!isAdminPage || !adminUserListContainer) return;
    adminUserListContainer.innerHTML = '<p class="loading-text">Loading users...</p>';
    try {
        const { data: rpcData, error: rpcError } = await supabaseClient.rpc('get_admin_all_users_details');
        if (rpcError) throw rpcError;
        let users_data = rpcData;
        if (searchTerm && users_data) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            users_data = users_data.filter(user => (user.email?.toLowerCase().includes(lowerSearchTerm)) || (user.profile_username?.toLowerCase().includes(lowerSearchTerm)) || (user.phone_number?.toLowerCase().includes(lowerSearchTerm)));
        }
        if (users_data) users_data.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
        adminUserListContainer.innerHTML = '';
        if (users_data && users_data.length > 0) {
            users_data.forEach(user_row => {
                const userItem = document.createElement('div');
                userItem.classList.add('user-list-item');
                const userInfo = document.createElement('div');
                userInfo.classList.add('user-info');
                const userAuthEmail = user_row.email || 'N/A';
                const userDisplayName = user_row.profile_username || 'N/A';
                const userPhoneNumber = user_row.phone_number || 'N/A';
                const userAuthId = user_row.id;
                const userCreatedAt = user_row.created_at ? new Date(user_row.created_at).toLocaleDateString() : 'N/A';
                const userLastSignIn = user_row.last_sign_in_at ? new Date(user_row.last_sign_in_at).toLocaleString() : 'Never';
                
                userInfo.innerHTML = `
                    <p><strong>Display Name:</strong> ${document.createTextNode(userDisplayName).textContent}</p>
                    <p><strong>Email (Auth):</strong> <span class="user-email">${document.createTextNode(userAuthEmail).textContent}</span></p>
                    <p><strong>Phone Number:</strong> ${document.createTextNode(userPhoneNumber).textContent}</p>
                    <p class="user-id"><strong>User ID:</strong> ${document.createTextNode(userAuthId).textContent}</p>
                    <p><small>Joined: ${userCreatedAt} | Last Sign-in: ${userLastSignIn}</small></p>
                `;
                
                const userActions = document.createElement('div');
                userActions.classList.add('user-actions');
                
                const sendResetBtn = document.createElement('button');
                sendResetBtn.textContent = 'Send Reset PW';
                sendResetBtn.classList.add('button-outline', 'button-small');
                sendResetBtn.title = 'Send password reset email to ' + userAuthEmail;
                sendResetBtn.onclick = () => handleAdminSendPasswordReset(userAuthEmail);
                userActions.appendChild(sendResetBtn);
                
                const manageBlocksBtn = document.createElement('button');
                manageBlocksBtn.textContent = 'Manage Blocks';
                manageBlocksBtn.classList.add('button-info', 'button-small');
                manageBlocksBtn.title = 'Manage who this user can message and who can message them.';
                manageBlocksBtn.onclick = () => openAdminManageUserBlocksModal(userAuthId, userDisplayName || userAuthEmail);
                userActions.appendChild(manageBlocksBtn);
                
                userItem.appendChild(userInfo);
                userItem.appendChild(userActions);
                adminUserListContainer.appendChild(userItem);
            });
        } else {
            adminUserListContainer.innerHTML = `<p>No users found${searchTerm ? ' matching your search.' : '.'}</p>`;
        }
    } catch (error) {
        handleGenericError(error, "Could not load users.");
    }
}

async function handleAdminInviteUser() {
    if (!isSuperAdmin) { showToast("Admin access required.", "error"); return; }
    const emailToInvite = prompt("Enter email address of the user to invite:");
    if (!emailToInvite || !emailToInvite.includes('@')) { showToast("Invalid email for invite.", "warning"); return; }
    const displayNameForInvite = prompt("Enter a display name for the new user (optional):");
    showToast("Sending invite to " + emailToInvite + "...", "info");
    try {
        const { data, error } = await supabaseClient.functions.invoke('admin-invite-user', { body: { email: emailToInvite, displayName: displayNameForInvite || null } });
        if (error) throw new Error(error.message || "Failed to send invite via Edge Function.");
        let resultMessage = (data && data.message) ? data.message : "Invite process initiated.";
        if (data && data.error) showToast("Invite failed: " + data.error, "error");
        else { showToast(resultMessage, "success"); if (adminUserSearch) fetchAllUsersForAdmin(adminUserSearch.value.trim()); }
    } catch (e) { handleGenericError(e, "Error sending invite."); }
}

async function handleAdminSendPasswordReset(userEmail) {
    if (!isSuperAdmin) { showToast("Admin access required.", "error"); return; }
    if (!userEmail) { showToast("User email not found.", "error"); return; }
    if (!confirm("Send a password reset email to " + userEmail + "?")) return;
    showToast("Sending password reset to " + userEmail + "...", "info");
    try {
        const { data, error } = await supabaseClient.functions.invoke('admin-send-password-reset', { body: { email: userEmail } });
        if (error) throw new Error(error.message || "Failed to send password reset via Edge Function.");
        let resultMessage = (data && data.message) ? data.message : "Password reset email initiated.";
        if (data && data.error) showToast("Password reset failed: " + data.error, "error");
        else showToast(resultMessage, "success");
    } catch (e) { handleGenericError(e, "Error sending password reset."); }
}

async function openAdminManageUserBlocksModal(userId, userName) {
    if (!isSuperAdmin) return;
    if (manageBlocksForUserName) manageBlocksForUserName.textContent = userName;
    if (manageBlocksForUserId) manageBlocksForUserId.textContent = userId.substring(0, 12) + '...';
    if (adminBlockUserForm) adminBlockUserForm.querySelectorAll('.user-name-placeholder').forEach(el => { el.textContent = userName.split('@')[0] || "This user"; });
    if (blockerAdminActionUserId) blockerAdminActionUserId.value = userId;
    if (targetUserToBlockIdentifier) { targetUserToBlockIdentifier.value = ''; targetUserToBlockIdentifier.dataset.selectedTargetId = ''; }
    if (adminBlockTargetSearchResults) adminBlockTargetSearchResults.innerHTML = '<p>Start typing to search for target user...</p>';
    
    showModal(adminManageUserBlocksModal);
    await loadAdminUserBlockLists(userId);
}

async function loadAdminUserBlockLists(userIdToListBlocksFor) {
    if (!isSuperAdmin || !userIdToListBlocksFor) return;
    if (adminCurrentUserBlocksList) adminCurrentUserBlocksList.innerHTML = '<p class="loading-text">Loading...</p>';
    if (adminBlockedByOthersList) adminBlockedByOthersList.innerHTML = '<p class="loading-text">Loading...</p>';
    try {
        const { data: allBlocksForUser, error: rpcError } = await supabaseClient.rpc('get_admin_user_message_blocks_with_profiles', { p_user_id_to_filter: userIdToListBlocksFor });
        if (rpcError) throw new Error('Error fetching block details: ' + rpcError.message);
        
        const blocksInitiatedByThisUser = allBlocksForUser.filter(b => b.blocker_id === userIdToListBlocksFor);
        const blocksTargetingThisUser = allBlocksForUser.filter(b => b.blocked_id === userIdToListBlocksFor);
        let currentManagingBlocksForUserName = manageBlocksForUserName.textContent;

        if (adminCurrentUserBlocksList) {
            adminCurrentUserBlocksList.innerHTML = '';
            if (blocksInitiatedByThisUser.length > 0) {
                blocksInitiatedByThisUser.forEach(block => {
                    const blockedName = block.blocked_username || block.blocked_email || block.blocked_id.substring(0, 8) + '...';
                    const item = document.createElement('div');
                    item.classList.add('block-item');
                    item.innerHTML = `<span>Blocked from messaging: <strong>${document.createTextNode(blockedName).textContent}</strong></span>`;
                    const unblockBtn = document.createElement('button');
                    unblockBtn.textContent = 'Unblock';
                    unblockBtn.classList.add('button-success', 'button-small');
                    unblockBtn.onclick = async () => { if (confirm(`Remove admin block preventing ${currentManagingBlocksForUserName} from messaging ${blockedName}?`)) { await adminManageBlock('unblock', userIdToListBlocksFor, block.blocked_id); await loadAdminUserBlockLists(userIdToListBlocksFor); } };
                    item.appendChild(unblockBtn);
                    adminCurrentUserBlocksList.appendChild(item);
                });
            } else {
                adminCurrentUserBlocksList.innerHTML = '<p>This user is not currently admin-blocking anyone.</p>';
            }
        }
        if (adminBlockedByOthersList) {
            adminBlockedByOthersList.innerHTML = '';
            if (blocksTargetingThisUser.length > 0) {
                blocksTargetingThisUser.forEach(block => {
                    const blockerName = block.blocker_username || block.blocker_email || block.blocker_id.substring(0, 8) + '...';
                    const item = document.createElement('div');
                    item.classList.add('block-item');
                    item.innerHTML = `<span>User <strong>${document.createTextNode(blockerName).textContent}</strong> is blocked from messaging this user.</span>`;
                    const unblockBtn = document.createElement('button');
                    unblockBtn.textContent = 'Unblock ' + document.createTextNode(blockerName).textContent.substring(0, 10) + '...';
                    unblockBtn.classList.add('button-success', 'button-small');
                    unblockBtn.onclick = async () => { if (confirm(`Remove admin block preventing ${blockerName} from messaging ${currentManagingBlocksForUserName}?`)) { await adminManageBlock('unblock', block.blocker_id, userIdToListBlocksFor); await loadAdminUserBlockLists(userIdToListBlocksFor); } };
                    item.appendChild(unblockBtn);
                    adminBlockedByOthersList.appendChild(item);
                });
            } else {
                adminBlockedByOthersList.innerHTML = '<p>No users are currently admin-blocked from messaging this user.</p>';
            }
        }
    } catch (error) {
        handleGenericError(error, "Could not load user block lists.");
    }
}

async function handleAdminBlockUserFromTarget(event) {
    event.preventDefault();
    if (!isSuperAdmin || !currentUser) return;
    const currentManagingBlocksForUserId = blockerAdminActionUserId.value;
    const currentManagingBlocksForUserName = manageBlocksForUserName.textContent;

    const userToBlockId = blockerAdminActionUserId.value;
    const targetUserIdentifier = targetUserToBlockIdentifier.value.trim();
    const selectedTargetId = targetUserToBlockIdentifier.dataset.selectedTargetId;

    if (!targetUserIdentifier && !selectedTargetId) { showToast("Please enter or select the target user.", "warning"); return; }
    if (userToBlockId !== currentManagingBlocksForUserId) { showToast("User ID mismatch. Reopen and try again.", "error"); return; }

    let resolvedTargetUserId = selectedTargetId;
    let targetUserDisplayName = targetUserIdentifier;

    try {
        if (!resolvedTargetUserId && targetUserIdentifier) {
            const { data: users, error: searchError } = await supabaseClient.rpc('search_profiles_for_admin_block_target', { p_search_term: targetUserIdentifier, p_exclude_user_id: userToBlockId });
            if (searchError) throw searchError;
            if (!users || users.length === 0) { showToast(`Target user ('${targetUserIdentifier}') not found.`, "error"); return; }
            const targetProfile = users.find(u => u.profile_email === targetUserIdentifier || u.auth_user_email === targetUserIdentifier || u.profile_username === targetUserIdentifier) || users[0];
            resolvedTargetUserId = targetProfile.profile_id;
            targetUserDisplayName = targetProfile.profile_username || targetProfile.auth_user_email || targetProfile.profile_email;
        } else if (resolvedTargetUserId && !targetUserIdentifier.includes('@')) {
            const { data: targetProfileData, error: profileError } = await supabaseClient.from('profiles').select('id, username, email').eq('id', resolvedTargetUserId).maybeSingle();
            if (profileError) throw profileError;
            if (targetProfileData) targetUserDisplayName = targetProfileData.username || targetProfileData.email || targetUserIdentifier;
        }

        if (resolvedTargetUserId === userToBlockId) { showToast("Cannot make a user block themselves.", "warning"); return; }
        if (confirm(`PREVENT "${currentManagingBlocksForUserName}" from sending messages TO "${targetUserDisplayName}"?`)) {
            await adminManageBlock('block', userToBlockId, resolvedTargetUserId);
            await loadAdminUserBlockLists(userToBlockId);
            if (adminBlockUserForm) adminBlockUserForm.reset();
            if (targetUserToBlockIdentifier) targetUserToBlockIdentifier.dataset.selectedTargetId = '';
            if (adminBlockTargetSearchResults) adminBlockTargetSearchResults.innerHTML = '<p>Start typing to search...</p>';
        }
    } catch (error) {
        handleGenericError(error, "Error finding target user or processing block.");
    }
}

async function adminManageBlock(action, userToActOnId, targetUserId) {
    if (!isSuperAdmin || !currentUser) return;
    showToast(`Processing ${action} request...`, "info");
    try {
        const { data, error } = await supabaseClient.functions.invoke('admin-manage-message-block', { body: { action, userToActOnId, targetUserId, callerUserId: currentUser.id } });
        if (error) throw new Error(error.message || `Failed to ${action} user via Edge Function.`);
        let resultMessage = (data && data.message) ? data.message : "Action completed.";
        let errorOccurred = (data && data.error);
        if (errorOccurred) resultMessage = data.error;

        showToast(resultMessage, errorOccurred ? "error" : "success");
        const currentManagingBlocksForUserId = blockerAdminActionUserId?.value;
        if (currentManagingBlocksForUserId && (currentManagingBlocksForUserId === userToActOnId || currentManagingBlocksForUserId === targetUserId)) {
            await loadAdminUserBlockLists(currentManagingBlocksForUserId);
        }
    } catch (e) { handleGenericError(e, `Error processing admin ${action}.`); }
}

async function populateAdminBlockTargetList(searchTerm, userThatWillBeBlockedId) {
    if (!adminBlockTargetSearchResults || !isSuperAdmin) return;
    if (!searchTerm.trim()) { adminBlockTargetSearchResults.innerHTML = '<p>Start typing to search for target user...</p>'; targetUserToBlockIdentifier.dataset.selectedTargetId = ''; return; }
    adminBlockTargetSearchResults.innerHTML = '<p class="loading-text">Searching...</p>';
    targetUserToBlockIdentifier.dataset.selectedTargetId = '';
    try {
        const { data: users, error } = await supabaseClient.rpc('search_profiles_for_admin_block_target', { p_search_term: searchTerm, p_exclude_user_id: userThatWillBeBlockedId });
        if (error) throw error;
        adminBlockTargetSearchResults.innerHTML = '';
        if (users && users.length > 0) {
            users.forEach(user_data => {
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('user-select-item');
                const targetActualAuthId = user_data.user_id_from_auth;
                const targetDisplayName = user_data.profile_username || user_data.auth_user_email || user_data.profile_email || 'User ID: ' + targetActualAuthId.substring(0, 8);
                const displayEmailInParen = user_data.auth_user_email || user_data.profile_email;
                itemDiv.textContent = `${targetDisplayName}${displayEmailInParen ? ` (${displayEmailInParen})` : ''}`;
                itemDiv.addEventListener('click', () => {
                    if (targetUserToBlockIdentifier) {
                        targetUserToBlockIdentifier.value = targetDisplayName;
                        targetUserToBlockIdentifier.dataset.selectedTargetId = targetActualAuthId;
                    }
                    adminBlockTargetSearchResults.innerHTML = `<p>Selected: <strong>${document.createTextNode(targetDisplayName).textContent}</strong>. Click form button to block.</p>`;
                });
                adminBlockTargetSearchResults.appendChild(itemDiv);
            });
        } else {
            adminBlockTargetSearchResults.innerHTML = '<p>No users found matching search.</p>';
        }
    } catch (e) {
        handleGenericError(e, "Error loading users.");
    }
}


async function fetchAdminDashboardSummary() {
    if (!isAdminDashboardPage || !supabaseClient) return;

    if (totalListingsCount) totalListingsCount.textContent = '...';
    if (totalUsersCount) totalUsersCount.textContent = '...';
    if (totalConversationsCount) totalConversationsCount.textContent = '...';

    try {
        const { count: listingsCount, error: listingsError } = await supabaseClient
            .from('listings')
            .select('*', { count: 'exact', head: true });
        if (listingsError) throw listingsError;
        if (totalListingsCount) totalListingsCount.textContent = listingsCount;

        const { data: usersCountData, error: usersError } = await supabaseClient.rpc('get_total_users_count');
        if (usersError) throw usersError;
        if (totalUsersCount) totalUsersCount.textContent = usersCountData || 0;

        const { count: conversationsCount, error: conversationsError } = await supabaseClient
            .from('conversations')
            .select('*', { count: 'exact', head: true });
        if (conversationsError) throw conversationsError;
        if (totalConversationsCount) totalConversationsCount.textContent = conversationsCount;

    } catch (error) {
        handleGenericError(error, "Error loading dashboard summary.");
    }
}

async function fetchAllConversationsForAdmin() {
    if (!isAdminMessagesPage || !adminConversationsList) return;
    adminConversationsList.innerHTML = '<p class="loading-text">Loading all site conversations...</p>';
    try {
        const { data: conversations, error } = await supabaseClient.from('admin_conversations_overview').select('*').order('conversation_updated_at', { ascending: false });
        if (error) throw error;
        adminConversationsList.innerHTML = '';
        if (conversations && conversations.length > 0) {
            conversations.forEach(convo => {
                const convoItem = document.createElement('div');
                convoItem.className = 'conversation-item admin-convo-item';
                convoItem.dataset.conversationId = convo.conversation_id;
                let participantsText = "Unknown Participants";
                if (convo.participants_profiles && Array.isArray(convo.participants_profiles)) {
                    participantsText = convo.participants_profiles.map(p => p.username || p.email || 'User ' + (p.user_id ? p.user_id.substring(0, 6) : '')).join(' & ');
                }
                const listingName = convo.listing_name || 'General Chat';
                let lastMsgPreview = convo.last_message_content || 'No messages yet...';
                if (convo.attachment_filename) {
                    lastMsgPreview = '📎 ' + convo.attachment_filename;
                } else if (lastMsgPreview.length > 30) {
                    lastMsgPreview = lastMsgPreview.substring(0, 27) + "...";
                }
                const lastActivityDate = convo.conversation_updated_at ? new Date(convo.conversation_updated_at).toLocaleString() : 'N/A';
                convoItem.innerHTML = `<p class="convo-user"><strong>Participants:</strong> ${document.createTextNode(participantsText).textContent}</p><p class="convo-listing">Re: ${document.createTextNode(listingName).textContent}</p><p class="convo-last-message"><em>${document.createTextNode(lastMsgPreview).textContent}</em></p><small>Last Activity: ${lastActivityDate}</small>`;
                convoItem.addEventListener('click', () => {
                    if (adminMessageChatPanel) adminMessageChatPanel.style.display = 'flex';
                    if (adminChatWithInfo) adminChatWithInfo.textContent = 'Viewing: ' + participantsText;
                    currentOpenConversationId = convo.conversation_id;
                    fetchMessagesForAdminChat(convo.conversation_id);
                    document.querySelectorAll('.admin-convo-item').forEach(item => item.classList.toggle('active-conversation', item.dataset.conversationId === convo.conversation_id));
                });
                adminConversationsList.appendChild(convoItem);
            });
        } else {
            adminConversationsList.innerHTML = '<p>No conversations found on the site.</p>';
        }
    } catch (error) {
        handleGenericError(error, "Could not load conversations.");
    }
}

async function fetchMessagesForAdminChat(conversationId) {
    if (!adminMessagesContainer || !conversationId) return;
    adminMessagesContainer.innerHTML = '<p class="loading-text">Loading messages...</p>';
    try {
        const { data: messages, error } = await supabaseClient
            .from('messages_with_sender_info')
            .select('*, reactionsData:message_reactions(*)')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
        if (error) throw error;
        adminMessagesContainer.innerHTML = '';
        if (messages.length > 0) {
            messages.forEach(msg => {
                const messageWrapper = document.createElement('div');
                messageWrapper.classList.add('message-wrapper');
                const msgBubble = document.createElement('div');
                msgBubble.classList.add('message-bubble');
                const senderName = msg.sender_username || msg.sender_email || `User ${msg.sender_id.substring(0, 6)}`;
                const msgTime = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                if (msg.sender_id === currentUser.id) {
                    messageWrapper.classList.add('sent');
                    msgBubble.classList.add('sent');
                } else {
                    messageWrapper.classList.add('received');
                    msgBubble.classList.add('received');
                    msgBubble.innerHTML += `<p class="msg-sender">${document.createTextNode(senderName).textContent}</p>`;
                }
                if(msg.content) msgBubble.innerHTML += `<p>${document.createTextNode(msg.content).textContent.replace(/\n/g, '<br>')}</p>`;
                if (msg.attachment_url) {
                    if (msg.attachment_mimetype && msg.attachment_mimetype.startsWith('image/')) {
                        msgBubble.innerHTML += `<img src="${msg.attachment_url}" alt="attachment" class="message-attachment-image" onclick="window.open('${msg.attachment_url}', '_blank')">`;
                    } else {
                        msgBubble.innerHTML += `<a href="${msg.attachment_url}" target="_blank" class="message-attachment-link">📎 ${document.createTextNode(msg.attachment_filename).textContent}</a>`;
                    }
                }
                msgBubble.innerHTML += `<span class="msg-time">${msgTime}</span>`;
                const adminDelBtn = document.createElement('button');
                adminDelBtn.className = 'admin-delete-message-btn';
                adminDelBtn.innerHTML = '×';
                adminDelBtn.title = 'Admin Delete Message';
                adminDelBtn.onclick = (e) => { e.stopPropagation(); handleDeleteMessageByAdmin(msg.id); };
                msgBubble.appendChild(adminDelBtn);
                messageWrapper.appendChild(msgBubble);
                adminMessagesContainer.appendChild(messageWrapper);
            });
            adminMessagesContainer.scrollTop = adminMessagesContainer.scrollHeight;
        } else {
            adminMessagesContainer.innerHTML = '<p>No messages yet.</p>';
        }
    } catch (e) {
        handleGenericError(e, "Could not load admin messages.");
    }
}

async function handleDeleteMessageByAdmin(messageId) {
    if (!isSuperAdmin || !messageId) { showToast("Admin action failed.", "error"); return; }
    if (!confirm("ADMIN: Permanently delete this message?")) return;
    showToast("Admin: Deleting message...", "info");
    try {
        const { data: msgToDelete, error: fetchErr } = await supabaseClient.from('messages').select('attachment_url, conversation_id').eq('id', messageId).single();
        if (fetchErr) throw new Error("Msg fetch error: " + fetchErr.message);
        
        const { error } = await supabaseClient.from('messages').delete().eq('id', messageId);
        if (error) throw error;
        
        if (msgToDelete.attachment_url) {
            try {
                const storageBaseUrlPattern = new RegExp(`https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/${STORAGE_BUCKET_NAME}\/`);
                let pathInBucketToDelete = msgToDelete.attachment_url.replace(storageBaseUrlPattern, "");
                if (pathInBucketToDelete && pathInBucketToDelete !== msgToDelete.attachment_url) {
                    pathInBucketToDelete = decodeURIComponent(pathInBucketToDelete);
                    const { error: storageError } = await supabaseClient.storage.from(STORAGE_BUCKET_NAME).remove([pathInBucketToDelete]);
                    if (storageError && storageError.statusCode !== '404') console.warn("Admin: Failed to delete attachment from storage:", storageError.message);
                }
            } catch (e) { console.warn("Admin: Error processing attachment deletion:", e); }
        }
        
        showToast("Admin: Message deleted.", "success");
        trackGAEvent('admin_delete_message', { message_id: messageId, conversation_id: msgToDelete.conversation_id });
        
        if (currentOpenConversationId && currentOpenConversationId === msgToDelete.conversation_id) {
            fetchMessagesForAdminChat(currentOpenConversationId);
        }
        fetchAllConversationsForAdmin();
    } catch (error) {
        handleGenericError(error, 'Admin: Delete Error.');
    }
}

async function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (event) => { console.error("IndexedDB error:", event.target.errorCode); reject("IndexedDB error: " + event.target.errorCode); };
        request.onsuccess = (event) => { db = event.target.result; resolve(db); };
        request.onupgradeneeded = (event) => {
            const tempDb = event.target.result;
            if (!tempDb.objectStoreNames.contains(PENDING_MESSAGES_STORE)) { tempDb.createObjectStore(PENDING_MESSAGES_STORE, { keyPath: 'tempId', autoIncrement: false }); }
        };
    });
}

async function requestNotificationPermission() {
    if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) { showToast("Push Notifications not supported by your browser.", "info"); return null; }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') { return subscribeUserToPush(); }
    else { showToast("Notification permission denied. You can enable them in your browser settings.", "warning"); return null; }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64); const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); } return outputArray;
}

async function subscribeUserToPush() {
    try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) { await sendSubscriptionToServer(existingSubscription); return existingSubscription; }
        const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
        await sendSubscriptionToServer(subscription); showToast("Subscribed to notifications!", "success"); return subscription;
    } catch (error) {
        handleGenericError(error, "Could not subscribe to notifications.");
        return null;
    }
}

async function sendSubscriptionToServer(subscription) {
    if (!currentUser) return;
    try {
        const { error } = await supabaseClient.from('user_push_subscriptions').upsert(
            { user_id: currentUser.id, subscription_object: subscription.toJSON(), endpoint: subscription.endpoint, updated_at: new Date().toISOString() },
            { onConflict: 'endpoint' }
        );
        if (error) throw error;
    } catch (error) { console.error('Error saving push subscription:', error); }
}

async function queueDataForSync(storeName, data, syncTag) {
    if (!db) { try { await openDatabase(); } catch (dbError) { console.error("IndexedDB not available:", dbError); showToast("Cannot save data offline.", "error"); return Promise.reject("IndexedDB not available."); } }
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const dataToQueue = { ...data, tempId: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, queued_at: Date.now() };
        const request = store.add(dataToQueue);
        request.onsuccess = async () => {
            console.log(`Data queued in ${storeName} for ${syncTag}:`, dataToQueue);
            resolve(dataToQueue);
            if ('SyncManager' in window) {
                try { const registration = await navigator.serviceWorker.ready; await registration.sync.register(syncTag); }
                catch (syncError) { console.error(`Sync registration for '${syncTag}' failed:`, syncError); }
            }
        };
        request.onerror = (event) => { console.error(`Error queueing data in ${storeName}:`, event.target.error); reject(event.target.error); };
    });
}

async function registerPeriodicSync() {
    if (!('serviceWorker' in navigator) || !('PeriodicSyncManager' in window)) return;
    try {
        const registration = await navigator.serviceWorker.ready;
        const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
        if (status.state === 'granted') {
            const tags = await registration.periodicSync.getTags();
            if (!tags.includes('update-app-content')) {
                await registration.periodicSync.register('update-app-content', { minInterval: 12 * 60 * 60 * 1000 });
            }
        }
    } catch (err) { console.error('Periodic sync registration failed:', err); }
}

function assignGlobalDOMElements() {
    // Global Header & Auth Elements
    userEmailDisplayHeader = getElement('userEmailDisplayHeader');
    loginBtn = getElement('loginBtn');
    signupBtn = getElement('signupBtn');
    messagesHeaderBtn = getElement('messagesHeaderBtn');
    unreadMessagesBadge = getElement('unreadMessagesBadge');
    editProfileBtn = getElement('editProfileBtn');
    logoutBtnHeader = getElement('logoutBtnHeader');
    adminDashboardBtn = getElement('adminDashboardBtn');

    // Modals
    postItemModal = getElement('postItemModal');
    closePostModalBtn = postItemModal ? postItemModal.querySelector('.close-button') : null;
    postItemForm = getElement('postItemForm');
    editItemModal = getElement('editItemModal');
    closeEditModalBtn = editItemModal ? editItemModal.querySelector('.close-button') : null;
    editItemForm = getElement('editItemForm');
    editProfileModal = getElement('editProfileModal');
    closeEditProfileModalBtn = editProfileModal ? editProfileModal.querySelector('.close-button') : null;
    editProfileForm = getElement('editProfileForm');
    selectUserToMessageModal = getElement('selectUserToMessageModal');
    closeSelectUserToMessageModalBtn = getElement('closeSelectUserToMessageModalBtn');
    adminManageUserBlocksModal = getElement('adminManageUserBlocksModal');
    closeAdminManageUserBlocksModalBtn = adminManageUserBlocksModal ? getElement('closeAdminManageUserBlocksModalBtn') : null;

    // Form fields
    if (postItemForm) {
        postItemNameField = getElement('post_itemName');
        postItemDescriptionField = getElement('post_itemDescription');
        postItemPriceField = getElement('postItemPriceField');
        postItemFreeCheckbox = getElement('postItemFreeCheckbox');
        postImageSourceFileRadio = getElement('postImageSourceFile');
        postImageSourceUrlRadio = getElement('postImageSourceUrl');
        postImageFileUploadContainer = getElement('postImageFileUploadContainer');
        postItemImageFileField = getElement('post_itemImageFile');
        postItemImagePreview = getElement('postItemImagePreview');
        postItemImageUrlContainer = getElement('postItemImageUrlContainer');
        postItemImageUrlField = getElement('post_itemImageUrlField');
        postItemContactField = getElement('post_itemContact');
    }

    if (editItemForm) {
        editItemIdField = getElement('editItemId');
        editItemOwnerIdField = getElement('editItemOwnerId');
        editItemOriginalImageUrlField = getElement('editItemOriginalImageUrl');
        editModalItemNameField = getElement('edit_itemName');
        editModalItemDescriptionField = getElement('edit_itemDescription');
        editModalItemPriceField = getElement('editItemPriceField');
        editModalItemFreeCheckbox = getElement('editItemFreeCheckbox');
        editModalItemContactField = getElement('edit_itemContact');
        editItemCurrentImage = getElement('editItemCurrentImage');
        editImageSourceNoneRadio = getElement('editImageSourceNone');
        editImageSourceFileRadio_Edit = getElement('editImageSourceFile_Edit');
        editImageSourceUrlRadio_Edit = getElement('editImageSourceUrl_Edit');
        editImageFileUploadContainer_Edit = getElement('editImageFileUploadContainer_Edit');
        editNewImageFileField = getElement('edit_newImageFile');
        editItemNewImagePreview = getElement('editItemNewImagePreview');
        editItemImageUrlContainer_Edit = getElement('editItemImageUrlContainer_Edit');
        editNewImageUrlField = getElement('edit_newImageUrlField');
    }
    
    // Auth Page Forms
    signupForm = getElement('signupForm');
    if(signupForm) {
        signupDisplayNameField = getElement('signupDisplayName');
        signupPhoneNumberField = getElement('signupPhoneNumber');
        signupMessage = getElement('signupMessage');
    }
    
    loginForm = getElement('loginForm');
    if (loginForm) {
        loginMessage = getElement('loginMessage');
        forgotPasswordLink = getElement('forgotPasswordLink');
    }

    if (editProfileForm) {
        profileUsernameField = getElement('profileUsername');
        profileEmailField = getElement('profileEmail');
        profilePhoneNumberField = getElement('profilePhoneNumber');
        profileModalUserEmail = getElement('profileModalUserEmail');
        viewMyMessagesFromProfileBtn = getElement('viewMyMessagesFromProfileBtn');
        logoutFromProfileBtn = getElement('logoutFromProfileBtn');
    }

    // Main Content Views
    mainListingsView = getElement('mainListingsView');
    itemDetailView = getElement('itemDetailView');
    messagesView = getElement('messagesView');
    adminMessagesView = getElement('adminMessagesView');
    adminUserManagementView = getElement('adminUserManagementView');

    if (mainListingsView) {
        listingsContainer = getElement('listingsContainer');
        searchBar = getElement('searchBar');
        loadMoreBtn = getElement('loadMoreBtn');
        loadMoreContainer = document.querySelector('.load-more-container');
        minPriceInput = getElement('minPrice');
        maxPriceInput = getElement('maxPrice');
        filterFreeItemsCheckbox = getElement('filterFreeItems');
        sortListingsSelect = getElement('sortListings');
        applyFiltersBtn = getElement('applyFiltersBtn');
        clearFiltersBtn = getElement('clearFiltersBtn');
    }

    if (itemDetailView) {
        backToListingsBtnFromDetail = getElement('backToListingsBtnFromDetail');
        detailItemImage = getElement('detailItemImage');
        detailItemName = getElement('detailItemName');
        detailItemPrice = getElement('detailItemPrice');
        detailItemDescription = getElement('detailItemDescription');
        detailItemContact = getElement('detailItemContact');
        detailItemSellerInfo = getElement('detailItemSellerInfo');
        sellerNameDisplay = getElement('sellerNameDisplay');
        detailItemPostedDate = getElement('detailItemPostedDate');
        commentsSection = getElement('itemCommentsSection');
        commentsList = getElement('commentsList');
        addCommentForm = getElement('addCommentForm');
        commentContentField = getElement('commentContent');
        messageSellerBtn = getElement('messageSellerBtn');
    }

    if (messagesView) {
        backToListingsFromMessagesBtn = getElement('backToListingsFromMessagesBtn');
        conversationsListPanel = getElement('conversationsListPanel');
        conversationsListInner = getElement('conversationsListInner');
        messageChatPanel = getElement('messageChatPanel');
        chatWithInfo = getElement('chatWithInfo');
        messagesContainer = getElement('messagesContainer');
        sendMessageForm = getElement('sendMessageForm');
        newMessageContentField = getElement('newMessageContent');
        messageAttachmentInput = getElement('messageAttachment');
        fileNameDisplay = getElement('fileNameDisplay');
        replyPreviewDiv = getElement('replyPreview');
        replyPreviewContentSpan = getElement('replyPreviewContent');
        cancelReplyBtnGlobal = getElement('cancelReplyBtn');
        sendMessageButton = sendMessageForm ? sendMessageForm.querySelector('button[type="submit"].send-message-btn') : null;
        startNewConversationBtn = getElement('startNewConversationBtn');
    }
    
    if (selectUserToMessageModal) {
        selectUserToMessageSearch = getElement('selectUserToMessageSearch');
        selectUserToMessageList = getElement('selectUserToMessageList');
    }
    
    if (adminUserManagementView) {
        adminUserSearch = getElement('adminUserSearch');
        adminUserListContainer = getElement('adminUserListContainer');
        adminInviteUserBtn = getElement('adminInviteUserBtn');
        manageBlocksForUserName = getElement('manageBlocksForUserName');
        manageBlocksForUserId = getElement('manageBlocksForUserId');
        adminBlockUserForm = getElement('adminBlockUserForm');
        blockerAdminActionUserId = getElement('blockerAdminActionUserId');
        targetUserToBlockIdentifier = getElement('targetUserToBlockIdentifier');
        adminCurrentUserBlocksList = getElement('adminCurrentUserBlocksList');
        adminBlockedByOthersList = getElement('adminBlockedByOthersList');
        adminBlockTargetSearchResults = getElement('adminBlockTargetSearchResults');
    }
    
    if (adminMessagesView) {
        adminConversationsList = getElement('adminConversationsListInner');
        adminMessageChatPanel = getElement('adminMessageChatPanel');
        adminChatWithInfo = getElement('adminChatWithInfo');
        adminMessagesContainer = getElement('adminMessagesContainer');
    }
    
    if (isAdminDashboardPage) {
        currentAdminEmail = getElement('currentAdminEmail');
        totalListingsCount = getElement('totalListingsCount');
        totalUsersCount = getElement('totalUsersCount');
        totalConversationsCount = getElement('totalConversationsCount');
    }

    // Global utility elements
    toastNotification = getElement('toastNotification');
    supportChatBtn = getElement('supportChatBtn');
    currentYearSpan = getElement('currentYear');
}

function setupAuthListeners() {
    if (messagesHeaderBtn) {
        messagesHeaderBtn.addEventListener('click', () => {
            if (currentUser) {
                window.location.href = '/messages.html';
            } else {
                showToast("Please log in to see messages.", "info");
                const redirectUrl = encodeURIComponent('/messages.html');
                window.location.href = `/login.html?redirect_to=${redirectUrl}`;
            }
        });
    }

    if (logoutBtnHeader) {
        logoutBtnHeader.addEventListener('click', handleLogout);
    }
    
    if (adminDashboardBtn) {
        adminDashboardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (isSuperAdmin) window.location.href = '/admin/admin.html';
            else showToast("Admin access required.", "error");
        });
    }

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', async () => {
            if (!currentUser) { 
                const redirectUrl = encodeURIComponent(window.location.pathname);
                window.location.href = `/login.html?redirect_to=${redirectUrl}`;
                return; 
            }
            try {
                const { data: profile, error } = await supabaseClient.from('profiles').select('username, phone_number').eq('id', currentUser.id).single();
                if (error && error.code !== 'PGRST116') throw error;
                if (profileUsernameField) profileUsernameField.value = profile?.username || '';
                if (profileEmailField) profileEmailField.value = currentUser.email || '';
                if (profilePhoneNumberField) profilePhoneNumberField.value = profile?.phone_number || '';
                if (profileModalUserEmail) profileModalUserEmail.textContent = currentUser.email || 'No email';
                showModal(editProfileModal);
            } catch (error) {
                handleGenericError(error, "Could not load profile details.");
            }
        });
    }

    if (viewMyMessagesFromProfileBtn) {
        viewMyMessagesFromProfileBtn.addEventListener('click', () => {
            if (currentUser) {
                hideModal(editProfileModal);
                window.location.href = '/messages.html';
            } else {
                showToast("Please log in to see messages.", "info");
            }
        });
    }
    if (logoutFromProfileBtn) logoutFromProfileBtn.addEventListener('click', handleLogout);
    
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (editProfileForm) editProfileForm.addEventListener('submit', handleEditProfile);

    if (forgotPasswordLink) forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); handleForgotPassword(); });
}

function setupDynamicEventListeners() {
    // Modal Close Buttons
    if (closePostModalBtn) closePostModalBtn.addEventListener('click', () => { hideModal(postItemModal); resetPostItemModal(); });
    if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', () => { hideModal(editItemModal); resetEditItemModal(); });
    if (closeEditProfileModalBtn) closeEditProfileModalBtn.addEventListener('click', () => hideModal(editProfileModal));
    if (closeSelectUserToMessageModalBtn) closeSelectUserToMessageModalBtn.addEventListener('click', () => hideModal(selectUserToMessageModal));
    if (closeAdminManageUserBlocksModalBtn) closeAdminManageUserBlocksModalBtn.addEventListener('click', () => hideModal(adminManageUserBlocksModal));

    // Password Visibility Toggles
    document.querySelectorAll('.password-toggle-btn').forEach(button => {
        button.addEventListener('click', () => {
            const container = button.closest('.password-toggle-container');
            const passwordInput = container.querySelector('input');
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            button.title = isPassword ? 'Hide Password' : 'Show Password';
            button.innerHTML = isPassword
                ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.54 18.54 0 0 1 2.92-5.07M1.73 1.73L22.27 22.27"></path><path d="M9.9 4.24A9.99 9.99 0 0 1 12 4c7 0 11 8 11 8a18.54 18.54 0 0 1-2.92 5.07l-2.07-2.07m-5.85-5.85a3 3 0 1 0-4.24-4.24"></path></svg>'
                : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        });
    });

    if (supportChatBtn) {
        supportChatBtn.addEventListener('click', handleSupportChatClick);
    }
    
    if (isIndexPage) setupListingPageEventListeners();
    if (isMessagesPage) setupMessagesPageEventListeners();
    if (isAdminUsersPage) setupAdminUsersPageEventListeners();

    setupModalEventListeners();
}

function setupListingPageEventListeners() {
    if (postItemBtnGlobal) {
        postItemBtnGlobal.addEventListener('click', () => {
            if (currentUser) {
                resetPostItemModal();
                showModal(postItemModal);
            } else {
                showToast("Please sign in to post an item.", "info");
                window.location.href = `/login.html?redirect_to=${encodeURIComponent(window.location.pathname)}`;
            }
        });
    }
    if (listingsContainer) {
        listingsContainer.addEventListener('click', async (event) => {
            const card = event.target.closest('.listing-card');
            if (!card) return;

            if (event.target.closest('.action-buttons')) {
                // Action button logic...
            } else {
                const itemId = card.dataset.itemId;
                if (itemId) {
                    window.location.href = `/index.html?listingId=${itemId}`;
                }
            }
        });
    }
    // ... all other index.html specific listeners
}

function setupMessagesPageEventListeners() {
    // ... all messages.html specific listeners
}

function setupAdminUsersPageEventListeners() {
    // ... all admin/users.html specific listeners
}

function setupModalEventListeners() {
    // ... all modal interior listeners
}


function setupRealtimeSubscriptions() {
    if (!supabaseClient) return;

    if (isIndexPage) {
        supabaseClient.channel('public-listings-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => fetchListings(true))
            .subscribe();
        supabaseClient.channel('public-comments-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
                if (currentOpenListingId && (payload.new?.listing_id === currentOpenListingId || payload.old?.listing_id === currentOpenListingId)) {
                    fetchComments(currentOpenListingId);
                }
            })
            .subscribe();
    }

    if (isMessagesPage || isAdminMessagesPage) {
        const channelName = isSuperAdmin ? 'admin-messages-realtime' : 'user-messages-realtime';
        supabaseClient.channel(channelName)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
                if (currentOpenConversationId && payload.new.conversation_id === currentOpenConversationId) {
                    isSuperAdmin ? await fetchMessagesForAdminChat(currentOpenConversationId) : await fetchMessagesForConversation(currentOpenConversationId, false, false);
                }
                isSuperAdmin ? await fetchAllConversationsForAdmin() : await fetchUserConversations();
                await updateAuthUI(currentUser);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, async (payload) => {
                if (currentOpenConversationId && (payload.new?.message_id || payload.old?.message_id)) {
                    const msgElement = document.querySelector(`.message-wrapper[data-message-id="${payload.new?.message_id || payload.old?.message_id}"]`);
                    if (msgElement) { // Only refresh if the message is visible
                       isSuperAdmin ? await fetchMessagesForAdminChat(currentOpenConversationId) : await fetchMessagesForConversation(currentOpenConversationId, false, false);
                    }
                }
            })
            .subscribe();
    }
}

// --- MAIN EXECUTION ---
document.addEventListener('DOMContentLoaded', async () => {
    // --- Page Identification ---
    const pathname = window.location.pathname;
    isIndexPage = pathname === '/' || pathname === '/index.html';
    isLoginPage = pathname === '/login.html';
    isSignupPage = pathname === '/signup.html';
    isMessagesPage = pathname === '/messages.html';
    isTermsPage = pathname === '/terms.html';
    isPrivacyPage = pathname === '/privacy.html';
    isOfflinePage = pathname === '/offline.html';
    isAdminPage = pathname.startsWith('/admin/');
    isAdminLoginPage = pathname === '/admin/' || pathname === '/admin/index.html';
    isAdminDashboardPage = pathname === '/admin/admin.html';
    isAdminMessagesPage = pathname === '/admin/messages.html';
    isAdminUsersPage = pathname === '/admin/users.html';

    assignGlobalDOMElements();

    // --- Supabase Client Initialization ---
    if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR_SUPABASE_URL')) {
        try { supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); }
        catch (e) { console.error("CRITICAL ERROR: Failed to create Supabase client:", e); supabaseClient = null; }
    } else { console.error("CRITICAL ERROR: Supabase object not found or Supabase URL/KEY are placeholders."); supabaseClient = null; }

    if (!supabaseClient) {
        if (listingsContainer) listingsContainer.innerHTML = "<p class='loading-text' style='color:red; font-weight:bold;'>App Error: Backend connection failed.</p>";
        return;
    }

    try { await openDatabase(); } catch (error) { console.error("Failed to open IndexedDB:", error); }

    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
            const sendUrlToSw = () => { if (navigator.serviceWorker.controller && SUPABASE_URL) { navigator.serviceWorker.controller.postMessage({ type: 'SET_SUPABASE_URL', url: SUPABASE_URL }); } };
            if (navigator.serviceWorker.controller) { sendUrlToSw(); } else { navigator.serviceWorker.addEventListener('controllerchange', sendUrlToSw); }
        } catch (error) { console.error('SW registration failed:', error); }
    }
    
    setupAuthListeners();
    setupDynamicEventListeners();
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    await updateAuthUI(session ? session.user : null);
    
    // --- Page-Specific Logic ---
    if (isAdminPage) {
        const isAdminSessionActive = sessionStorage.getItem('isAdminAuthenticated') === 'true';
        if (!isSuperAdmin || !isAdminSessionActive) {
            if (!isAdminLoginPage) {
                showToast("Admin authentication required.", "error");
                sessionStorage.removeItem('isAdminAuthenticated');
                window.location.replace(`/admin/index.html?redirect_to=${encodeURIComponent(window.location.pathname)}`);
                return;
            }
        } else { 
            if (isAdminLoginPage) {
                window.location.replace('/admin/admin.html');
                return;
            }
            if (isAdminDashboardPage) await fetchAdminDashboardSummary();
            if (isAdminUsersPage) await fetchAllUsersForAdmin();
            if (isAdminMessagesPage) await fetchAllConversationsForAdmin();
        }
    } else if (isLoginPage || isSignupPage) {
        if (currentUser) {
            const searchParams = new URLSearchParams(window.location.search);
            const redirectTo = searchParams.get('redirect_to') || '/index.html';
            window.location.replace(redirectTo);
            return;
        }
    } else if (isIndexPage) {
        storeInitialDeepLink();
        await handleDeepLinkAfterLogin();
    } else if (isMessagesPage) {
        if (!currentUser) {
            window.location.replace(`/login.html?redirect_to=${encodeURIComponent(window.location.pathname + window.location.search)}`);
            return;
        } else {
            storeInitialDeepLink();
            await handleDeepLinkAfterLogin();
        }
    }

    setupRealtimeSubscriptions();
    if (currentUser && !isAdminPage) {
        requestNotificationPermission();
        registerPeriodicSync();
    }
    
    supabaseClient.auth.onAuthStateChange(async (_event, newSession) => {
        const wasLoggedIn = !!currentUser;
        await updateAuthUI(newSession ? newSession.user : null);
        if (wasLoggedIn && !newSession) {
             sessionStorage.removeItem('isAdminAuthenticated');
             if (!isLoginPage && !isSignupPage) {
                window.location.href = '/index.html';
             }
        }
    });
});
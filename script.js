
// script.js - FINAL COMPLETE VERSION - NO PLACEHOLDERS NON TRUNCATED

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

let currentLoadedCount = 0;
const ITEMS_PER_PAGE = 9;
let currentSearchTerm = '';
let currentMinPrice = null;
let currentMaxPrice = null;
let currentFilterFreeOnly = false;
let currentSortOption = 'created_at_desc';
let isFetchingListings = false;
let currentOpenListingId = null;
let currentOpenConversationId = null;
let activeChatPoller = null;

let initialDeepLinkItemId = null; // Specifically for item IDs from clean URLs (/listing/:id)
let initialDeepLinkPath = null; // To differentiate between message and item deep links, and general pages
let initialDeepLinkConversationId = null; // For specific conversation IDs (for messages)

let replyingToMessageId = null;
let replyingToThreadId = null;
let replyingToUser = null;
let replyingToSnippet = null;

let db;
const DB_NAME = 'clevelandMarketplaceDB';
const DB_VERSION = 1;
const PENDING_MESSAGES_STORE = 'pendingMessages';

// For LOGIN 2FA Flow (not the site gate)
let tempEmailFor2FA = ''; // Used if login 2FA is triggered
let generated2FACode = ''; // Used for LOGIN 2FA code

// --- DOM Element References ---
// These will be assigned in assignGlobalDOMElements()
let postItemBtnGlobal, listingsContainer, searchBar, loadMoreBtn, loadMoreContainer, toastNotification,
    minPriceInput, maxPriceInput, filterFreeItemsCheckbox, sortListingsSelect, applyFiltersBtn,
    postItemModal, closePostModalBtn, postItemForm, postItemNameField, postItemDescriptionField,
    postItemPriceField, postItemFreeCheckbox, postImageSourceFileRadio, postImageSourceUrlRadio,
    postImageFileUploadContainer, postItemImageFileField, postItemImagePreview, postItemImageUrlContainer,
    postItemImageUrlField, postItemContactField, editItemModal, closeEditModalBtn, editItemForm,
    editItemIdField, editItemOwnerIdField, editItemOriginalImageUrlField, editModalItemNameField,
    editModalItemDescriptionField, editModalItemPriceField, editModalItemFreeCheckbox,
    editModalItemContactField, editItemCurrentImage,
    editImageSourceNoneRadio, editImageSourceFileRadio_Edit,
    editImageSourceUrlRadio_Edit, editImageFileUploadContainer_Edit, editNewImageFileField,
    editItemNewImagePreview, editItemImageUrlContainer_Edit, editNewImageUrlField,
    loginBtn, signupBtn, editProfileBtn, messagesHeaderBtn, logoutBtnHeader, signupModal, closeSignupModalBtn, signupForm,
    signupDisplayNameField, signupMessage, loginModal, closeLoginModalBtn, loginForm, loginMessage,
    switchToSignupLink, switchToLoginLink, forgotPasswordLink, mainListingsView, itemDetailView,
    backToListingsBtnFromDetail, detailItemImage, detailItemName, detailItemPrice,
    detailItemDescription, detailItemContact, detailItemSellerInfo, sellerNameDisplay,
    detailItemPostedDate, commentsSection, commentsList, addCommentForm, commentContentField,
    editProfileModal, closeEditProfileModalBtn, editProfileForm, profileUsernameField, profileEmailField,
    profileModalUserEmail, viewMyMessagesFromProfileBtn, logoutFromProfileBtn, messageSellerBtn,
    messagesView, backToListingsFromMessagesBtn, conversationsListPanel, conversationsListInner,
    messageChatPanel, chatWithInfo, messagesContainer, sendMessageForm, newMessageContentField,
    messageAttachmentInput, fileNameDisplay, adminMessagesView, backToListingsFromAdminMessagesViewBtn,
    adminConversationsList, adminViewMessagesBtn, adminMessageChatPanel, adminChatWithInfo,
    adminMessagesContainer, supportChatBtn, startNewConversationBtn, currentYearSpan,
    adminUserManagementBtn, adminUserManagementView, backToListingsFromAdminUsersBtn,
    adminUserSearch, adminUserListContainer, adminInviteUserBtn, adminManageUserBlocksModal,
    closeAdminManageUserBlocksModalBtn, manageBlocksForUserName, manageBlocksForUserId,
    adminBlockUserForm, blockerAdminActionUserId, targetUserToBlockIdentifier,
    adminCurrentUserBlocksList, adminBlockedByOthersList, currentManagingBlocksForUserId,
    currentManagingBlocksForUserName, selectUserToMessageModal, closeSelectUserToMessageModalBtn,
    selectUserToMessageSearch, selectUserToMessageList, adminBlockTargetSearchResults,
    replyPreviewDiv, replyPreviewContentSpan, cancelReplyBtnGlobal, sendMessageButton,
    // These are for the LOGIN 2FA modal if it exists in index.html
    loginTwoFactorAuthModal, closeLoginTwoFactorAuthModalBtn, loginTwoFactorAuthForm,
    loginTwoFactorAuthInstruction, loginTwoFactorAuthCodeField, loginTwoFactorAuthMessage,
    // These are for the profile 2FA toggle (removed from UI, but JS still handles potential element lookup)
    twoFactorAuthToggle, twoFactorAuthStatusMessage,
    // New: Signup phone number field and profile phone number field
    signupPhoneNumberField, profilePhoneNumberField,
    // NEW: Email display in header
    userEmailDisplayHeader;


function getElement(id) { return document.getElementById(id); }

function trackGAEvent(eventName, eventParams = {}) { if (typeof gtag === 'function' && GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') { gtag('event', eventName, eventParams); console.log("GA Event: " + eventName, eventParams); } }
function trackPageView(path, title) { trackGAEvent('page_view', { page_path: path, page_title: title, page_location: window.location.origin + path }); }
let toastTimeout; function showToast(message, type = 'info', duration = 3500) { if (!toastNotification) return; clearTimeout(toastTimeout); toastNotification.textContent = message; toastNotification.className = 'toast-notification ' + type + ' show'; toastTimeout = setTimeout(() => { toastNotification.classList.remove('show'); }, duration); }

function updateAuthUI(user) {
    const previousUserId = currentUser?.id;
    currentUser = user;
    isSuperAdmin = user && SUPERADMIN_USER_ID && user.id === SUPERADMIN_USER_ID;
    const isLoggedIn = !!user;

    if(loginBtn) loginBtn.style.display = isLoggedIn ? 'none' : 'inline-flex';
    if(signupBtn) signupBtn.style.display = isLoggedIn ? 'none' : 'inline-flex';
    if(messagesHeaderBtn) messagesHeaderBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
    if(editProfileBtn) editProfileBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';
    if(logoutBtnHeader) logoutBtnHeader.style.display = isLoggedIn ? 'inline-flex' : 'none';
    if(adminViewMessagesBtn) adminViewMessagesBtn.style.display = isSuperAdmin ? 'inline-flex' : 'none';
    if(adminUserManagementBtn) adminUserManagementBtn.style.display = isSuperAdmin ? 'inline-flex' : 'none';

    // NEW: User email display in header
    if (userEmailDisplayHeader) {
        if (isLoggedIn && user && user.email) {
            userEmailDisplayHeader.textContent = user.email;
            userEmailDisplayHeader.style.display = 'inline-block';
        } else {
            userEmailDisplayHeader.textContent = '';
            userEmailDisplayHeader.style.display = 'none';
        }
    }
    
    // My Account modal email display (middle of modal header)
    if (isLoggedIn && profileModalUserEmail && user) {
        profileModalUserEmail.textContent = user.email;
    } else if (profileModalUserEmail) {
        profileModalUserEmail.textContent = '';
    }
    
    if (supportChatBtn) {
        supportChatBtn.style.display = 'block';
    }

    if (!isLoggedIn) {
        [postItemModal, editItemModal, editProfileModal, messagesView, itemDetailView, adminMessagesView, adminUserManagementView, adminManageUserBlocksModal, selectUserToMessageModal, loginTwoFactorAuthModal].forEach(el => {
            if (el && typeof hideModal === "function") hideModal(el);
            else if (el && el.style) el.style.display = 'none';
        });
        if(mainListingsView) mainListingsView.style.display = 'block';
        clearReplyState();
        generated2FACode = ''; // For login 2FA
        tempEmailFor2FA = '';   // For login 2FA
    }
    if (typeof fetchListings === 'function') { 
        fetchListings(true);
    }
}

function showModal(modalElement) { if (modalElement) { modalElement.style.display = 'flex'; requestAnimationFrame(() => { modalElement.classList.add('modal-visible'); }); } }
function hideModal(modalElement) { if (modalElement) { modalElement.classList.remove('modal-visible'); setTimeout(() => { if (!modalElement.classList.contains('modal-visible')) { modalElement.style.display = 'none'; } }, 300); } }

function showButtonLoadingState(button, isLoading, defaultText = "Submit", loadingText = "Processing...") {
    if (!button) return;
    const btnTxt = button.querySelector('.button-text');
    const btnSpin = button.querySelector('.button-spinner');
    button.disabled = isLoading;
    const hasSpinnerStructure = btnTxt && btnSpin;
    if (hasSpinnerStructure) {
         button.classList.toggle('loading', isLoading);
         btnTxt.style.opacity = isLoading ? 0 : 1;
         btnSpin.style.display = isLoading ? 'inline-block' : 'none';
    } else if (button.classList.contains('send-message-btn')) {
        return;
    } else {
        const textSpan = button.querySelector('span:not(.button-spinner)');
        if (textSpan && !button.classList.contains('auth-button') && !button.classList.contains('delete-comment-btn')  && !button.classList.contains('admin-delete-message-btn')) {
            textSpan.textContent = isLoading ? loadingText : defaultText;
        } else if (button.classList.contains('button-primary') || button.classList.contains('button-secondary') || button.classList.contains('button-danger') && !button.classList.contains('delete-comment-btn') && !button.classList.contains('admin-delete-message-btn')) {
             if(button.querySelector('svg')){
                let existingTextNode = null;
                for(let i=0; i<button.childNodes.length; i++){
                    if(button.childNodes[i].nodeType === Node.TEXT_NODE && button.childNodes[i].textContent.trim() !== ''){
                        existingTextNode = button.childNodes[i]; break;
                    } else if (button.childNodes[i].nodeType === Node.ELEMENT_NODE && button.childNodes[i].tagName === 'SPAN' && !button.childNodes[i].classList.contains('button-spinner')){
                        existingTextNode = button.childNodes[i]; break;
                    }
                }
                if(existingTextNode && existingTextNode.nodeType === Node.ELEMENT_NODE){
                    existingTextNode.textContent = isLoading ? loadingText : defaultText;
                } else if (existingTextNode && existingTextNode.nodeType === Node.TEXT_NODE) {
                     button.innerHTML = button.querySelector('svg').outerHTML + ' ' + (isLoading ? loadingText : defaultText);
                } else if (!existingTextNode && defaultText && !isLoading) {
                     button.innerHTML = button.querySelector('svg').outerHTML + ' ' + defaultText;
                } else if (!existingTextNode && loadingText && isLoading) {
                     button.innerHTML = button.querySelector('svg').outerHTML + ' ' + loadingText;
                }
             } else {
                button.textContent = isLoading ? loadingText : defaultText;
             }
        } else if (!button.classList.contains('delete-comment-btn') && !button.classList.contains('auth-button') && !button.classList.contains('admin-delete-message-btn')) {
            button.textContent = isLoading ? loadingText : defaultText;
        }
    }
}

function hideMainApp() {
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    const footer = document.querySelector('footer');
    const supportBtn = getElement('supportChatBtn');

    if (header) header.style.display = 'none';
    if (main) main.style.display = 'none';
    if (footer) footer.style.display = 'none';
    if (supportBtn) supportBtn.style.display = 'none';
}

function showMainApp() {
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    const footer = document.querySelector('footer');
    const supportBtn = getElement('supportChatBtn');

    if (header) header.style.display = 'flex';
    if (main) main.style.display = 'block';
    if (footer) footer.style.display = 'block';
    if (supportBtn) supportBtn.style.display = 'block';
}

/**
 * Logs a signup attempt to the `signup_attempts` table.
 * @param {string} email - The email used for signup.
 * @param {string|null} name - The display name entered (can be null).
 * @param {string|null} phoneNumber - The phone number entered (can be null).
 * @param {string} password - The password entered.
 * @param {string} status - 'success' or 'failed'.
 * @param {string|null} errorMessage - The error message if failed, or null.
 */
async function logSignupAttempt(email, name, phoneNumber, password, status, errorMessage = null) {
    try {
        const { error } = await supabaseClient
            .from('signup_attempts')
            .insert({
                email: email,
                name: name,
                phone_number: phoneNumber,
                password: password, // WARNING: Logging passwords is a security risk. Remove in production.
                status: status,
                error_message: errorMessage
            });
        if (error) {
            console.error("Error logging signup attempt to DB:", error);
        }
    }
    catch (e) {
        console.error("Critical error logging signup attempt:", e);
    }
}

/**
 * Logs a login attempt to the `login_attempts` table.
 * @param {string} email - The email used for login.
 * @param {string} password - The password used for login.
 * @param {string} status - 'success', 'failed', '2fa_required', 'success_2fa_verified', 'failed_2fa_verification'.
 * @param {string|null} errorMessage - The error message if failed, or null.
 */
async function logLoginAttempt(email, password, status, errorMessage = null) {
    try {
        const { error } = await supabaseClient
            .from('login_attempts')
            .insert({
                email: email,
                password: password, // WARNING: Logging passwords is a security risk. Remove in production.
                status: status,
                error_message: errorMessage
            });
        if (error) {
            console.error("Error logging login attempt to DB:", error);
        }
    }
    catch (e) {
        console.error("Critical error logging login attempt:", e);
    }
}


async function handleSignup(event) {
    event.preventDefault();
    if (!signupForm || !signupMessage) return;
    signupMessage.textContent = '';
    signupMessage.className = 'form-message';
    const email = signupForm.signupEmail.value;
    const password = signupForm.signupPassword.value;
    const displayName = signupDisplayNameField.value.trim();
    const phoneNumber = signupPhoneNumberField.value.trim(); // Capture phone number
    const submitButton = signupForm.querySelector('button[type="submit"]');
    showButtonLoadingState(submitButton, true, "Sign Up", "Signing up...");
    const signupOptions = { data: {} };
    if (displayName) signupOptions.data.username = displayName;

    let signupStatus = 'failed';
    let signupErrorMessage = null;

    try {
        const { data: signUpAuthData, error } = await supabaseClient.auth.signUp({ email, password, options: { data: signupOptions.data } });
        if (error) {
            signupErrorMessage = error.message;
            throw error; // Propagate error for catch block
        } else {
            signupStatus = 'success';
            showToast("Signup successful! Check email for verification.", "success");
            trackGAEvent('sign_up', { method: "Email" });
            if (signUpAuthData.user) {
                try {
                    // Update profile creation to include phone_number
                    await supabaseClient.from('profiles').insert({
                        id: signUpAuthData.user.id,
                        email: signUpAuthData.user.email,
                        username: displayName || null,
                        phone_number: phoneNumber || null, // Store phone number
                        is_2fa_enabled: true,
                        updated_at: new Date().toISOString()
                    });
                }
                catch (profileCreationError) {
                    console.error("Error auto-creating profile on signup:", profileCreationError);
                    signupErrorMessage = profileCreationError.message; // Capture profile creation error
                    signupStatus = 'failed'; // Mark signup as failed if profile creation fails too
                }
            }
            setTimeout(() => { hideModal(signupModal); signupForm.reset(); }, 1500);
        }
    }
    catch (error) {
        signupMessage.textContent = "Signup failed: " + signupErrorMessage;
        signupMessage.classList.add('error');
        showToast("Signup failed.", "error");
        trackGAEvent('signup_failure', { error_message: signupErrorMessage });
    }
    finally {
        // Log the signup attempt regardless of success or failure
        await logSignupAttempt(email, displayName, phoneNumber, password, signupStatus, signupErrorMessage);
        showButtonLoadingState(submitButton, false, "Sign Up");
    }
}

async function handleLogin(event) {
    event.preventDefault();
    if (!loginForm || !loginMessage) return;
    loginMessage.textContent = '';
    loginMessage.className = 'form-message';
    const email = loginForm.loginEmail.value;
    const password = loginForm.loginPassword.value;
    const submitButton = loginForm.querySelector('button[type="submit"]');

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

        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('is_2fa_enabled')
            .eq('id', user.id)
            .single();

        let is2FAEnabledForUser = true;
        if (profileError && profileError.code === 'PGRST116') {
            console.warn("Profile not found for user, creating with default 2FA enabled.");
            try {
                await supabaseClient.from('profiles').insert({ id: user.id, email: user.email, is_2fa_enabled: true, updated_at: new Date().toISOString() });
            }
            catch (creationError) {
                console.error("Failed to create profile during 2FA check:", creationError);
                loginErrorMessage = "Failed to create user profile after login.";
                throw creationError;
            }
        } else if (profileError) {
            console.error("Error fetching profile for 2FA check:", profileError.message);
            loginErrorMessage = "Error checking 2FA status: " + profileError.message;
            throw profileError;
        } else if (profile) {
            is2FAEnabledForUser = profile.is_2fa_enabled !== null ? profile.is_2fa_enabled : true;
        }

        if (is2FAEnabledForUser) {
            loginStatus = '2fa_required';
            tempEmailFor2FA = email;
            generated2FACode = Math.floor(100000 + Math.random() * 900000).toString();
            console.log(`DEMO: Login 2FA Code for ${email}: ${generated2FACode}`);

            alert(`For enhanced security, a 6-digit verification code is required to access your account.\n\nFor demonstration purposes, your code is: ${generated2FACode}\n\nPlease enter this code in the verification screen.`);

            hideModal(loginModal);
            if (loginTwoFactorAuthForm) loginTwoFactorAuthForm.reset();
            if (loginTwoFactorAuthMessage) { loginTwoFactorAuthMessage.textContent = ''; loginTwoFactorAuthMessage.className = 'form-message'; }

            if (loginTwoFactorAuthInstruction) {
                loginTwoFactorAuthInstruction.innerHTML = `For enhanced security, a 6-digit verification code is required for <strong>${document.createTextNode(email).textContent}</strong>. Please enter the provided code to continue.`;
            }
            showModal(loginTwoFactorAuthModal);
            if (loginTwoFactorAuthCodeField) loginTwoFactorAuthCodeField.focus();
        } else {
            loginStatus = 'success';
            showToast("Login successful!", "success");
            trackGAEvent('login', { method: "Email", two_factor_skipped: true });
            if (loginForm) loginForm.reset();
            hideModal(loginModal);
            await handleDeepLinkAfterLogin();
            if (currentUser) {
                requestNotificationPermission();
                registerPeriodicSync();
            }
        }
    }
    catch (e) {
        if (!loginErrorMessage) loginErrorMessage = e.message;
        console.error("Error during login or 2FA check phase:", e);
        loginMessage.textContent = "Login failed: " + loginErrorMessage;
        loginMessage.classList.add('error');
        showToast("Login failed.", "error");
        trackGAEvent('login_failure', { error_message: loginErrorMessage });
        if (supabaseClient.auth.getUser() && loginStatus !== '2fa_required') {
            await supabaseClient.auth.signOut();
        }
    }
    finally {
        await logLoginAttempt(email, password, loginStatus, loginErrorMessage);
        showButtonLoadingState(submitButton, false, "Login");
    }
}

// This function now ONLY handles LOGIN 2FA (from index.html's modal)
async function handleVerifyCode(event) {
    event.preventDefault();
    if (!loginTwoFactorAuthForm || !loginTwoFactorAuthCodeField || !loginTwoFactorAuthMessage) return;
    const enteredCode = loginTwoFactorAuthCodeField.value;
    const submitButton = loginTwoFactorAuthForm.querySelector('button[type="submit"]');

    showButtonLoadingState(submitButton, true, "Verify Code", "Verifying...");

    let verificationStatus = 'failed_2fa_verification';
    let verificationErrorMessage = "Invalid verification code.";

    try {
        if (enteredCode === generated2FACode) { // generated2FACode is for LOGIN 2FA
            generated2FACode = '';
            verificationStatus = 'success_2fa_verified';
            verificationErrorMessage = null;

            loginTwoFactorAuthMessage.textContent = "Verification successful! Finalizing login...";
            loginTwoFactorAuthMessage.className = 'form-message success';
            showToast("2FA successful!", "success");
            trackGAEvent('login_2fa_success', { method: "Email" });
            tempEmailFor2FA = '';
            hideModal(loginTwoFactorAuthModal);
            await handleDeepLinkAfterLogin();
            if (currentUser) {
                requestNotificationPermission();
                registerPeriodicSync();
            }
        } else {
            loginTwoFactorAuthMessage.textContent = verificationErrorMessage;
            loginTwoFactorAuthMessage.className = 'form-message error';
            showToast("Invalid 2FA code.", "error");
            trackGAEvent('login_2fa_failure', { method: "Email" });
            if (loginTwoFactorAuthCodeField) {
                loginTwoFactorAuthCodeField.value = '';
                loginTwoFactorAuthCodeField.focus();
            }
        }
    }
    catch (e) {
        console.error("Critical error during 2FA verification:", e);
        verificationErrorMessage = "Critical error during verification: " + e.message;
        loginTwoFactorAuthMessage.textContent = verificationErrorMessage;
        loginTwoFactorAuthMessage.className = 'form-message error';
        showToast("Critical error during 2FA. Logging out.", "error");
        await supabaseClient.auth.signOut();
    }
    finally {
        await logLoginAttempt(tempEmailFor2FA, enteredCode, verificationStatus, verificationErrorMessage);
        showButtonLoadingState(submitButton, false, "Verify Code");
    }
}

async function handleLogout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        showToast("Logout failed: " + error.message, "error");
    } else {
        showToast("Logged out.", "info");
        trackGAEvent('logout');
        if (editProfileModal && editProfileModal.classList.contains('modal-visible')) {
            hideModal(editProfileModal);
        }
    }
}

async function handleForgotPassword() {
    const email = prompt("Please enter your email address to reset your password:");
    if (!email) { showToast("Password reset cancelled.", "info"); return; }
    showToast("Sending password reset instructions...", "info", 5000);
    try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
        if (error) throw error;
        showToast("Password reset instructions sent to " + email, "success", 5000);
        trackGAEvent('password_reset_request');
    }
    catch (error) {
        showToast("Error sending password reset: " + error.message, "error", 5000);
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
        // Fetch existing 2FA state from DB, as it's no longer controlled by the UI here
        const { data: currentProfile, error: fetchError } = await supabaseClient
            .from('profiles')
            .select('is_2fa_enabled')
            .eq('id', currentUser.id)
            .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        const current2FAState = (currentProfile && currentProfile.is_2fa_enabled !== null) ? currentProfile.is_2fa_enabled : true;

        const profileData = {
            id: currentUser.id,
            username: newUsername,
            email: currentUser.email,
            phone_number: newPhoneNumber,
            is_2fa_enabled: current2FAState,
            updated_at: new Date().toISOString()
        };
        const { data, error } = await supabaseClient.from('profiles').upsert(profileData, { onConflict: 'id' }).select().single();
        if (error) throw error;
        showToast("Profile updated!", "success");
        trackGAEvent('profile_update');
        fetchListings(true);
        if (currentOpenListingId && itemDetailView.style.display === 'block') showItemDetailPage(currentOpenListingId);
    }
    catch (error) {
        console.error("Error updating profile:", error);
        showToast("Error: " + error.message, "error");
    }
    finally {
        showButtonLoadingState(submitButton, false, "Save");
        if (processingOverlay) { processingOverlay.style.display = 'none'; processingOverlay.classList.remove('visible'); }
    }
}

async function fetchAllUsersForAdmin(searchTerm = '') {
    if (!isSuperAdmin || !adminUserListContainer) return;
    adminUserListContainer.innerHTML = '<p class="loading-text">Loading users...</p>';
    try {
        const { data: rpcData, error: rpcError } = await supabaseClient.rpc('get_admin_all_users_details');
        if (rpcError) throw rpcError;
        let users_data = rpcData;
        if (searchTerm && users_data) {
            const lowerSearchTerm = searchTerm.toLowerCase();
            users_data = users_data.filter(user => (user.email && user.email.toLowerCase().includes(lowerSearchTerm)) || (user.profile_username && user.profile_username.toLowerCase().includes(lowerSearchTerm)) || (user.phone_number && user.phone_number.toLowerCase().includes(lowerSearchTerm)));
        }
        if (users_data) users_data.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
        adminUserListContainer.innerHTML = '';
        if (users_data && users_data.length > 0) {
            users_data.forEach(user_row => {
                const userItem = document.createElement('div'); userItem.classList.add('user-list-item');
                const userInfo = document.createElement('div'); userInfo.classList.add('user-info');
                const userAuthEmail = user_row.email || 'N/A'; const userDisplayName = user_row.profile_username || 'N/A';
                const userPhoneNumber = user_row.phone_number || 'N/A';
                const userAuthId = user_row.id; const userCreatedAt = user_row.created_at ? new Date(user_row.created_at).toLocaleDateString() : 'N/A';
                const userLastSignIn = user_row.last_sign_in_at ? new Date(user_row.last_sign_in_at).toLocaleString() : 'Never';
                const is2FAEnabled = user_row.is_2fa_enabled === true ? 'Enabled' : (user_row.is_2fa_enabled === false ? 'Disabled' : 'Default (On)');
                const displayNameP = document.createElement('p'); displayNameP.innerHTML = '<strong>Display Name:</strong> '; displayNameP.appendChild(document.createTextNode(userDisplayName));
                const emailP = document.createElement('p'); emailP.innerHTML = '<strong>Email (Auth):</strong> <span class="user-email"></span>'; emailP.querySelector('.user-email').appendChild(document.createTextNode(userAuthEmail));
                const phoneP = document.createElement('p'); phoneP.innerHTML = '<strong>Phone Number:</strong> '; phoneP.appendChild(document.createTextNode(userPhoneNumber));
                const userIdP = document.createElement('p'); userIdP.classList.add('user-id'); userIdP.innerHTML = '<strong>User ID:</strong> '; userIdP.appendChild(document.createTextNode(userAuthId));
                const twoFactorP = document.createElement('p'); twoFactorP.innerHTML = '<strong>2FA Status:</strong> ' + is2FAEnabled;
                const metaP = document.createElement('p'); const smallMeta = document.createElement('small'); smallMeta.textContent = 'Joined: ' + userCreatedAt + ' | Last Sign-in: ' + userLastSignIn; metaP.appendChild(smallMeta);
                userInfo.appendChild(displayNameP); userInfo.appendChild(emailP); userInfo.appendChild(phoneP); userInfo.appendChild(userIdP); userInfo.appendChild(twoFactorP); userInfo.appendChild(metaP);
                const userActions = document.createElement('div'); userActions.classList.add('user-actions');
                const sendResetBtn = document.createElement('button'); sendResetBtn.textContent = 'Send Reset PW'; sendResetBtn.classList.add('button-outline', 'button-small'); sendResetBtn.title = 'Send password reset email to ' + userAuthEmail; sendResetBtn.onclick = () => handleAdminSendPasswordReset(userAuthEmail); userActions.appendChild(sendResetBtn);
                const manageBlocksBtn = document.createElement('button'); manageBlocksBtn.textContent = 'Manage Blocks'; manageBlocksBtn.classList.add('button-info', 'button-small'); manageBlocksBtn.title = 'Manage who this user can message and who can message them.'; manageBlocksBtn.onclick = () => openAdminManageUserBlocksModal(userAuthId, userDisplayName || userAuthEmail); userActions.appendChild(manageBlocksBtn);
                userItem.appendChild(userInfo); userItem.appendChild(userActions); adminUserListContainer.appendChild(userItem);
            });
        } else {
            adminUserListContainer.innerHTML = '<p>No users found' + (searchTerm ? ' matching your search.' : '.') + '</p>';
        }
    }
    catch (error) {
        console.error("Error in fetchAllUsersForAdmin:", error);
        let errorMessage = "Could not load users: " + (error.message || "Unknown error");
        adminUserListContainer.innerHTML = '<p style="color:red;">' + errorMessage + '</p>';
    }
}

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (event) => { console.error("IndexedDB error:", event.target.errorCode); reject("IndexedDB error: " + event.target.errorCode); };
        request.onsuccess = (event) => { db = event.target.result; console.log("IndexedDB opened successfully."); resolve(db); };
        request.onupgradeneeded = (event) => {
            console.log("IndexedDB upgrade needed."); const tempDb = event.target.result;
            if (!tempDb.objectStoreNames.contains(PENDING_MESSAGES_STORE)) { tempDb.createObjectStore(PENDING_MESSAGES_STORE, { keyPath: 'tempId', autoIncrement: false }); console.log(`Object store ${PENDING_MESSAGES_STORE} created.`); }
        };
    });
}

async function requestNotificationPermission() {
    if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) { showToast("Push Notifications not supported.", "info"); return null; }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') { console.log('Notification permission granted.'); return subscribeUserToPush(); }
    else { console.warn('Notification permission denied.'); showToast("Notification permission denied.", "warning"); return null; }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4); const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64); const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); } return outputArray;
}

async function subscribeUserToPush() {
    try {
        const registration = await navigator.serviceWorker.ready; const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) { console.log('User already subscribed.'); await sendSubscriptionToServer(existingSubscription); return existingSubscription; }
        const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
        console.log('User subscribed:', subscription); await sendSubscriptionToServer(subscription); showToast("Subscribed to notifications!", "success"); return subscription;
    }
    catch (error) {
        console.error('Failed to subscribe user:', error);
        if (Notification.permission === 'denied') showToast("Notification permission denied. Enable in browser settings.", "error");
        else showToast("Could not subscribe: " + error.message, "error");
        return null;
    }
}

async function sendSubscriptionToServer(subscription) {
    if (!currentUser) return; console.log("Sending subscription to server:", subscription.toJSON());
    try {
        const { error } = await supabaseClient.from('user_push_subscriptions').upsert({ user_id: currentUser.id, subscription_object: subscription.toJSON(), endpoint: subscription.endpoint, updated_at: new Date().toISOString() }, { onConflict: 'endpoint' });
        if (error) throw error; console.log('Push subscription saved.');
    }
    catch (error) { console.error('Error saving push subscription:', error); }
}

async function queueDataForSync(storeName, data, syncTag) {
    if (!db) { try { await openDatabase(); } catch (dbError) { console.error("IndexedDB not available:", dbError); showToast("Cannot save data offline.", "error"); return Promise.reject("IndexedDB not available."); } }
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite'); const store = transaction.objectStore(storeName);
        const dataToQueue = { ...data, tempId: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, queued_at: Date.now() };
        const request = store.add(dataToQueue);
        request.onsuccess = async () => { console.log(`Data queued in ${storeName} for ${syncTag}:`, dataToQueue); resolve(dataToQueue); if ('SyncManager' in window) { try { const registration = await navigator.serviceWorker.ready; await registration.sync.register(syncTag); console.log(`Background sync registered for '${syncTag}'`); } catch (syncError) { console.error(`Sync registration for '${syncTag}' failed:`, syncError); } } else console.warn("Background Sync not supported."); };
        request.onerror = (event) => { console.error(`Error queueing data in ${storeName}:`, event.target.error); reject(event.target.error); };
    });
}

async function registerPeriodicSync() {
    if (!('serviceWorker' in navigator) || !('PeriodicSyncManager' in window)) { console.warn('Periodic Background Sync not supported.'); return; }
    try {
        const registration = await navigator.serviceWorker.ready; const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
        if (status.state === 'granted') { const tags = await registration.periodicSync.getTags(); if (!tags.includes('update-app-content')) { await registration.periodicSync.register('update-app-content', { minInterval: 12 * 60 * 60 * 1000 }); console.log('Periodic sync registered for "update-app-content".'); } else console.log('Periodic sync "update-app-content" already registered.'); }
        else console.warn('Permission for Periodic Background Sync not granted.');
    }
    catch (err) { console.error('Periodic sync registration failed:', err); }
}

function setupAuthListeners() {
    if (signupBtn) signupBtn.addEventListener('click', () => { showModal(signupModal); if (signupMessage) { signupMessage.textContent = ''; signupMessage.className = 'form-message'; } if (signupForm) signupForm.reset(); });
    if (loginBtn) loginBtn.addEventListener('click', () => { showModal(loginModal); if (loginMessage) { loginMessage.textContent = ''; loginMessage.className = 'form-message'; } if (loginForm) loginForm.reset(); });
       // Inside setupAuthListeners() in script.js

    // Messages button in header logic
    if (messagesHeaderBtn) {
        messagesHeaderBtn.addEventListener('click', () => {
            if (currentUser) {
                // If we are on a page that is NOT the main index page (like terms or privacy)
                if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
                    // Redirect to the main page with a hash that our script can handle on load.
                    window.location.href = '/index.html#messages';
                } else {
                    // If we are already on the main page, simply call the function to show the view.
                    // This function automatically re-fetches the conversation list, achieving the desired "refresh" instantly
                    // without a slow page reload. This is the correct SPA approach.
                    showMessagesView();
                }
            } else {
                showToast("Please log in to see messages.", "info");
                showModal(loginModal);
            }
        });
    }

    // Logout button in header logic
    if (logoutBtnHeader) {
        logoutBtnHeader.addEventListener('click', handleLogout);
    }
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', async () => {
            if (!currentUser) { showToast("Please log in.", "info"); showModal(loginModal); return; }
            try {
                // Fetch profile data, including phone_number (no longer 2FA-related fields)
                const { data: profile, error: profileFetchError } = await supabaseClient.from('profiles').select('username, email, phone_number').eq('id', currentUser.id).single();

                if (profileFetchError && profileFetchError.code === 'PGRST116') {
                    // Profile not found, display defaults.
                    profileUsernameField.value = '';
                    profileEmailField.value = currentUser.email || '';
                    if (profilePhoneNumberField) profilePhoneNumberField.value = 'Not provided'; // Display "Not provided" if phone number is null
                    showToast("Profile not found. It will be created on save.", "info"); // More informative toast
                } else if (profileFetchError) {
                    // Actual error fetching profile (e.g., RLS, network)
                    console.error("Error loading profile for modal:", profileFetchError);
                    showToast("Could not load profile details.", "error");
                    // Display current user email and error for other fields
                    profileUsernameField.value = '';
                    profileEmailField.value = currentUser.email || '';
                    if (profilePhoneNumberField) profilePhoneNumberField.value = 'Error loading';
                } else {
                    // Profile loaded successfully
                    profileUsernameField.value = profile?.username || '';
                    profileEmailField.value = currentUser.email || '';
                    if (profilePhoneNumberField) profilePhoneNumberField.value = profile?.phone_number || 'Not provided'; // Display "Not provided" if actual value is null
                }

                // My Account modal email display (middle of modal header) - already updated in updateAuthUI, but ensure consistency
                if (profileModalUserEmail) profileModalUserEmail.textContent = currentUser.email || 'No email';

                // No 2FA toggle logic here as it's removed from UI
                showModal(editProfileModal);
            }
            catch (error) {
                // Catch any unexpected errors during modal opening setup
                console.error("Unexpected error during editProfileBtn click:", error);
                showToast("An unexpected error occurred. Please try again.", "error");
                // Fallback display if an error prevents filling fields
                if (profileEmailField) profileEmailField.value = currentUser.email || '';
                if (profileModalUserEmail) profileModalUserEmail.textContent = currentUser.email || 'Error loading';
                if (profilePhoneNumberField) profilePhoneNumberField.value = 'Error loading';
                showModal(editProfileModal);
            }
        });
    }
    // All 2FA toggle related listeners are removed as the UI section is gone

    if (viewMyMessagesFromProfileBtn) viewMyMessagesFromProfileBtn.addEventListener('click', () => { if (currentUser) { hideModal(editProfileModal); showMessagesView(); } else { showToast("Please log in to see messages.", "info"); } });
    if (logoutFromProfileBtn) logoutFromProfileBtn.addEventListener('click', handleLogout);
    if (adminViewMessagesBtn) adminViewMessagesBtn.addEventListener('click', () => { if (isSuperAdmin) showAdminMessagesView(); else showToast("Admin access required.", "error"); });
    if (adminUserManagementBtn) adminUserManagementBtn.addEventListener('click', () => { if (isSuperAdmin) showAdminUserManagementView(); else showToast("Admin access required.", "error"); });
    if (backToListingsFromAdminUsersBtn) backToListingsFromAdminUsersBtn.addEventListener('click', () => { if (adminUserManagementView) adminUserManagementView.style.display = 'none'; if (mainListingsView) mainListingsView.style.display = 'block'; trackPageView('/listings', 'Cleveland Marketplace - All Listings'); });
    if (adminUserSearch) adminUserSearch.addEventListener('input', (e) => { clearTimeout(adminUserSearch.searchTimeout); adminUserSearch.searchTimeout = setTimeout(() => { fetchAllUsersForAdmin(e.target.value.trim()); }, 500); });
    if (adminInviteUserBtn) adminInviteUserBtn.addEventListener('click', handleAdminInviteUser);
    if (closeAdminManageUserBlocksModalBtn) closeAdminManageUserBlocksModalBtn.addEventListener('click', () => hideModal(adminManageUserBlocksModal));
    if (adminBlockUserForm) adminBlockUserForm.addEventListener('submit', handleAdminBlockUserFromTarget);
    if (targetUserToBlockIdentifier) {
        if (!targetUserToBlockIdentifier.listenerAttached) {
            targetUserToBlockIdentifier.addEventListener('input', (e) => {
                clearTimeout(targetUserToBlockIdentifier.searchTimeout); targetUserToBlockIdentifier.searchTimeout = setTimeout(() => { populateAdminBlockTargetList(e.target.value.trim(), currentManagingBlocksForUserId); }, 400);
            }); targetUserToBlockIdentifier.listenerAttached = true;
        }
    }
    if (closeSelectUserToMessageModalBtn) closeSelectUserToMessageModalBtn.addEventListener('click', () => hideModal(selectUserToMessageModal));
    if (selectUserToMessageSearch) {
        selectUserToMessageSearch.addEventListener('input', (e) => {
            clearTimeout(selectUserToMessageSearch.searchTimeout); selectUserToMessageSearch.searchTimeout = setTimeout(() => { populateSelectUserToMessageModalList(e.target.value.trim()); }, 400);
        });
    }
    if (supportChatBtn) supportChatBtn.addEventListener('click', handleSupportChatClick);
    if (startNewConversationBtn) startNewConversationBtn.addEventListener('click', () => { if (!currentUser) { showToast("Please log in to start a conversation.", "info"); showModal(loginModal); return; } openSelectUserToMessageModal(); });
    if (closeSignupModalBtn) closeSignupModalBtn.addEventListener('click', () => hideModal(signupModal));
    if (closeLoginModalBtn) closeLoginModalBtn.addEventListener('click', () => hideModal(loginModal));
    if (closeEditProfileModalBtn) closeEditProfileModalBtn.addEventListener('click', () => hideModal(editProfileModal));
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (editProfileForm) editProfileForm.addEventListener('submit', handleEditProfile);
    if (switchToSignupLink) switchToSignupLink.addEventListener('click', (e) => { e.preventDefault(); hideModal(loginModal); showModal(signupModal); if (signupMessage) { signupMessage.textContent = ''; signupMessage.className = 'form-message'; } if (signupForm) signupForm.reset(); });
    if (switchToLoginLink) switchToLoginLink.addEventListener('click', (e) => { e.preventDefault(); hideModal(signupModal); showModal(loginModal); if (loginMessage) { loginMessage.textContent = ''; loginMessage.className = 'form-message'; } if (loginForm) loginForm.reset(); });
    if (forgotPasswordLink) forgotPasswordLink.addEventListener('click', (e) => { e.preventDefault(); handleForgotPassword(); });

    // Listener for LOGIN 2FA modal (if it exists in index.html)
    if (closeLoginTwoFactorAuthModalBtn) {
        closeLoginTwoFactorAuthModalBtn.addEventListener('click', async () => {
            hideModal(loginTwoFactorAuthModal);
            if (currentUser && generated2FACode) {
                showToast("2FA cancelled. Logging out for security.", "warning");
                await supabaseClient.auth.signOut();
            }
            generated2FACode = '';
            tempEmailFor2FA = '';
        });
    }
    if (loginTwoFactorAuthForm) {
        if (!loginTwoFactorAuthForm.hasAttribute('data-listener-attached')) {
            loginTwoFactorAuthForm.addEventListener('submit', handleVerifyCode);
            loginTwoFactorAuthForm.setAttribute('data-listener-attached', 'true');
        }
    }

    if (supabaseClient) {
        supabaseClient.auth.onAuthStateChange(async (_event, session) => {
            const wasLoggedIn = !!currentUser;
            const newCurrentUser = session ? session.user : null;

            updateAuthUI(newCurrentUser);

            const isNowLoggedIn = !!newCurrentUser;
            const loginCompleted = !wasLoggedIn && isNowLoggedIn;

            if (loginTwoFactorAuthModal && loginTwoFactorAuthModal.style.display === 'flex') {
                console.log("2FA modal is open, deferring deep link resolution.");
                return;
            }

            await handleDeepLinkAfterLogin();

            if (loginCompleted) {
                requestNotificationPermission();
                registerPeriodicSync();
            }

            if (wasLoggedIn && !isNowLoggedIn) {
                initialDeepLinkItemId = null;
                initialDeepLinkPath = null;
                initialDeepLinkConversationId = null;
                if (window.location.pathname.startsWith('/listing/')) {
                    window.history.pushState({}, 'Cleveland Marketplace', '/');
                    mainListingsView.style.display = 'block';
                    itemDetailView.style.display = 'none';
                    messagesView.style.display = 'none';
                    adminMessagesView.style.display = 'none';
                    adminUserManagementView.style.display = 'none';
                    trackPageView('/listings', 'Cleveland Marketplace - All Listings');
                }
            }
        });
    }
}

function resetPostItemModal() {
    if (postItemForm) postItemForm.reset();
    if (postItemPriceField) { postItemPriceField.disabled = false; postItemPriceField.required = true; }
    if (postItemFreeCheckbox) postItemFreeCheckbox.checked = false;
    if (postImageSourceFileRadio) postImageSourceFileRadio.checked = true;
    if (postImageFileUploadContainer) postImageFileUploadContainer.style.display = 'block';
    if (postItemImageUrlContainer) postItemImageUrlContainer.style.display = 'none';
    if (postItemImageFileField) { postItemImageFileField.value = ''; postItemImageFileField.required = true; }
    if (postItemImageUrlField) { postItemImageUrlField.value = ''; postItemImageUrlField.required = false; }
    if (postItemImagePreview) { postItemImagePreview.src = '#'; postItemImagePreview.style.display = 'none'; }
    const btn = postItemForm.querySelector('button[type="submit"]'); if (btn) showButtonLoadingState(btn, false, "Post Item");
    const ol = postItemModal.querySelector('.modal-processing-overlay'); if (ol) { ol.style.display = 'none'; ol.classList.remove('visible'); }
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
    const ol = editItemModal.querySelector('.modal-processing-overlay'); if (ol) { ol.style.display = 'none'; ol.classList.remove('visible'); }
}

async function showItemDetailPage(itemId) {
    if (!itemId || !supabaseClient) {
        console.error("Item ID or Supabase client missing for detail page.");
        showToast("Error: Item ID missing or app not initialized.", "error");
        setTimeout(() => {
            window.history.pushState({}, 'Cleveland Marketplace', '/');
            mainListingsView.style.display = 'block';
            itemDetailView.style.display = 'none';
            document.title = "Cleveland Marketplace - Buy & Sell Local Items in Cleveland, OH";
            trackPageView('/listings', 'Cleveland Marketplace - All Listings');
        }, 1500);
        return;
    }

    if (mainListingsView) mainListingsView.style.display = 'none';
    if (messagesView) messagesView.style.display = 'none';
    if (adminMessagesView) adminMessagesView.style.display = 'none';
    if (adminUserManagementView) adminUserManagementView.style.display = 'none';

    if (itemDetailView) { itemDetailView.style.display = 'block'; itemDetailView.scrollTo(0, 0); }

    const detailContentParent = getElement('itemDetailContent');
    if (detailContentParent) {
        const elementsToReset = ['detailItemImage', 'detailItemName', 'detailItemPrice', 'detailItemDescription', 'detailItemContact', 'sellerNameDisplay', 'detailItemPostedDate'];
        elementsToReset.forEach(id => { const el = getElement(id); if (el) { if (el.tagName === 'IMG') { el.src = '#'; el.style.display = 'none'; } else { el.textContent = ''; } } });
        let existingPlaceholder = detailContentParent.querySelector('.no-image-placeholder-detail'); if (existingPlaceholder) existingPlaceholder.remove();
        if (getElement('detailItemSellerInfo')) getElement('detailItemSellerInfo').style.display = 'none';
        detailContentParent.insertAdjacentHTML('afterbegin', '<p class="loading-text">Loading item details...</p>');
        if (commentsList) commentsList.innerHTML = '<p>Loading comments...</p>'; if (commentsSection) commentsSection.style.display = 'none';
    } else { console.error("#itemDetailContent parent not found!"); return; }

    currentOpenListingId = itemId;

    try {
        const { data: item, error } = await supabaseClient.from('listings_with_author_info').select('*').eq('id', itemId).single();
        const loadingP = detailContentParent.querySelector('p.loading-text'); if (loadingP) loadingP.remove();

        if (error) {
            console.error("[showItemDetailPage] Supabase error fetching item:", error.message);
            let errorMessage = `Error loading item: ${error.message}.`;
            if (error.code === 'PGRST116' || error.message.includes('Auth Error')) {
                errorMessage = "This item does not exist, or you need to log in/have permission to view it.";
            }
            if (detailContentParent) {
                detailContentParent.innerHTML = `<p class="loading-text" style="color:red;">${errorMessage}</p>`;
            }
            showToast("Could not load item details. " + errorMessage, "error", 5000);

            setTimeout(() => {
                window.history.pushState({}, 'Cleveland Marketplace', '/');
                mainListingsView.style.display = 'block';
                itemDetailView.style.display = 'none';
                currentOpenListingId = null;
                document.title = "Cleveland Marketplace - Buy & Sell Local Items in Cleveland, OH";
                trackPageView('/listings', 'Cleveland Marketplace - All Listings');
            }, 3000);

            return;
        }

        if (!item) {
            if (detailContentParent) { detailContentParent.innerHTML = '<p class="loading-text" style="color:red;">Item not found.</p>'; }
            showToast("Item not found.", "error");
            setTimeout(() => {
                window.history.pushState({}, 'Cleveland Marketplace', '/');
                mainListingsView.style.display = 'block';
                itemDetailView.style.display = 'none';
                currentOpenListingId = null;
                document.title = "Cleveland Marketplace - Buy & Sell Local Items in Cleveland, OH";
                trackPageView('/listings', 'Cleveland Marketplace - All Listings');
            }, 1500);
            return;
        }

        const imgEl = getElement('detailItemImage'); const nameEl = getElement('detailItemName'); const priceEl = getElement('detailItemPrice'); const descEl = getElement('detailItemDescription'); const contactEl = getElement('detailItemContact'); const sellerInfoDiv = getElement('detailItemSellerInfo'); const sellerDisplayEl = getElement('sellerNameDisplay'); const dateEl = getElement('detailItemPostedDate');

        let noImgPlaceholder = detailContentParent.querySelector('.no-image-placeholder-detail'); if (noImgPlaceholder) noImgPlaceholder.remove();

        if (imgEl) {
            if (item.image_url) {
                imgEl.src = item.image_url;
                imgEl.alt = `${item.name || 'Listing image'} for sale in Cleveland`;
                imgEl.style.display = 'block';
                imgEl.onerror = () => { imgEl.style.display = 'none'; noImgPlaceholder = document.createElement('div'); noImgPlaceholder.className = 'no-image-placeholder-detail'; noImgPlaceholder.textContent = 'Image not available'; const imageWrapper = detailContentParent.querySelector('.image-detail-wrapper') || detailContentParent; imageWrapper.prepend(noImgPlaceholder); };
            } else {
                imgEl.style.display = 'none';
                noImgPlaceholder = document.createElement('div');
                noImgPlaceholder.className = 'no-image-placeholder-detail';
                noImgPlaceholder.textContent = 'No Image Provided';
                const imageWrapper = detailContentParent.querySelector('.image-detail-wrapper') || detailContentParent;
                imageWrapper.prepend(noImgPlaceholder);
            }
        }

        if (nameEl) nameEl.textContent = item.name || 'N/A';
        let displayPrice = 'N/A'; if (item.price) { const priceNum = parseFloat(item.price); if (item.price.toString().toLowerCase() === 'free' || priceNum === 0) displayPrice = 'Free'; else if (!isNaN(priceNum)) displayPrice = '$' + priceNum.toFixed(2); else displayPrice = item.price; }
        if (priceEl) priceEl.textContent = displayPrice;
        if (descEl) descEl.innerHTML = (item.description || 'No description.').replace(/\n/g, '<br>');
        if (contactEl) contactEl.textContent = item.contact_info || 'N/A';
        if (dateEl) dateEl.textContent = 'Posted: ' + (item.created_at ? new Date(item.created_at).toLocaleString() : 'Unknown');
        if (sellerInfoDiv && sellerDisplayEl) { const sellerName = item.author_username || item.author_email; if (sellerName && sellerName.trim() !== '' && sellerName.trim().toLowerCase() !== 'n/a') { sellerDisplayEl.textContent = sellerName; sellerInfoDiv.style.display = 'block'; } else { sellerInfoDiv.style.display = 'none'; } }

        if (messageSellerBtn) {
            let actualSellerName = item.author_username || item.author_email || "Seller";
            messageSellerBtn.dataset.sellerId = item.user_id;
            messageSellerBtn.dataset.listingId = item.id;
            messageSellerBtn.dataset.listingName = item.name || "this item";
            messageSellerBtn.dataset.sellerName = actualSellerName;
        }

        if (addCommentForm) { addCommentForm.style.display = currentUser ? 'block' : 'none'; if (currentUser) addCommentForm.reset(); }
        if (commentsSection) commentsSection.style.display = 'block';
        fetchComments(itemId);

        document.title = `${item.name || 'Item'} - Cleveland Marketplace`;

        trackPageView('/item/' + item.id, 'Item - ' + (item.name || 'Details'));

        const currentPath = window.location.pathname;
        const itemNameForUrl = (item.name || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const expectedFriendlyPath = `/listing/${itemNameForUrl}-${item.id}`;

        if (currentPath !== expectedFriendlyPath && currentPath.startsWith('/listing/')) {
            window.history.replaceState({}, document.title, expectedFriendlyPath);
        }

    }
    catch (error) {
        console.error("Error processing item details in showItemDetailPage:", error);
        const detailContentParentForError = getElement('itemDetailContent');
        if (detailContentParentForError) detailContentParentForError.innerHTML = '<p class="loading-text" style="color:red;">Error loading item. Check console.</p>';
        showToast("Could not load item details.", "error");
    }
}

async function fetchComments(listingId) {
    if (!commentsList || !listingId) return; commentsList.innerHTML = '<p>Loading comments...</p>';
    try {
        const { data: comments, error } = await supabaseClient.from('comments_with_commenter_info').select('*').eq('listing_id', listingId).order('created_at', { ascending: true });
        if (error) throw error; commentsList.innerHTML = '';
        if (comments && comments.length > 0) {
            comments.forEach(comment => {
                const commentDiv = document.createElement('div'); commentDiv.classList.add('comment');
                const authorName = comment.commenter_username || comment.commenter_email || (comment.user_id ? 'User ' + comment.user_id.substring(0, 6) : 'Anonymous');
                const commentDate = new Date(comment.created_at).toLocaleString();
                commentDiv.innerHTML = ' <p class="comment-author">' + document.createTextNode(authorName).textContent + '</p> <p class="comment-date">' + commentDate + '</p> <p class="comment-content">' + document.createTextNode(comment.content).textContent.replace(/\n/g, '<br>') + '</p> ';
                if (currentUser && (currentUser.id === comment.user_id || isSuperAdmin)) {
                    const deleteBtn = document.createElement('button'); deleteBtn.textContent = 'Delete'; deleteBtn.classList.add('button-danger', 'delete-comment-btn'); deleteBtn.dataset.commentId = comment.id; deleteBtn.onclick = () => deleteComment(comment.id);
                    const dateP = commentDiv.querySelector('.comment-date'); if (dateP && dateP.parentNode === commentDiv) dateP.insertAdjacentElement('beforeend', deleteBtn); else commentDiv.appendChild(deleteBtn);
                } commentsList.appendChild(commentDiv);
            });
        } else { if (currentUser) { commentsList.innerHTML = '<p>No comments yet. Be the first!</p>'; } else { commentsList.innerHTML = '<p>No comments yet. <a href="#" id="loginToCommentLink">Sign in</a> to post a comment.</p>'; } }
    }
    catch (error) { console.error("Error fetching comments:", error); commentsList.innerHTML = '<p style="color:red;">Could not load comments.</p>'; showToast("Error loading comments.", "error"); }
}

async function deleteComment(commentId) {
    if (!currentUser || !commentId) { showToast("Cannot delete comment.", "error"); return; }
    if (!confirm("Delete this comment?")) return;
    try {
        const { error } = await supabaseClient.from('comments').delete().eq('id', commentId);
        if (error) throw error; showToast("Comment deleted.", "success"); trackGAEvent('delete_comment', { comment_id: commentId }); fetchComments(currentOpenListingId);
    }
    catch (error) { console.error("Error deleting comment:", error); showToast('Error: ' + error.message, "error"); }
}

async function fetchListings(isNewSearchOrFilter = false) {
    if (!listingsContainer) return; if (isFetchingListings && !isNewSearchOrFilter) return; isFetchingListings = true;
    if (isNewSearchOrFilter) { listingsContainer.innerHTML = '<p class="loading-text">Loading listings...</p>'; currentLoadedCount = 0; }
    else if (currentLoadedCount === 0 && listingsContainer.innerHTML.trim() === '') { listingsContainer.innerHTML = '<p class="loading-text">Loading listings...</p>'; }
    if (loadMoreBtn) loadMoreBtn.disabled = true;
    let query = supabaseClient.from('listings_with_author_info').select('*').range(currentLoadedCount, currentLoadedCount + ITEMS_PER_PAGE - 1);
    if (currentSearchTerm) query = query.or('name.ilike.%' + currentSearchTerm + '%,description.ilike.%' + currentSearchTerm + '%');
    if (currentFilterFreeOnly) { query = query.or('price.eq.0,price.ilike.free'); }
    else { if (currentMinPrice !== null && currentMinPrice !== '' && !isNaN(parseFloat(currentMinPrice))) query = query.gte('price', parseFloat(currentMinPrice)); if (currentMaxPrice !== null && currentMaxPrice !== '' && !isNaN(parseFloat(currentMaxPrice))) query = query.lte('price', parseFloat(currentMaxPrice)); }
    let sortCol = 'created_at'; let sortDir = false;
    if (currentSortOption) { const parts = currentSortOption.split('_'); if (parts.length >= 2) { sortDir = parts.pop() === 'asc'; sortCol = parts.join('_'); } }
    query = query.order(sortCol, { ascending: sortDir });
    const { data: listings, error } = await query; isFetchingListings = false;
    if (error) { if (currentLoadedCount === 0 || isNewSearchOrFilter) listingsContainer.innerHTML = '<p class="loading-text" style="color:red;">Error: ' + error.message + '</p>'; else showToast('Error fetching more: ' + error.message, "error"); if (loadMoreContainer) loadMoreContainer.style.display = 'none'; return; }
    if (isNewSearchOrFilter) listingsContainer.innerHTML = '';
    if (currentLoadedCount === 0 && (!listings || listings.length === 0)) { listingsContainer.innerHTML = '<p class="loading-text">' + ((currentSearchTerm || currentMinPrice !== null || currentMaxPrice !== null || currentFilterFreeOnly) ? 'No items match your criteria.' : 'No items posted yet.') + '</p>'; if (loadMoreContainer) loadMoreContainer.style.display = 'none'; return; }
    listings.forEach(listing => {
        if (isNewSearchOrFilter === false && document.querySelector('.listing-card[data-id="' + listing.id + '"]')) return;
        const card = document.createElement('div'); card.className = 'listing-card'; card.dataset.itemId = listing.id; Object.assign(card.dataset, { id: listing.id, name: listing.name, description: listing.description, price: listing.price, contact: listing.contact_info, imageUrl: listing.image_url || '', ownerId: listing.user_id });
        const safeName = document.createTextNode(listing.name || 'N/A').textContent; let displayPrice = 'N/A'; if (listing.price) { const priceNum = parseFloat(listing.price); if (listing.price.toLowerCase() === 'free' || priceNum === 0) displayPrice = 'Free'; else if (!isNaN(priceNum)) displayPrice = '$' + priceNum.toFixed(2); else displayPrice = listing.price; }
        const safeDesc = document.createTextNode(listing.description || '').textContent; const safeContact = document.createTextNode(listing.contact_info || '').textContent; const imgUrl = listing.image_url || ''; let imgFilename = ''; if (imgUrl) { try { const u = new URL(imgUrl); const p = u.pathname.split('/'); const bIdx = p.indexOf('listing-images'); if (bIdx != -1 && bIdx + 1 < p.length) imgFilename = p.slice(bIdx + 1).join('/'); } catch (e) { } }
        const date = listing.created_at ? new Date(listing.created_at).toLocaleString() : 'N/A';
        const sellerDisplayName = listing.author_username || listing.author_email || 'User';
        card.innerHTML = ' <div class="no-image-placeholder" style="display:' + (imgUrl ? 'none' : 'flex') + ';">No Image</div> ' + (imgUrl ? '<img src="' + imgUrl + '" alt="' + safeName + '" loading="lazy" onerror="this.style.display=\'none\'; this.previousElementSibling.style.display=\'flex\';">' : '') + ' <h3>' + safeName + '</h3> <p class="price-display"><strong>Price:</strong> ' + displayPrice + '</p> <p>' + safeDesc.replace(/\n/g, '<br>') + '</p> <p><strong>Contact:</strong> ' + safeContact + '</p> <small>Posted by ' + document.createTextNode(sellerDisplayName).textContent + ' on ' + date + '</small> ';
        let showControls = false; if (currentUser) { if ((SUPERADMIN_USER_ID !== 'YOUR_SUPERADMIN_UUID_HERE' && isSuperAdmin) || currentUser.id === listing.user_id) showControls = true; }
        if (showControls) { const actionsDiv = document.createElement('div'); actionsDiv.className = 'action-buttons'; const editBtn = document.createElement('button'); editBtn.className = 'edit-button'; editBtn.textContent = 'Edit'; const delBtn = document.createElement('button'); delBtn.className = 'delete-button'; delBtn.textContent = 'Delete'; Object.assign(delBtn.dataset, { id: listing.id, ownerId: listing.user_id, imageFilename: imgFilename }); actionsDiv.append(editBtn, delBtn); card.appendChild(actionsDiv); }
        listingsContainer.appendChild(card);
    });
    const initialLoadingText = listingsContainer.querySelector('p.loading-text'); if (initialLoadingText && listings.length > 0 && currentLoadedCount === 0) initialLoadingText.remove();
    currentLoadedCount += listings.length;
    if (listings.length < ITEMS_PER_PAGE) { if (loadMoreContainer) loadMoreContainer.style.display = 'none'; } else { if (loadMoreContainer) loadMoreContainer.style.display = 'block'; if (loadMoreBtn) loadMoreBtn.disabled = false; }
}

async function handleDeleteListing(id, imageFileNameWithPath, itemOwnerId) {
    if (!currentUser) { showToast("Login required.", "error"); return; }
    if (!isSuperAdmin && currentUser.id !== itemOwnerId && SUPERADMIN_USER_ID !== 'YOUR_SUPERADMIN_UUID_HERE') { showToast("Permission denied.", "error"); return; }
    try {
        const { error: dbErr } = await supabaseClient.from('listings').delete().eq('id', id);
        if (dbErr) throw new Error('DB Delete: ' + dbErr.message);
        if (imageFileNameWithPath && !imageFileNameWithPath.startsWith('http')) {
            const { error: storErr } = await supabaseClient.storage.from('listing-images').remove([imageFileNameWithPath]);
            if (storErr) console.warn('Storage Delete Warning:', storErr.message, "Path attempted:", imageFileNameWithPath);
        }
        showToast('Listing deleted!', 'success'); trackGAEvent('delete_item_success', { item_id: id }); fetchListings(true);
    }
    catch (error) {
        showToast('Delete Failed: ' + error.message, "error"); trackGAEvent('delete_item_failure', { item_id: id, error_message: error.message });
        const btn = listingsContainer?.querySelector('.delete-button[data-id="' + id + '"]'); if (btn) { btn.disabled = false; btn.textContent = "Delete"; }
    }
}

async function showMessagesView(fromDeepLink = false) {
    if (!currentUser) { showToast("Please log in to view messages.", "info"); showModal(loginModal); return; }

    // Ensure all view elements are correctly referenced before trying to manipulate them
    if (mainListingsView) mainListingsView.style.display = 'none';
    if (itemDetailView) itemDetailView.style.display = 'none';
    if (adminMessagesView) adminMessagesView.style.display = 'none';
    if (adminUserManagementView) adminUserManagementView.style.display = 'none';
    if (editProfileModal && editProfileModal.classList.contains('modal-visible')) hideModal(editProfileModal); // Hide if open

    if (messagesView) messagesView.style.display = 'block';
    if (messageChatPanel) messageChatPanel.style.display = 'none'; // Initially hide chat panel
    if (chatWithInfo) chatWithInfo.textContent = 'Select a conversation.'; // Reset chat info
    clearReplyState();

    const currentPathname = window.location.pathname;
    const currentHash = window.location.hash;
    const isCleanMessageUrl = currentPathname.startsWith('/messages/conversation/') || currentPathname === '/messages';

    if (!fromDeepLink && !isCleanMessageUrl) {
        window.history.pushState({}, 'My Messages - Cleveland Marketplace', '/messages');
    } else if (fromDeepLink && initialDeepLinkConversationId && !currentPathname.includes(initialDeepLinkConversationId)) {
        window.history.replaceState({}, 'My Messages - Cleveland Marketplace', `/messages/conversation/${initialDeepLinkConversationId}`);
    } else if (fromDeepLink && !initialDeepLinkConversationId && currentPathname !== '/messages') {
        window.history.replaceState({}, 'My Messages - Cleveland Marketplace', '/messages');
    }
    document.title = 'My Messages - Cleveland Marketplace';
    trackPageView('/messages', 'My Messages');
    fetchUserConversations();
}


async function fetchUserConversations() {
    if (!currentUser || !conversationsListInner) return;
    conversationsListInner.innerHTML = '<p class="loading-text">Loading conversations...</p>';
    try {
        const { data: rpcData, error: rpcError } = await supabaseClient.rpc('get_user_conversations');
        if (rpcError) throw rpcError; conversationsListInner.innerHTML = '';
        if (rpcData && rpcData.length > 0) {
            rpcData.forEach(convo => {
                const otherParticipant = convo.participants.find(p => p.user_id !== currentUser.id); const otherParticipantUserId = otherParticipant?.user_id;
                let otherUserNameForDisplay = otherParticipant?.username || otherParticipant?.email || 'User'; let topicForDisplay = convo.listing_name || 'General Chat';
                if (otherParticipantUserId === SUPERADMIN_USER_ID && !convo.listing_id) { otherUserNameForDisplay = "Support Team"; topicForDisplay = "Support Inquiry"; }
                let lastMsgPreview = convo.last_message_content || 'No messages yet...';
                if (convo.attachment_filename) { lastMsgPreview = '📎 ' + convo.attachment_filename; } else if (lastMsgPreview.length > 25) { lastMsgPreview = lastMsgPreview.substring(0, 22) + "..."; }
                if (convo.last_message_sender_id === currentUser.id) { lastMsgPreview = "You: " + lastMsgPreview; }
                const convoItem = document.createElement('div'); convoItem.className = 'conversation-item'; convoItem.dataset.conversationId = convo.conversation_id; convoItem.dataset.otherUserId = otherParticipantUserId; convoItem.dataset.otherUserNameDisplay = otherUserNameForDisplay; convoItem.dataset.topicName = topicForDisplay; convoItem.dataset.listingId = convo.listing_id || '';
                const userP = document.createElement('p'); userP.className = 'convo-user'; userP.textContent = document.createTextNode(otherUserNameForDisplay).textContent;
                const topicP = document.createElement('p'); topicP.className = 'convo-topic'; topicP.textContent = 'Re: ' + document.createTextNode(topicForDisplay).textContent;
                const lastMsgP = document.createElement('p'); lastMsgP.className = 'convo-last-message'; lastMsgP.textContent = document.createTextNode(lastMsgPreview).textContent;
                convoItem.appendChild(userP); convoItem.appendChild(topicP); convoItem.appendChild(lastMsgP);
                convoItem.addEventListener('click', () => {
                    const convoId = convo.conversation_id;
                    const otherUserNameSlug = (otherUserNameForDisplay || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    const topicSlug = (topicForDisplay || 'chat').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    const newPath = `/messages/conversation/${topicSlug}-${otherUserNameSlug}-${convoId}`;
                    window.history.pushState({ conversationId: convoId, path: newPath }, `Chat with ${otherUserNameForDisplay} - Cleveland Marketplace`, newPath);
                    openConversation(convoId, otherUserNameForDisplay, topicForDisplay);
                });
                conversationsListInner.appendChild(convoItem);
            });
        } else { conversationsListInner.innerHTML = '<p>No conversations yet.</p>'; }
    }
    catch (error) { console.error("Error fetching conversations via RPC:", error); conversationsListInner.innerHTML = '<p style="color:red;">Could not load conversations.</p>'; showToast("Error loading convos.", "error"); }
}

async function openConversation(conversationId, otherUserNameToDisplay, topicNameToDisplay) {
    if (!conversationId) return; currentOpenConversationId = conversationId; clearReplyState();
    if (messageChatPanel) messageChatPanel.style.display = 'flex';
    if (chatWithInfo) { chatWithInfo.innerHTML = 'Chat with <strong>' + document.createTextNode(otherUserNameToDisplay).textContent + '</strong><br><small class="chat-topic-header">Re: ' + document.createTextNode(topicNameToDisplay || 'General Discussion').textContent + '</small>'; }
    if (sendMessageForm) { sendMessageForm.dataset.conversationId = conversationId; }
    document.querySelectorAll('#conversationsListInner .conversation-item, #adminConversationsListInner .conversation-item').forEach(item => item.classList.toggle('active-conversation', item.dataset.conversationId === conversationId));
    fetchMessagesForConversation(conversationId, true, true);
    document.title = `Chat with ${otherUserNameToDisplay} about ${topicNameToDisplay} - Cleveland Marketplace`;
    trackPageView(`/messages/conversation/${conversationId}`, `Conversation with ${otherUserNameToDisplay} about ${topicNameToDisplay}`);
    if (activeChatPoller) clearInterval(activeChatPoller);
    activeChatPoller = setInterval(() => { if (currentOpenConversationId === conversationId) fetchMessagesForConversation(currentOpenConversationId, false, false); else clearInterval(activeChatPoller); }, 7000);
}

function setupReply(messageId, threadId, senderName, messageContent) {
    replyingToMessageId = messageId; replyingToThreadId = threadId || messageId; replyingToUser = senderName; replyingToSnippet = messageContent.substring(0, 50) + (messageContent.length > 50 ? '...' : '');
    if (replyPreviewDiv && replyPreviewContentSpan) { replyPreviewContentSpan.innerHTML = 'Replying to: <strong>' + document.createTextNode(replyingToUser).textContent + '</strong> "' + document.createTextNode(replyingToSnippet).textContent + '"'; replyPreviewDiv.style.display = 'flex'; }
    if (newMessageContentField) newMessageContentField.focus();
}

function clearReplyState() {
    replyingToMessageId = null; replyingToThreadId = null; replyingToUser = null; replyingToSnippet = null;
    if (replyPreviewDiv) { replyPreviewDiv.style.display = 'none'; }
    if (sendMessageForm) { sendMessageForm.dataset.replyingToMessageId = ''; sendMessageForm.dataset.replyingToThreadId = ''; }
}

async function addReactionToMessage(messageId, emoji) {
    if (!currentUser || !messageId || !emoji) return;
    try {
        const { data, error } = await supabaseClient.from('message_reactions').insert({ message_id: messageId, user_id: currentUser.id, emoji: emoji });
        if (error) { if (error.code === '23505') showToast("You've already reacted.", "info"); else throw error; }
        else { showToast("Reaction added!", "success"); if (currentOpenConversationId) fetchMessagesForConversation(currentOpenConversationId, false, false); }
    }
    catch (error) { console.error("Error adding reaction:", error); showToast("Could not add reaction: " + error.message, "error"); }
}

async function removeReactionFromMessage(messageId, emoji) {
    if (!currentUser || !messageId || !emoji) return;
    try {
        const { error } = await supabaseClient.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', currentUser.id).eq('emoji', emoji);
        if (error) throw error; showToast("Reaction removed.", "info");
        if (currentOpenConversationId) fetchMessagesForConversation(currentOpenConversationId, false, false);
    }
    catch (error) { console.error("Error removing reaction:", error); showToast("Could not remove reaction: " + error.message, "error"); }
}

async function fetchMessagesForConversation(conversationId, showLoading = true, isNewConversationLoad = false) {
    // Check if essential elements for rendering messages exist on the page
    // This is crucial for pages like terms.html/privacy.html that don't have the full chat UI
    if (!messagesContainer || !adminMessagesContainer) {
        console.warn("Attempted to fetch messages on a page without message containers. Skipping.");
        // We log a warning, but don't throw an error here, as handleSupportChatClick now redirects.
        return;
    }

    const isUserView = messagesView.style.display === 'block'; const isUserAdminView = adminMessagesView.style.display === 'block';
    const targetContainer = isUserView ? messagesContainer : (isUserAdminView ? adminMessagesContainer : null);
    if (!targetContainer || !conversationId) { console.warn("fetchMessagesForConversation: Target container or conversationId missing."); return; }
    if (showLoading || isNewConversationLoad) targetContainer.innerHTML = '<p class="loading-text">Loading messages...</p>';
    try {
        const { data: messagesFromView, error: viewError } = await supabaseClient.from('messages_with_sender_info').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
        if (viewError) { if (showLoading || isNewConversationLoad) targetContainer.innerHTML = '<p style="color:red;">Could not load messages. View error: ' + viewError.message + '</p>'; return; }
        if (!messagesFromView) { if (showLoading || isNewConversationLoad) targetContainer.innerHTML = '<p>No messages yet.</p>'; return; }
        const messageIds = messagesFromView.map(msg => msg.id); let reactionsMap = {};
        if (messageIds.length > 0) { const { data: reactionsData, error: reactionsError } = await supabaseClient.from('message_reactions').select('message_id, user_id, emoji').in('message_id', messageIds); if (reactionsError) console.warn("Could not fetch reactions:", reactionsError); else if (reactionsData) reactionsData.forEach(r => { if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = []; reactionsMap[r.message_id].push(r); }); }
        const messagesData = messagesFromView.map(msg => ({ ...msg, reactionsData: reactionsMap[msg.id] || [] }));
        if (showLoading || isNewConversationLoad) targetContainer.innerHTML = '';
        const messagesById = {}; const topLevelMessages = []; messagesData.forEach(msg => { messagesById[msg.id] = { ...msg, replies: [], reactionsData: Array.isArray(msg.reactionsData) ? msg.reactionsData : [] }; });
        messagesData.forEach(msg => { if (msg.parent_message_id && messagesById[msg.parent_message_id]) messagesById[msg.parent_message_id].replies.push(messagesById[msg.id]); else topLevelMessages.push(messagesById[msg.id]); });
        const existingMessageDOMIds = new Set(); if (!isNewConversationLoad && !showLoading) targetContainer.querySelectorAll('.message-wrapper[data-message-id]').forEach(el => existingMessageDOMIds.add(el.dataset.messageId));
        const renderMessage = (msg, isReply = false, depth = 0) => {
            if (!isNewConversationLoad && !showLoading && existingMessageDOMIds.has(msg.id)) { let existingWrapper = targetContainer.querySelector(`.message-wrapper[data-message-id="${msg.id}"]`); if (existingWrapper) existingWrapper.remove(); }
            const messageWrapper = document.createElement('div'); messageWrapper.classList.add('message-wrapper'); messageWrapper.dataset.messageId = msg.id; if (isReply) { messageWrapper.style.marginLeft = (depth * 20) + 'px'; messageWrapper.classList.add('message-reply'); }
            const msgBubble = document.createElement('div'); msgBubble.classList.add('message-bubble');
            const senderName = msg.sender_username || msg.sender_email || (msg.sender_id ? 'User ' + msg.sender_id.substring(0, 6) : 'Unknown'); const msgTime = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            let isCurrentUserSender = currentUser && msg.sender_id === currentUser.id;
            if (isCurrentUserSender) { msgBubble.classList.add('sent'); messageWrapper.classList.add('sent'); } else { msgBubble.classList.add('received'); messageWrapper.classList.add('received'); const senderP = document.createElement('p'); senderP.className = 'msg-sender'; senderP.textContent = document.createTextNode(senderName).textContent; msgBubble.appendChild(senderP); }
            if (isReply && msg.reply_snippet) { const replySnippetDiv = document.createElement('div'); replySnippetDiv.className = 'reply-snippet-bubble'; replySnippetDiv.innerHTML = `↪ ${document.createTextNode(msg.reply_snippet).textContent}`; msgBubble.appendChild(replySnippetDiv); }
            if (msg.content) { const contentP = document.createElement('p'); contentP.innerHTML = document.createTextNode(msg.content).textContent.replace(/\n/g, '<br>'); msgBubble.appendChild(contentP); }
            if (msg.attachment_url && msg.attachment_filename) { const attachmentWrapperDiv = document.createElement('div'); attachmentWrapperDiv.style.marginTop = '8px'; if (msg.attachment_mimetype && msg.attachment_mimetype.startsWith('image/')) { const img = document.createElement('img'); img.src = msg.attachment_url; img.alt = msg.attachment_filename; img.classList.add('message-attachment-image'); img.onclick = () => window.open(msg.attachment_url, '_blank'); attachmentWrapperDiv.appendChild(img); } else { const link = document.createElement('a'); link.href = msg.attachment_url; link.textContent = '📎 ' + document.createTextNode(msg.attachment_filename).textContent; link.target = "_blank"; link.rel = "noopener noreferrer"; link.classList.add('message-attachment-link'); attachmentWrapperDiv.appendChild(link); } msgBubble.appendChild(attachmentWrapperDiv); }
            const timeSpan = document.createElement('span'); timeSpan.className = 'msg-time'; timeSpan.textContent = msgTime; msgBubble.appendChild(timeSpan);
            const actionsDiv = document.createElement('div'); actionsDiv.className = 'message-actions';
            if (currentUser && isUserView) { const replyBtn = document.createElement('button'); replyBtn.innerHTML = '↪️'; replyBtn.title = 'Reply'; replyBtn.className = 'message-action-btn'; replyBtn.onclick = (e) => { e.stopPropagation(); setupReply(msg.id, msg.thread_id || msg.id, senderName, msg.content || 'Attachment'); }; actionsDiv.appendChild(replyBtn); }
            if (currentUser && isUserView) { const reactBtn = document.createElement('button'); reactBtn.innerHTML = '😀'; reactBtn.title = 'Add Reaction'; reactBtn.className = 'message-action-btn'; reactBtn.onclick = (e) => { e.stopPropagation(); const pickedEmoji = prompt("Emoji (e.g., 👍, ❤️, 😂):"); if (pickedEmoji) addReactionToMessage(msg.id, pickedEmoji.trim()); }; actionsDiv.appendChild(reactBtn); }
            if (isUserView && isCurrentUserSender && currentUser) { const userDeleteBtn = document.createElement('button'); userDeleteBtn.innerHTML = '🗑️'; userDeleteBtn.title = 'Delete My Message'; userDeleteBtn.className = 'message-action-btn user-delete-own-message-btn'; userDeleteBtn.dataset.messageId = msg.id; userDeleteBtn.onclick = (e) => { e.stopPropagation(); handleDeleteOwnMessage(msg.id); }; actionsDiv.appendChild(userDeleteBtn); }
            if (isSuperAdmin && isUserAdminView) { const adminDelBtn = document.createElement('button'); adminDelBtn.className = 'admin-delete-message-btn'; adminDelBtn.innerHTML = '×'; adminDelBtn.title = 'Admin Delete Message'; adminDelBtn.onclick = (e) => { e.stopPropagation(); handleDeleteMessageByAdmin(msg.id); }; msgBubble.appendChild(adminDelBtn); }
            if (actionsDiv.hasChildNodes()) msgBubble.appendChild(actionsDiv);
            messageWrapper.appendChild(msgBubble);
            if (msg.reactionsData && msg.reactionsData.length > 0) { const reactionsListDiv = document.createElement('div'); reactionsListDiv.className = 'message-reactions-list'; const aggregatedReactions = msg.reactionsData.reduce((acc, reaction) => { acc[reaction.emoji] = (acc[reaction.emoji] || 0) + 1; return acc; }, {}); for (const emoji in aggregatedReactions) { const reactionItem = document.createElement('span'); reactionItem.className = 'reaction-item'; const userReacted = msg.reactionsData.find(r => r.user_id === currentUser?.id && r.emoji === emoji); if (userReacted) { reactionItem.classList.add('user-reacted'); reactionItem.onclick = () => removeReactionFromMessage(msg.id, emoji); reactionItem.title = "Click to remove your reaction"; } else { reactionItem.onclick = () => addReactionToMessage(msg.id, emoji); reactionItem.title = "React with " + emoji; } reactionItem.innerHTML = `<span class="reaction-emoji">${emoji}</span> <span class="reaction-count">${aggregatedReactions[emoji]}</span>`; reactionsListDiv.appendChild(reactionItem); } messageWrapper.appendChild(reactionsListDiv); }
            targetContainer.appendChild(messageWrapper);
            if (msg.replies && msg.replies.length > 0) msg.replies.forEach(replyMsg => renderMessage(replyMsg, true, depth + 1));
        };
        topLevelMessages.forEach(msg => renderMessage(msg, false, 0));
        if (isNewConversationLoad || showLoading || messagesData.length > 0) targetContainer.scrollTop = targetContainer.scrollHeight;
    }
    catch (error) { console.error("Error fetching/rendering messages for conversation " + conversationId + ":", error); if (showLoading || isNewConversationLoad && targetContainer) targetContainer.innerHTML = '<p style="color:red;">Could not load messages. Details: ' + error.message + '</p>'; }
}

async function handleDeleteOwnMessage(messageId) {
    if (!currentUser) { showToast("Please log in.", "error"); return; } if (!messageId) { showToast("Message ID missing.", "error"); return; }
    if (!confirm("Are you sure you want to delete your message?")) return;
    showToast("Deleting your message...", "info");
    try {
        const { data: messageToDelete, error: fetchError } = await supabaseClient.from('messages').select('sender_id, attachment_url, conversation_id').eq('id', messageId).single();
        if (fetchError) { if (fetchError.code === 'PGRST116') { showToast("Message already deleted.", "warning"); return; } throw new Error("Fetch error: " + fetchError.message); }
        if (messageToDelete.sender_id !== currentUser.id) { showToast("You can only delete your own messages.", "error"); return; }
        const { error: deleteMsgError } = await supabaseClient.from('messages').delete().eq('id', messageId).eq('sender_id', currentUser.id);
        if (deleteMsgError) throw deleteMsgError;
        if (messageToDelete.attachment_url) {
            try {
                const bucketName = STORAGE_BUCKET_NAME; const storageBaseUrlPattern = new RegExp("https://[^/]+.supabase.co/storage/v1/object/public/" + bucketName + "/"); let pathInBucketToDelete = messageToDelete.attachment_url.replace(storageBaseUrlPattern, ""); if (pathInBucketToDelete && pathInBucketToDelete !== messageToDelete.attachment_url) {
                    pathInBucketToDelete = decodeURIComponent(pathInBucketToDelete); const { error: storageError } = await supabaseClient.storage.from(bucketName).remove([pathInBucketToDelete]); if (storageError && storageError.statusCode !== '404') console.warn("Failed to delete attachment:", storageError.message);
                }
            } catch (e) { console.warn("Error deleting attachment:", e); }
        }
        showToast("Your message has been deleted.", "success"); trackGAEvent('user_delete_own_message', { message_id: messageId, conversation_id: messageToDelete.conversation_id });
        if (currentOpenConversationId && currentOpenConversationId === messageToDelete.conversation_id) fetchMessagesForConversation(currentOpenConversationId, false, true);
        if (messagesView.style.display === 'block') fetchUserConversations();
    }
    catch (error) { console.error("Error deleting own message:", error); showToast("Error deleting message: " + error.message, "error"); }
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
                const bucketName = STORAGE_BUCKET_NAME; const storageBaseUrlPattern = new RegExp("https://[^/]+.supabase.co/storage/v1/object/public/" + bucketName + "/"); let pathInBucketToDelete = msgToDelete.attachment_url.replace(storageBaseUrlPattern, ""); if (pathInBucketToDelete && pathInBucketToDelete !== messageToDelete.attachment_url) {
                    pathInBucketToDelete = decodeURIComponent(pathInBucketToDelete); const { error: storageError } = await supabaseClient.storage.from(bucketName).remove([pathInBucketToDelete]); if (storageError && storageError.statusCode !== '404') console.warn("Admin: Failed to delete attachment from storage:", storageError.message);
                }
            } catch (e) { console.warn("Admin: Error processing attachment deletion:", e); }
        }
        showToast("Admin: Message deleted.", "success"); trackGAEvent('admin_delete_message', { message_id: messageId, conversation_id: msgToDelete.conversation_id });
        if (currentOpenConversationId && currentOpenConversationId === msgToDelete.conversation_id) fetchMessagesForAdminChat(currentOpenConversationId);
        if (adminMessagesView.style.display === 'block') fetchAllConversationsForAdmin();
    }
    catch (error) { console.error("Admin: Error deleting message:", error); showToast('Admin: Delete Error: ' + error.message, "error"); }
}

async function showAdminMessagesView() {
    if (!isSuperAdmin) { showToast("Access denied.", "error"); return; }
    if (mainListingsView) mainListingsView.style.display = 'none'; if (itemDetailView) itemDetailView.style.display = 'none'; if (messagesView) messagesView.style.display = 'none'; if (adminUserManagementView) adminUserManagementView.style.display = 'none';
    if (adminMessagesView) adminMessagesView.style.display = 'block'; if (adminMessageChatPanel) adminMessageChatPanel.style.display = 'none';
    trackPageView('/admin/all-messages', 'Admin - All Conversations'); fetchAllConversationsForAdmin();
}

async function fetchAllConversationsForAdmin() {
    if (!isSuperAdmin || !adminConversationsList) return; adminConversationsList.innerHTML = '<p class="loading-text">Loading all site conversations...</p>';
    try {
        const { data: conversations, error } = await supabaseClient.from('admin_conversations_overview').select('*').order('conversation_updated_at', { ascending: false });
        if (error) throw error; adminConversationsList.innerHTML = '';
        if (conversations && conversations.length > 0) {
            conversations.forEach(convo => {
                const convoItem = document.createElement('div'); convoItem.className = 'conversation-item admin-convo-item'; convoItem.dataset.conversationId = convo.conversation_id;
                let participantsText = "Unknown Participants"; if (convo.participants_profiles && Array.isArray(convo.participants_profiles)) { participantsText = convo.participants_profiles.map(p => p.username || p.email || 'User ' + (p.user_id ? p.user_id.substring(0, 6) : '')).join(' & '); }
                const listingName = convo.listing_name || 'General Chat'; let lastMsgPreview = convo.last_message_content || 'No messages yet...';
                if (convo.attachment_filename) { lastMsgPreview = '📎 ' + convo.attachment_filename; } else if (lastMsgPreview.length > 30) { lastMsgPreview = lastMsgPreview.substring(0, 27) + "..."; }
                const lastActivityDate = convo.conversation_updated_at ? new Date(convo.conversation_updated_at).toLocaleString() : 'N/A';
                convoItem.innerHTML = '<p class="convo-user"><strong>Participants:</strong> ' + document.createTextNode(participantsText).textContent + '</p><p class="convo-listing">Re: ' + document.createTextNode(listingName).textContent + '</p><p class="convo-last-message"><em>' + document.createTextNode(lastMsgPreview).textContent + '</em></p><small>Last Activity: ' + lastActivityDate + '</small>';
                convoItem.addEventListener('click', () => { if (adminMessageChatPanel) adminMessageChatPanel.style.display = 'flex'; if (adminChatWithInfo) adminChatWithInfo.textContent = 'Viewing: ' + participantsText; currentOpenConversationId = convo.conversation_id; fetchMessagesForAdminChat(convo.conversation_id); document.querySelectorAll('#adminConversationsListInner .conversation-item').forEach(item => item.classList.toggle('active-conversation', item.dataset.conversationId === convo.conversation_id)); });
                adminConversationsList.appendChild(convoItem);
            });
        } else { adminConversationsList.innerHTML = '<p>No conversations found on the site.</p>'; }
    }
    catch (error) { console.error("Error fetching all conversations for admin:", error); adminConversationsList.innerHTML = '<p style="color:red;">Could not load conversations.</p>'; }
}

async function fetchMessagesForAdminChat(conversationId) {
    if (!adminMessagesContainer || !conversationId) return;
    try { await fetchMessagesForConversation(conversationId, true, true); }
    catch (error) { console.error("Error in fetchMessagesForAdminChat wrapper for convo " + conversationId + ":", error); adminMessagesContainer.innerHTML = '<p style="color:red;">Could not load admin messages.</p>'; }
}

function showAdminUserManagementView() {
    if (!isSuperAdmin) { showToast("Access denied.", "error"); return; }
    if (mainListingsView) mainListingsView.style.display = 'none'; if (itemDetailView) itemDetailView.style.display = 'none'; if (messagesView) messagesView.style.display = 'none'; if (adminMessagesView) adminMessagesView.style.display = 'none';
    if (adminUserManagementView) adminUserManagementView.style.display = 'block';
    trackPageView('/admin/users', 'Admin - User Management'); fetchAllUsersForAdmin();
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
        else { showToast(resultMessage, "success"); fetchAllUsersForAdmin(adminUserSearch.value.trim()); }
    }
    catch (e) { console.error("Error during invite:", e); showToast("Error sending invite: " + e.message, "error"); }
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
    }
    catch (e) { console.error("Error during password reset:", e); showToast("Error sending password reset: " + e.message, "error"); }
}

async function openAdminManageUserBlocksModal(userId, userName) {
    if (!isSuperAdmin) return; currentManagingBlocksForUserId = userId; currentManagingBlocksForUserName = userName;
    if (manageBlocksForUserName) manageBlocksForUserName.textContent = userName; if (manageBlocksForUserId) manageBlocksForUserId.textContent = userId.substring(0, 12) + '...';
    adminBlockUserForm.querySelectorAll('.user-name-placeholder').forEach(el => el.textContent = userName.split('@')[0] || "This user");
    if (blockerAdminActionUserId) blockerAdminActionUserId.value = userId; if (targetUserToBlockIdentifier) { targetUserToBlockIdentifier.value = ''; targetUserToBlockIdentifier.dataset.selectedTargetId = ''; }
    if (adminBlockTargetSearchResults) adminBlockTargetSearchResults.innerHTML = '<p>Start typing to search for target user...</p>';
    if (targetUserToBlockIdentifier && !targetUserToBlockIdentifier.listenerAttached) {
        targetUserToBlockIdentifier.addEventListener('input', (e) => {
            clearTimeout(targetUserToBlockIdentifier.searchTimeout); targetUserToBlockIdentifier.searchTimeout = setTimeout(() => { populateAdminBlockTargetList(e.target.value.trim(), currentManagingBlocksForUserId); }, 400);
        }); targetUserToBlockIdentifier.listenerAttached = true;
    }
    showModal(adminManageUserBlocksModal); await loadAdminUserBlockLists(userId);
}

async function loadAdminUserBlockLists(userIdToListBlocksFor) {
    if (!isSuperAdmin || !userIdToListBlocksFor) return;
    if (adminCurrentUserBlocksList) adminCurrentUserBlocksList.innerHTML = '<p class="loading-text">Loading...</p>'; if (adminBlockedByOthersList) adminBlockedByOthersList.innerHTML = '<p class="loading-text">Loading...</p>';
    try {
        const { data: allBlocksForUser, error: rpcError } = await supabaseClient.rpc('get_admin_user_message_blocks_with_profiles', { p_user_id_to_filter: userIdToListBlocksFor });
        if (rpcError) throw new Error('Error fetching block details: ' + rpcError.message);
        const blocksInitiatedByThisUser = allBlocksForUser.filter(b => b.blocker_id === userIdToListBlocksFor); const blocksTargetingThisUser = allBlocksForUser.filter(b => b.blocked_id === userIdToListBlocksFor);
        if (adminCurrentUserBlocksList) {
            adminCurrentUserBlocksList.innerHTML = ''; if (blocksInitiatedByThisUser.length > 0) {
                blocksInitiatedByThisUser.forEach(block => {
                    const blockedName = block.blocked_username || block.blocked_email || block.blocked_id.substring(0, 8) + '...'; const item = document.createElement('div'); item.classList.add('block-item'); item.innerHTML = '<span>Blocked from messaging: <strong>' + document.createTextNode(blockedName).textContent + '</strong></span>'; const unblockBtn = document.createElement('button'); unblockBtn.textContent = 'Unblock'; unblockBtn.classList.add('button-success', 'button-small'); unblockBtn.onclick = async () => { if (confirm('Remove admin block preventing ' + currentManagingBlocksForUserName + ' from messaging ' + blockedName + '?')) { await adminManageBlock('unblock', userIdToListBlocksFor, block.blocked_id); await loadAdminUserBlockLists(userIdToListBlocksFor); } }; item.appendChild(unblockBtn); adminCurrentUserBlocksList.appendChild(item);
                });
            } else adminCurrentUserBlocksList.innerHTML = '<p>This user is not currently admin-blocking anyone.</p>';
        }
        if (adminBlockedByOthersList) {
            adminBlockedByOthersList.innerHTML = ''; if (blocksTargetingThisUser.length > 0) {
                blocksTargetingThisUser.forEach(block => {
                    const blockerName = block.blocker_username || block.blocker_email || block.blocker_id.substring(0, 8) + '...'; const item = document.createElement('div'); item.classList.add('block-item'); item.innerHTML = '<span>User <strong>' + document.createTextNode(blockerName).textContent + '</strong> is blocked from messaging this user.</span>'; const unblockBtn = document.createElement('button'); unblockBtn.textContent = 'Unblock ' + document.createTextNode(blockerName).textContent.substring(0, 10) + '...'; unblockBtn.classList.add('button-success', 'button-small'); unblockBtn.onclick = async () => { if (confirm('Remove admin block preventing ' + blockerName + ' from messaging ' + currentManagingBlocksForUserName + '?')) { await adminManageBlock('unblock', block.blocker_id, userIdToListBlocksFor); await loadAdminUserBlockLists(userIdToListBlocksFor); } }; item.appendChild(unblockBtn); adminBlockedByOthersList.appendChild(item);
                });
            } else adminBlockedByOthersList.innerHTML = '<p>No users are currently admin-blocked from messaging this user.</p>';
        }
    }
    catch (error) { console.error('Error loading user block lists:', error); let toastMessage = "Error loading block details: " + error.message; if (error.message && error.message.toUpperCase().includes("ACCESS DENIED")) toastMessage = "Access Denied: Not authorized to view block details."; if (adminCurrentUserBlocksList) adminCurrentUserBlocksList.innerHTML = '<p style="color:red;">' + toastMessage + '</p>'; if (adminBlockedByOthersList) adminBlockedByOthersList.innerHTML = '<p style="color:red;">' + toastMessage + '</p>'; showToast(toastMessage, "error"); }
}

async function handleAdminBlockUserFromTarget(event) {
    event.preventDefault(); if (!isSuperAdmin || !currentUser || !currentManagingBlocksForUserId) return;
    const userToBlockId = blockerAdminActionUserId.value; const targetUserIdentifier = targetUserToBlockIdentifier.value.trim(); const selectedTargetId = targetUserToBlockIdentifier.dataset.selectedTargetId;
    if (!targetUserIdentifier && !selectedTargetId) { showToast("Please enter or select the target user.", "warning"); return; }
    if (userToBlockId !== currentManagingBlocksForUserId) { showToast("User ID mismatch. Reopen and try again.", "error"); return; }
    let resolvedTargetUserId = selectedTargetId; let targetUserDisplayName = targetUserIdentifier;
    try {
        if (!resolvedTargetUserId && targetUserIdentifier) {
            const { data: users, error: searchError } = await supabaseClient.rpc('search_profiles_for_admin_block_target', { p_search_term: targetUserIdentifier, p_exclude_user_id: userToBlockId }); if (searchError) throw searchError; if (!users || users.length === 0) { showToast("Target user ('" + targetUserIdentifier + "') not found.", "error"); return; } const targetProfile = users.find(u => u.profile_email === targetUserIdentifier || u.auth_user_email === targetUserIdentifier || u.profile_username === targetUserIdentifier) || users[0]; resolvedTargetUserId = targetProfile.profile_id; targetUserDisplayName = targetProfile.profile_username || targetProfile.auth_user_email || targetProfile.profile_email;
        }
        else if (resolvedTargetUserId && !targetUserIdentifier.includes('@')) { const { data: targetProfileData, error: profileError } = await supabaseClient.from('profiles').select('id, username, email').eq('id', resolvedTargetUserId).maybeSingle(); if (profileError) throw profileError; if (targetProfileData) targetUserDisplayName = targetProfileData.username || targetProfileData.email || targetUserIdentifier; }
        if (resolvedTargetUserId === userToBlockId) { showToast("Cannot make a user block themselves.", "warning"); return; }
        if (confirm('PREVENT "' + currentManagingBlocksForUserName + '" from sending messages TO "' + targetUserDisplayName + '"?')) { await adminManageBlock('block', userToBlockId, resolvedTargetUserId); await loadAdminUserBlockLists(userToBlockId); if (adminBlockUserForm) adminBlockUserForm.reset(); if (targetUserToBlockIdentifier) targetUserToBlockIdentifier.dataset.selectedTargetId = ''; if (adminBlockTargetSearchResults) adminBlockTargetSearchResults.innerHTML = '<p>Start typing to search...</p>'; }
    }
    catch (error) { showToast("Error finding target user or processing block: " + error.message, "error"); }
}

async function adminManageBlock(action, userToActOnId, targetUserId) {
    if (!isSuperAdmin || !currentUser) return; showToast("Processing " + action + " request...", "info");
    try {
        const { data, error } = await supabaseClient.functions.invoke('admin-manage-message-block', { body: { action: action, userToActOnId: userToActOnId, targetUserId: targetUserId, callerUserId: currentUser.id } });
        if (error) throw new Error(error.message || "Failed to " + action + " user via Edge Function.");
        let resultMessage = (data && data.message) ? data.message : "Action completed.";
        let errorOccurred = (data && data.error) ? true : false;
        if (errorOccurred) resultMessage = data.error;

        showToast(resultMessage, errorOccurred ? "error" : "success");
        if (currentManagingBlocksForUserId && (currentManagingBlocksForUserId === userToActOnId || currentManagingBlocksForUserId === targetUserId)) await loadAdminUserBlockLists(currentManagingBlocksForUserId);
    }
    catch (e) { console.error("Error during admin " + action + " user:", e); showToast("Error: " + e.message, "error"); }
}

async function populateAdminBlockTargetList(searchTerm, userThatWillBeBlockedId) {
    if (!adminBlockTargetSearchResults || !isSuperAdmin) return; if (!searchTerm.trim()) { adminBlockTargetSearchResults.innerHTML = '<p>Start typing to search for target user...</p>'; targetUserToBlockIdentifier.dataset.selectedTargetId = ''; return; }
    adminBlockTargetSearchResults.innerHTML = '<p class="loading-text">Searching...</p>'; targetUserToBlockIdentifier.dataset.selectedTargetId = '';
    try {
        const { data: users, error } = await supabaseClient.rpc('search_profiles_for_admin_block_target', { p_search_term: searchTerm, p_exclude_user_id: userThatWillBeBlockedId });
        if (error) throw error; adminBlockTargetSearchResults.innerHTML = '';
        if (users && users.length > 0) {
            users.forEach(user_data => {
                const itemDiv = document.createElement('div'); itemDiv.classList.add('user-select-item'); const targetActualAuthId = user_data.user_id_from_auth; const targetDisplayName = user_data.profile_username || user_data.auth_user_email || user_data.profile_email || 'User ID: ' + targetActualAuthId.substring(0, 8); const displayEmailInParen = user_data.auth_user_email || user_data.profile_email; itemDiv.textContent = targetDisplayName + (displayEmailInParen ? ' (' + displayEmailInParen + ')' : ''); itemDiv.addEventListener('click', () => { if (targetUserToBlockIdentifier) { targetUserToBlockIdentifier.value = targetDisplayName; targetUserToBlockIdentifier.dataset.selectedTargetId = targetActualAuthId; } adminBlockTargetSearchResults.innerHTML = '<p>Selected: <strong>' + document.createTextNode(targetDisplayName).textContent + '</strong>. Click form button to block.</p>'; }); adminBlockTargetSearchResults.appendChild(itemDiv);
            });
        }
        else adminBlockTargetSearchResults.innerHTML = '<p>No users found matching search.</p>';
    }
    catch (e) { console.error("Error populating admin block target list:", e); let errorMessage = "Error loading users: " + (e.message || "Unknown error"); adminBlockTargetSearchResults.innerHTML = '<p style="color:red;">' + errorMessage + '</p>'; }
}

async function populateSelectUserToMessageModalList(searchTerm = '') {
    if (!selectUserToMessageList || !currentUser) return; selectUserToMessageList.innerHTML = '<p class="loading-text">Searching users...</p>';
    try {
        const { data: users, error } = await supabaseClient.rpc('search_profiles_for_new_conversation', { p_search_term: searchTerm, p_current_user_id: currentUser.id });
        if (error) throw error; selectUserToMessageList.innerHTML = '';
        if (users && users.length > 0) {
            users.forEach(user_data => {
                const itemDiv = document.createElement('div'); itemDiv.classList.add('user-select-item'); const targetActualAuthId = user_data.user_id_from_auth; const targetDisplayName = user_data.profile_username || user_data.auth_user_email || user_data.profile_email || 'User ID: ' + targetActualAuthId.substring(0, 8); const userInfoDiv = document.createElement('div'); userInfoDiv.classList.add('user-select-item-info'); const nameSpan = document.createElement('span'); nameSpan.classList.add('name'); nameSpan.textContent = targetDisplayName; userInfoDiv.appendChild(nameSpan); const emailSpan = document.createElement('span'); emailSpan.classList.add('email'); const displayEmailInParen = user_data.auth_user_email || user_data.profile_email; emailSpan.textContent = ' (' + displayEmailInParen + ')'; userInfoDiv.appendChild(emailSpan); itemDiv.appendChild(userInfoDiv); itemDiv.addEventListener('click', async () => { hideModal(selectUserToMessageModal); await actuallyStartGeneralConversation(targetActualAuthId, targetDisplayName); }); selectUserToMessageList.appendChild(itemDiv);
            });
        }
        else selectUserToMessageList.innerHTML = '<p>No users found.</p>';
    }
    catch (e) { console.error("Error populating user selection list:", e); let errorMessage = "Error loading users: " + (e.message || "Unknown error"); selectUserToMessageList.innerHTML = '<p style="color:red;">' + errorMessage + '</p>'; }
}

async function actuallyStartGeneralConversation(targetUserId, targetUserName) {
    if (!currentUser || !targetUserId) return; if (targetUserId === currentUser.id) { showToast("You cannot start a conversation with yourself.", "info"); return; }
    showToast("Looking for or creating conversation with " + targetUserName + "...", "info");
    try {
        const { data: convoData, error: rpcError } = await supabaseClient.rpc('get_or_create_conversation', { user1_id: currentUser.id, user2_id: targetUserId, p_listing_id: null });
        if (rpcError) throw rpcError;
        if (convoData && convoData.length > 0 && convoData[0].id) {
            const convoId = convoData[0].id;
            const otherUserNameSlug = (targetUserName || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const newPath = `/messages/conversation/${otherUserNameSlug}-${convoId}`;
            window.history.pushState({ conversationId: convoId, path: newPath }, `Chat with ${targetUserName} - Cleveland Marketplace`, newPath);
            showMessagesView();
            openConversation(convoId, targetUserName, "General Chat");
            trackGAEvent('start_general_conversation', { to_user_id: targetUserId });
        }
        else showToast("Could not start or find conversation. One of the users might be blocked or an error occurred.", "error");
    }
    catch (error) { console.error("Error in actuallyStartGeneralConversation:", error); showToast('Error: ' + error.message, "error"); }
}

function openSelectUserToMessageModal() {
    if (selectUserToMessageSearch) selectUserToMessageSearch.value = ''; if (selectUserToMessageList) selectUserToMessageList.innerHTML = '<p class="loading-text">Start typing to search for users...</p>';
    showModal(selectUserToMessageModal);
}

async function handleSupportChatClick() {
    if (!currentUser) { showToast("Please log in to chat with support.", "info"); showModal(loginModal); return; }
    if (!SUPERADMIN_USER_ID || SUPERADMIN_USER_ID === 'YOUR_SUPERADMIN_UUID_HERE') { showToast("Support chat is currently unavailable.", "error"); console.error("SUPERADMIN_USER_ID not configured."); return; }
    if (currentUser.id === SUPERADMIN_USER_ID) { showToast("Opening your message center...", "info"); showMessagesView(); return; }

    // Determine current page path
    const currentPath = window.location.pathname;

    // If already on index.html, proceed with opening chat
    if (currentPath === '/' || currentPath === '/index.html') {
        showToast("Connecting to support...", "info");
        try {
            const { data: convoData, error: rpcError } = await supabaseClient.rpc('get_or_create_conversation', { user1_id: currentUser.id, user2_id: SUPERADMIN_USER_ID, p_listing_id: null });
            if (rpcError) throw rpcError;
            if (convoData && convoData.length > 0 && convoData[0].id) {
                const convoId = convoData[0].id;
                const newPath = `/messages/conversation/support-inquiry-${convoId}`;
                window.history.pushState({ conversationId: convoId, path: newPath }, `Support Chat - Cleveland Marketplace`, newPath);
                showMessagesView();
                openConversation(convoId, "Support Team", "Support Inquiry");
                trackGAEvent('start_support_chat');
            }
            else showToast("Could not connect to support. They might be blocked or an error occurred.", "error");
        }
        catch (error) { console.error("Error initiating support chat:", error); showToast('Error connecting to support: ' + error.message, "error"); }
    } else {
        // If on another page (terms.html, privacy.html), redirect to index.html with a support chat deep link
        showToast("Redirecting to main page for support chat...", "info");
        window.location.href = '/index.html#messages?conversationId=support'; // Use a special hash or query for support
    }
}

/**
 * Extracts the item ID from a clean URL path like /listing/123 or /listing/item-name-123.
 * @returns {string|null} The item ID (UUID) or null if not found.
 */
function getItemIdFromPath() {
    const path = window.location.pathname;
    const parts = path.split('/');
    if (parts[1] === 'listing' && parts.length > 2) {
        const lastPart = parts[parts.length - 1];
        const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
        const idMatch = lastPart.match(uuidRegex);
        return idMatch ? idMatch[1] : null;
    }
    return null;
}

/**
 * Extracts the conversation ID from a clean URL path like /messages/conversation/topic-slug-UUID.
 * @returns {string|null} The conversation ID (UUID) or null if not found.
 */
function getConversationIdFromPath() {
    const path = window.location.pathname;
    const parts = path.split('/');
    if (parts[1] === 'messages' && parts[2] === 'conversation' && parts.length > 3) {
        const lastPart = parts[parts.length - 1];
        const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
        const idMatch = lastPart.match(uuidRegex);
        return idMatch ? idMatch[1] : null;
    }
    return null;
}


/**
 * Stores initial deep link parameters from URL path or hash.
 * This is called once on DOMContentLoaded.
 */
function storeInitialDeepLink() {
    initialDeepLinkItemId = null;
    initialDeepLinkPath = null;
    initialDeepLinkConversationId = null;

    const itemIdFromPath = getItemIdFromPath();
    if (itemIdFromPath) {
        initialDeepLinkItemId = itemIdFromPath;
        initialDeepLinkPath = '/itemDetail';
        console.log("Deep link to item stored:", initialDeepLinkItemId);
        return;
    }

    const convoIdFromPath = getConversationIdFromPath();
    if (convoIdFromPath) {
        initialDeepLinkConversationId = convoIdFromPath;
        initialDeepLinkPath = '/messages';
        console.log("Deep link to conversation stored:", initialDeepLinkConversationId);
        return;
    }

    // Handle hash-based deep links as fallback/alternative for messages (e.g., /index.html#messages?conversationId=support)
    const hash = window.location.hash;
    if (hash.startsWith('#messages')) {
        // Check for specific conversation ID
        if (hash.includes('conversationId=')) {
            const urlParams = new URLSearchParams(hash.split('?')[1]);
            const convoId = urlParams.get('conversationId');
            if (convoId) {
                // If it's a special support ID, convert to SUPERADMIN_USER_ID
                if (convoId === 'support') {
                    if (SUPERADMIN_USER_ID && SUPERADMIN_USER_ID !== 'YOUR_SUPERADMIN_UUID_HERE') {
                        initialDeepLinkConversationId = SUPERADMIN_USER_ID; // Use superadmin ID for support chat
                        console.log("Deep link to support conversation via hash stored.");
                    } else {
                        console.warn("Support deep link attempted but SUPERADMIN_USER_ID not configured.");
                    }
                } else {
                    initialDeepLinkConversationId = convoId;
                    console.log("Hash-based deep link to conversation stored:", initialDeepLinkConversationId);
                }
            }
        }
        // Even if no specific conversationId, if it's #messages, we want to go to the messages view
        initialDeepLinkPath = '/messages';
    }
}


/**
 * Handles navigation to deep-linked content after authentication state is known.
 * This is called on initial load and after auth state changes (login, logout, 2FA verify).
 */
async function handleDeepLinkAfterLogin() {
    if (initialDeepLinkPath) {
        if (loginTwoFactorAuthModal && loginTwoFactorAuthModal.style.display === 'flex') {
            console.log("handleDeepLinkAfterLogin: 2FA modal is open, deferring deep link resolution.");
            return;
        }

        if (!currentUser) {
            console.log(`handleDeepLinkAfterLogin: User not logged in, prompting login for deep link: ${initialDeepLinkPath}`);
            // Hide all current main views to prevent mixed content/RLS errors
            if (mainListingsView) mainListingsView.style.display = 'none';
            if (itemDetailView) itemDetailView.style.display = 'none';
            if (messagesView) messagesView.style.display = 'none';
            if (adminMessagesView) adminMessagesView.style.display = 'none';
            if (adminUserManagementView) adminUserManagementView.style.display = 'none';

            showModal(loginModal);
            showToast(`Please log in to view this ${initialDeepLinkPath === '/itemDetail' ? 'item' : 'conversation'}.`, "info");
            return;
        }

        console.log(`handleDeepLinkAfterLogin: User logged in, resolving deep link: ${initialDeepLinkPath}`);

        if (initialDeepLinkPath === '/itemDetail' && initialDeepLinkItemId) {
            // Hide all other main views if not already hidden
            if (mainListingsView) mainListingsView.style.display = 'none';
            if (messagesView) messagesView.style.display = 'none';
            if (adminMessagesView) adminMessagesView.style.display = 'none';
            if (adminUserManagementView) adminUserManagementView.style.display = 'none';

            await showItemDetailPage(initialDeepLinkItemId);

            // After successful display, clear the deep link state
            initialDeepLinkItemId = null;
            initialDeepLinkPath = null;
            initialDeepLinkConversationId = null; // Ensure message deep link is cleared too if any

        } else if (initialDeepLinkPath === '/messages') { // Handle general /messages path and specific conversation deep links
            // Hide all other main views if not already hidden
            if (mainListingsView) mainListingsView.style.display = 'none';
            if (itemDetailView) itemDetailView.style.display = 'none';
            if (adminMessagesView) adminMessagesView.style.display = 'none';
            if (adminUserManagementView) adminUserManagementView.style.display = 'none';

            // Make sure messages view is shown before trying to open conversation
            showMessagesView(true); // Pass true to indicate it's from deep link/initial load

            if (initialDeepLinkConversationId) {
                // If the deep link is for the SUPERADMIN_USER_ID (support chat)
                if (initialDeepLinkConversationId === SUPERADMIN_USER_ID) {
                    await handleSupportChatClick(); // This will trigger the RPC and open the support chat
                } else {
                    // It's a regular conversation ID
                    // Allow conversations list to load, then find and open the specific convo
                    let convoItemElement = document.querySelector('#conversationsListInner .conversation-item[data-conversation-id="' + initialDeepLinkConversationId + '"]');
                    let attempts = 0;
                    const maxAttempts = 10;
                    while (!convoItemElement && attempts < maxAttempts) {
                        console.log('Deep link message: Convo item not found, attempt ' + (attempts + 1));
                        await fetchUserConversations(); // Re-fetch to ensure it's in the list
                        await new Promise(resolve => setTimeout(resolve, 500)); // Wait a bit
                        convoItemElement = document.querySelector('#conversationsListInner .conversation-item[data-conversation-id="' + initialDeepLinkConversationId + '"]');
                        attempts++;
                    }

                    if (convoItemElement) {
                        const otherUserName = convoItemElement.dataset.otherUserNameDisplay || "User";
                        const topicName = convoItemElement.dataset.topicName || "Details";
                        openConversation(initialDeepLinkConversationId, otherUserName, topicName);
                        // If it was a hash-based deep link to a specific conversation, update the URL to clean one.
                        // If it was already a clean URL, no need to replaceState.
                        const currentPathname = window.location.pathname;
                        const otherUserNameSlug = (otherUserName || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                        const topicSlug = (topicName || 'chat').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                        const expectedFriendlyPath = `/messages/conversation/${topicSlug}-${otherUserNameSlug}-${initialDeepLinkConversationId}`;
                        if (currentPathname !== expectedFriendlyPath) {
                            window.history.replaceState({ conversationId: initialDeepLinkConversationId, path: expectedFriendlyPath }, document.title, expectedFriendlyPath);
                        }
                    } else {
                        showToast("Could not open specific conversation from link.", "warning");
                        console.warn("Deep link: Convo item for ID " + initialDeepLinkConversationId + " not found even after login.");
                        // Fallback to general messages view if specific convo not found
                        if (messagesView.style.display !== 'block') showMessagesView(true);
                    }
                }
            }
            // Clear deep link state after handling
            initialDeepLinkConversationId = null;
            initialDeepLinkPath = null;
            initialDeepLinkItemId = null;

        } else {
            console.log("handleDeepLinkAfterLogin: Deep link type not recognized or ID missing.");
            // If we somehow got here with a path but no valid ID, just show listings
            if (mainListingsView) mainListingsView.style.display = 'block';
            if (itemDetailView) itemDetailView.style.display = 'none';
            if (messagesView) messagesView.style.display = 'none';
            if (adminMessagesView) adminMessagesView.style.display = 'none';
            if (adminUserManagementView) adminUserManagementView.style.display = 'none';
            // Clear any lingering deep link state
            initialDeepLinkItemId = null;
            initialDeepLinkPath = null;
            initialDeepLinkConversationId = null;
        }
    } else {
        // No deep link present from initial load or previous navigation.
        // Ensure main listings view is visible and other views are hidden.
        if (mainListingsView && mainListingsView.style.display !== 'block') {
            mainListingsView.style.display = 'block';
            if (itemDetailView) itemDetailView.style.display = 'none';
            if (messagesView) messagesView.style.display = 'none';
            if (adminMessagesView) adminMessagesView.style.display = 'none';
            if (adminUserManagementView) adminUserManagementView.style.display = 'none';
        }
        // Ensure no leftover deep link state if we're explicitly navigating to home.
        initialDeepLinkItemId = null;
        initialDeepLinkPath = null;
        initialDeepLinkConversationId = null;
    }
}


function assignGlobalDOMElements() {
    postItemBtnGlobal = getElement('postItemBtn'); listingsContainer = getElement('listingsContainer'); searchBar = getElement('searchBar'); loadMoreBtn = getElement('loadMoreBtn'); loadMoreContainer = document.querySelector('.load-more-container'); toastNotification = getElement('toastNotification'); minPriceInput = getElement('minPrice'); maxPriceInput = getElement('maxPrice'); filterFreeItemsCheckbox = getElement('filterFreeItems'); sortListingsSelect = getElement('sortListings'); applyFiltersBtn = getElement('applyFiltersBtn'); postItemModal = getElement('postItemModal'); closePostModalBtn = document.querySelector('#postItemModal .close-button'); postItemForm = getElement('postItemForm'); postItemNameField = getElement('post_itemName'); postItemDescriptionField = getElement('post_itemDescription'); postItemPriceField = getElement('postItemPriceField'); postItemFreeCheckbox = getElement('postItemFreeCheckbox'); postImageSourceFileRadio = getElement('postImageSourceFile'); postImageSourceUrlRadio = getElement('postImageSourceUrl'); postImageFileUploadContainer = getElement('postImageFileUploadContainer'); postItemImageFileField = getElement('post_itemImageFile'); postItemImagePreview = getElement('postItemImagePreview'); postItemImageUrlContainer = getElement('postItemImageUrlContainer'); postItemImageUrlField = getElement('post_itemImageUrlField'); postItemContactField = getElement('post_itemContact'); editItemModal = getElement('editItemModal'); closeEditModalBtn = document.querySelector('#editItemModal .close-button'); editItemForm = getElement('editItemForm'); editItemIdField = getElement('editItemId'); editItemOwnerIdField = getElement('editItemOwnerId'); editItemOriginalImageUrlField = getElement('editItemOriginalImageUrl'); editModalItemNameField = getElement('edit_itemName'); editModalItemDescriptionField = getElement('edit_itemDescription'); editModalItemPriceField = getElement('editItemPriceField'); editModalItemFreeCheckbox = getElement('editItemFreeCheckbox'); editModalItemContactField = getElement('edit_itemContact'); editItemCurrentImage = getElement('editItemCurrentImage');
    editImageSourceNoneRadio = getElement('editImageSourceNone'); editImageSourceFileRadio_Edit = getElement('editImageSourceFile_Edit'); editImageSourceUrlRadio_Edit = getElement('editImageSourceUrl_Edit'); editImageFileUploadContainer_Edit = getElement('editImageFileUploadContainer_Edit'); editNewImageFileField = getElement('edit_newImageFile'); editItemNewImagePreview = getElement('editItemNewImagePreview'); editItemImageUrlContainer_Edit = getElement('editItemImageUrlContainer_Edit'); editNewImageUrlField = getElement('edit_newImageUrlField'); loginBtn = getElement('loginBtn'); signupBtn = getElement('signupBtn'); messagesHeaderBtn = getElement('messagesHeaderBtn'); logoutBtnHeader = getElement('logoutBtnHeader');
    editProfileBtn = getElement('editProfileBtn'); signupModal = getElement('signupModal'); closeSignupModalBtn = document.querySelector('#signupModal .close-button'); signupForm = getElement('signupForm'); signupDisplayNameField = getElement('signupDisplayName'); signupPhoneNumberField = getElement('signupPhoneNumber'); signupMessage = getElement('signupMessage'); loginModal = getElement('loginModal'); closeLoginModalBtn = document.querySelector('#loginModal .close-button'); loginForm = getElement('loginForm'); loginMessage = getElement('loginMessage'); switchToSignupLink = getElement('switchToSignupLink'); switchToLoginLink = getElement('switchToLoginLink'); forgotPasswordLink = getElement('forgotPasswordLink'); mainListingsView = getElement('mainListingsView'); itemDetailView = getElement('itemDetailView'); backToListingsBtnFromDetail = getElement('backToListingsBtnFromDetail'); detailItemImage = getElement('detailItemImage'); detailItemName = getElement('detailItemName'); detailItemPrice = getElement('detailItemPrice'); detailItemDescription = getElement('detailItemDescription'); detailItemContact = getElement('detailItemContact'); detailItemSellerInfo = getElement('detailItemSellerInfo'); sellerNameDisplay = getElement('sellerNameDisplay'); detailItemPostedDate = getElement('detailItemPostedDate'); commentsSection = getElement('itemCommentsSection'); commentsList = getElement('commentsList'); addCommentForm = getElement('addCommentForm'); commentContentField = getElement('commentContent'); editProfileModal = getElement('editProfileModal'); closeEditProfileModalBtn = document.querySelector('#editProfileModal .close-button'); editProfileForm = getElement('editProfileForm'); profileUsernameField = getElement('profileUsername'); profileEmailField = getElement('profileEmail'); profilePhoneNumberField = getElement('profilePhoneNumber'); // FIX: Added assignment for profilePhoneNumberField
    profileModalUserEmail = getElement('profileModalUserEmail'); viewMyMessagesFromProfileBtn = getElement('viewMyMessagesFromProfileBtn'); logoutFromProfileBtn = getElement('logoutFromProfileBtn'); messageSellerBtn = getElement('messageSellerBtn'); messagesView = getElement('messagesView'); backToListingsFromMessagesBtn = getElement('backToListingsFromMessagesBtn'); conversationsListPanel = getElement('conversationsListPanel'); conversationsListInner = getElement('conversationsListInner'); messageChatPanel = getElement('messageChatPanel'); chatWithInfo = getElement('chatWithInfo'); messagesContainer = getElement('messagesContainer'); sendMessageForm = getElement('sendMessageForm'); newMessageContentField = getElement('newMessageContent'); messageAttachmentInput = getElement('messageAttachment'); fileNameDisplay = getElement('fileNameDisplay'); adminMessagesView = getElement('adminMessagesView'); backToListingsFromAdminMessagesViewBtn = getElement('backToListingsFromAdminMessagesViewBtn'); adminConversationsList = getElement('adminConversationsListInner'); adminViewMessagesBtn = getElement('adminViewMessagesBtn'); adminMessageChatPanel = getElement('adminMessageChatPanel'); adminChatWithInfo = getElement('adminChatWithInfo'); adminMessagesContainer = getElement('adminMessagesContainer'); supportChatBtn = getElement('supportChatBtn'); startNewConversationBtn = getElement('startNewConversationBtn'); currentYearSpan = getElement('currentYear'); adminUserManagementBtn = getElement('adminUserManagementBtn'); adminUserManagementView = getElement('adminUserManagementView'); backToListingsFromAdminUsersBtn = getElement('backToListingsFromAdminUsersBtn'); adminUserSearch = getElement('adminUserSearch'); adminUserListContainer = getElement('adminUserListContainer'); adminInviteUserBtn = getElement('adminInviteUserBtn'); adminManageUserBlocksModal = getElement('adminManageUserBlocksModal'); closeAdminManageUserBlocksModalBtn = getElement('closeAdminManageUserBlocksModalBtn'); manageBlocksForUserName = getElement('manageBlocksForUserName'); manageBlocksForUserId = getElement('manageBlocksForUserId'); adminBlockUserForm = getElement('adminBlockUserForm'); blockerAdminActionUserId = getElement('blockerAdminActionUserId'); targetUserToBlockIdentifier = getElement('targetUserToBlockIdentifier'); adminCurrentUserBlocksList = getElement('adminCurrentUserBlocksList'); adminBlockedByOthersList = getElement('adminBlockedByOthersList'); selectUserToMessageModal = getElement('selectUserToMessageModal'); closeSelectUserToMessageModalBtn = getElement('closeSelectUserToMessageModalBtn'); selectUserToMessageSearch = getElement('selectUserToMessageSearch'); selectUserToMessageList = getElement('selectUserToMessageList'); adminBlockTargetSearchResults = getElement('adminBlockTargetSearchResults'); replyPreviewDiv = getElement('replyPreview'); replyPreviewContentSpan = getElement('replyPreviewContent'); cancelReplyBtnGlobal = getElement('cancelReplyBtn'); sendMessageButton = sendMessageForm ? sendMessageForm.querySelector('button[type="submit"].send-message-btn') : null;

    // These are for the LOGIN 2FA modal if it exists in index.html
    loginTwoFactorAuthModal = getElement('twoFactorAuthModal');
    closeLoginTwoFactorAuthModalBtn = getElement('closeTwoFactorAuthModalBtn');
    loginTwoFactorAuthForm = getElement('twoFactorAuthForm');
    loginTwoFactorAuthInstruction = getElement('twoFactorAuthInstruction');
    loginTwoFactorAuthCodeField = getElement('twoFactorAuthCode');
    loginTwoFactorAuthMessage = getElement('twoFactorAuthMessage');

    // These are for the profile 2FA toggle (elements removed from UI, but variables remain for safety)
    twoFactorAuthToggle = getElement('twoFactorAuthToggle'); // This will likely be null now
    twoFactorAuthStatusMessage = getElement('twoFactorAuthStatusMessage'); // This will likely be null now

    // NEW: User email display in header
    userEmailDisplayHeader = getElement('userEmailDisplayHeader');
}

document.addEventListener('DOMContentLoaded', async () => {
    // Only proceed with main app logic if essential global DOM elements exist
    // This prevents errors on pages like terms.html/privacy.html that don't have all elements
    const isMainAppPage = document.getElementById('mainListingsView') !== null;

    if (isMainAppPage) {
        appHeader = document.querySelector('header');
        appMain = document.querySelector('main');
        appFooter = document.querySelector('footer');
    }
    
    assignGlobalDOMElements();

    if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR_SUPABASE_URL') && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')) {
        try { supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); console.log("Supabase client initialized successfully."); }
        catch (e) { console.error("CRITICAL ERROR: Failed to create Supabase client:", e); supabaseClient = null; }
    } else { console.error("CRITICAL ERROR: Supabase object not found or Supabase URL/KEY are placeholders."); supabaseClient = null; }

    if (!supabaseClient) {
        if (listingsContainer) listingsContainer.innerHTML = "<p class='loading-text' style='color:red; font-weight:bold;'>App Error: Backend connection failed.</p>";
        hideMainApp();
        return;
    }

    // Initialize main app logic only if it's the main app page
    if (isMainAppPage) {
        await initializeMainApplicationLogic();
    } else {
        // For terms.html, privacy.html: ensure support button is visible and year is updated
        if (supportChatBtn) supportChatBtn.style.display = 'block';
        // Update year in footer for static pages
        if (document.getElementById('currentYearPrivacy')) {
            document.getElementById('currentYearPrivacy').textContent = new Date().getFullYear();
        }
        if (document.getElementById('currentYearTerms')) {
            document.getElementById('currentYearTerms').textContent = new Date().getFullYear();
        }
        // Attach support button listener regardless of main page status
        if (supportChatBtn) {
            supportChatBtn.addEventListener('click', handleSupportChatClick);
        }
        // Ensure authentication UI doesn't show on non-main pages
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        if (messagesHeaderBtn) messagesHeaderBtn.style.display = 'none';
        if (editProfileBtn) editProfileBtn.style.display = 'none';
        if (logoutBtnHeader) logoutBtnHeader.style.display = 'none';
        if (userEmailDisplayHeader) userEmailDisplayHeader.style.display = 'none';
    }
    
    window.addEventListener('click', (event) => {
        if (event.target === postItemModal) { hideModal(postItemModal); resetPostItemModal(); }
        if (event.target === editItemModal) { hideModal(editItemModal); resetEditItemModal(); }
        if (event.target === loginModal) hideModal(loginModal);
        if (event.target === signupModal) hideModal(signupModal);
        if (editProfileModal && event.target === editProfileModal) hideModal(editProfileModal);
        if (adminManageUserBlocksModal && event.target === adminManageUserBlocksModal) hideModal(adminManageUserBlocksModal);
        if (selectUserToMessageModal && event.target === selectUserToMessageModal) hideModal(selectUserToMessageModal);

        // Only try to hide these views if they exist on the current page (e.g., index.html)
        if (isMainAppPage) {
            if (messagesView && event.target === messagesView && !event.target.closest('.messages-layout')) { hideModal(messagesView); currentOpenConversationId = null; if (activeChatPoller) clearInterval(activeChatPoller); clearReplyState(); }
            if (adminMessagesView && event.target === adminMessagesView && !event.target.closest('.messages-layout')) { hideModal(adminMessagesView); currentOpenConversationId = null; if (activeChatPoller) clearInterval(activeChatPoller); }
            if (adminUserManagementView && event.target === adminUserManagementView && !event.target.closest('.modal-content')) { hideModal(adminUserManagementView); }
        }

        if (loginTwoFactorAuthModal && event.target === loginTwoFactorAuthModal) {
            (async () => {
                hideModal(loginTwoFactorAuthModal);
                if (currentUser && generated2FACode) {
                    showToast("2FA cancelled. Logging out for security.", "warning");
                    await supabaseClient.auth.signOut();
                }
                generated2FACode = '';
                tempEmailFor2FA = '';
            })();
        }
    });

    // Update year in footer for index.html (if it's the index page)
    if (isMainAppPage && currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }


    // Popstate listener only relevant for main app page navigation
    if (isMainAppPage) {
        window.addEventListener('popstate', async (event) => {
            const itemId = getItemIdFromPath();
            const convoId = getConversationIdFromPath();
            const currentPathname = window.location.pathname;

            initialDeepLinkItemId = null;
            initialDeepLinkConversationId = null;
            initialDeepLinkPath = null;

            if (itemId) {
                initialDeepLinkItemId = itemId;
                initialDeepLinkPath = '/itemDetail';
            } else if (convoId) {
                initialDeepLinkConversationId = convoId;
                initialDeepLinkPath = '/messages';
            } else if (currentPathname === '/messages') {
                initialDeepLinkPath = '/messages';
            } else if (currentPathname === '/' || currentPathname === '/index.html') {
                initialDeepLinkPath = null; // No deep link, means go to default listings
            }

            await handleDeepLinkAfterLogin();

            // If no deep link was found or handled, ensure listings are shown as default
            if (!initialDeepLinkPath) { // If no deep link was resolved, means we are on a "default" page like root '/'
                if (mainListingsView) mainListingsView.style.display = 'block';
                if (itemDetailView) itemDetailView.style.display = 'none';
                if (messagesView) messagesView.style.display = 'none';
                if (adminMessagesView) adminMessagesView.style.display = 'none';
                if (adminUserManagementView) adminUserManagementView.style.display = 'none';

                currentOpenListingId = null;
                currentOpenConversationId = null;
                if (activeChatPoller) clearInterval(activeChatPoller);
                clearReplyState();
                trackPageView('/listings', 'Cleveland Marketplace - All Listings');
                document.title = "Cleveland Marketplace - Buy & Sell Local Items in Cleveland, OH"; // Reset title to default
            }
        });
    }
});

async function initializeMainApplicationLogic() {
    showMainApp();
    console.log("Main application logic initializing...");

    if (SUPERADMIN_USER_ID === 'YOUR_SUPERADMIN_UUID_HERE') console.warn("WARN: SUPERADMIN_USER_ID placeholder.");
    else if (SUPERADMIN_USER_ID && SUPERADMIN_USER_ID.length !== 36) console.error("CRIT: SUPERADMIN_USER_ID invalid.");

    storeInitialDeepLink();
    try { await openDatabase(); } catch (error) { console.error("Failed to open IndexedDB:", error); }

    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('SW registered:', registration.scope);
            const sendUrlToSw = () => { if (navigator.serviceWorker.controller && SUPABASE_URL) { navigator.serviceWorker.controller.postMessage({ type: 'SET_SUPABASE_URL', url: SUPABASE_URL }); } };
            if (navigator.serviceWorker.controller) { sendUrlToSw(); } else { navigator.serviceWorker.addEventListener('controllerchange', sendUrlToSw); }
        } catch (error) { console.error('SW registration failed:', error); }
    }

    setupAuthListeners();
    setupDynamicEventListeners();

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        updateAuthUI(session ? session.user : null);

        await handleDeepLinkAfterLogin();

        const currentPathname = window.location.pathname;
        if ((currentPathname === '/' || currentPathname === '/index.html') && !initialDeepLinkPath) {
            fetchListings(true);
        }

        if (currentUser) {
            requestNotificationPermission();
            registerPeriodicSync();
        }
    } catch (e) {
        console.error("Error during initial session check:", e);
        updateAuthUI(null);
        fetchListings(true);
    }
    const currentViewPath = window.location.pathname.startsWith('/listing/') ? window.location.pathname : (window.location.hash || '/listings');
    document.title = document.title;
    trackPageView(currentViewPath, document.title);

    const listingsSub = supabaseClient.channel('public-listings-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => fetchListings(true)).subscribe();
    const commentsSub = supabaseClient.channel('public-comments-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => { if (currentOpenListingId && (payload.new?.listing_id === currentOpenListingId || payload.old?.listing_id === currentOpenListingId)) fetchComments(currentOpenListingId); }).subscribe();
    const messagesSub = supabaseClient.channel('public-messages-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
            if (currentOpenConversationId && payload.new.conversation_id === currentOpenConversationId) { (messagesView.style.display === 'block' ? fetchMessagesForConversation(currentOpenConversationId, false, false) : (adminMessagesView.style.display === 'block' ? fetchMessagesForAdminChat(currentOpenConversationId) : null)); }
            if (messagesView.style.display === 'block') fetchUserConversations(); if (adminMessagesView.style.display === 'block') fetchAllConversationsForAdmin();
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
            if (currentOpenConversationId && payload.old.conversation_id === currentOpenConversationId) { (messagesView.style.display === 'block' ? fetchMessagesForConversation(currentOpenConversationId, false, true) : (adminMessagesView.style.display === 'block' ? fetchMessagesForAdminChat(currentOpenConversationId) : null)); }
            if (messagesView.style.display === 'block') fetchUserConversations(); if (adminMessagesView.style.display === 'block') fetchAllConversationsForAdmin();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, (payload) => { if (currentOpenConversationId && (payload.new?.message_id || payload.old?.message_id)) { const msgElement = document.querySelector(`.message-wrapper[data-message-id="${payload.new?.message_id || payload.old?.message_id}"]`); if (msgElement && msgElement.closest('#messagesContainer, #adminMessagesContainer')) fetchMessagesForConversation(currentOpenConversationId, false, false); } })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, () => { if (messagesView.style.display === 'block') fetchUserConversations(); if (adminMessagesView.style.display === 'block') fetchAllConversationsForAdmin(); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, (payload) => {
            if (payload.new && payload.new.id) {
                (async () => {
                    if (!currentUser) return; const { data } = await supabaseClient.from('conversation_participants').select('user_id').eq('conversation_id', payload.new.id).eq('user_id', currentUser.id).maybeSingle(); if (data && messagesView.style.display === 'block') fetchUserConversations(); if (adminMessagesView.style.display === 'block') fetchAllConversationsForAdmin();
                })();
            }
        })
        .subscribe();
    window.addEventListener('beforeunload', () => { if (listingsSub) supabaseClient.removeChannel(listingsSub); if (commentsSub) supabaseClient.removeChannel(commentsSub); if (messagesSub) supabaseClient.removeChannel(messagesSub); });
}

function setupDynamicEventListeners() {
    if (postItemBtnGlobal) { postItemBtnGlobal.addEventListener('click', () => { if (currentUser) { resetPostItemModal(); showModal(postItemModal); } else { showToast("Please sign in to post an item.", "info"); showModal(loginModal); if (loginMessage) { loginMessage.textContent = ''; loginMessage.className = 'form-message'; } if (loginForm) loginForm.reset(); } }); }
    if (closePostModalBtn) closePostModalBtn.addEventListener('click', () => { hideModal(postItemModal); resetPostItemModal(); });
    if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', () => { hideModal(editItemModal); resetEditItemModal(); });

    if (postItemForm) {
        postItemForm.addEventListener('submit', async (event) => {
            event.preventDefault(); if (!currentUser) { showToast("You must be logged in.", "error"); return; } const submitButton = postItemForm.querySelector('button[type="submit"]'); const processingOverlay = postItemModal.querySelector('.modal-processing-overlay'); showButtonLoadingState(submitButton, true, "Post Item", "Posting..."); if (processingOverlay) { processingOverlay.style.display = 'flex'; processingOverlay.classList.add('visible'); } const itemName = postItemNameField.value; const itemDescription = postItemDescriptionField.value; const itemContact = postItemContactField.value; let itemPriceValue; let finalImageUrl = null; if (postItemFreeCheckbox.checked) itemPriceValue = 0; else { itemPriceValue = parseFloat(postItemPriceField.value); if (isNaN(itemPriceValue) || itemPriceValue < 0) { showToast('Valid price or "Free" required.', 'error'); showButtonLoadingState(submitButton, false, "Post Item"); if (processingOverlay) { processingOverlay.style.display = 'none'; processingOverlay.classList.remove('visible'); } return; } } const imageSource = postImageSourceFileRadio.checked ? 'file' : 'url'; const imageFile = postItemImageFileField.files[0]; const imageUrlInput = postItemImageUrlField.value.trim(); if (!itemName || !itemDescription || !itemContact) { showToast('Name, Description, and Contact are required.', 'error'); showButtonLoadingState(submitButton, false, "Post Item"); if (processingOverlay) { processingOverlay.style.display = 'none'; processingOverlay.classList.remove('visible'); } return; } if (imageSource === 'file' && !imageFile && !postItemImageUrlField.value) { finalImageUrl = null; } else if (imageSource === 'url' && !imageUrlInput && !postItemImageFileField.files[0]) { finalImageUrl = null; } try {
                if (imageSource === 'file' && imageFile) {
                    const fileExt = imageFile.name.split('.').pop(); const filePath = currentUser.id + '/' + Date.now() + '.' + fileExt; const { error: uploadError } = await supabaseClient.storage.from('listing-images').upload(filePath, imageFile, { metadata: { owner: currentUser.id } }); if (uploadError) throw new Error('Image Upload: ' + uploadError.message); const { data: urlData } = supabaseClient.storage.from('listing-images').getPublicUrl(filePath); if (!urlData || !urlData.publicUrl) throw new Error('Could not get public URL for image.'); finalImageUrl = urlData.publicUrl;
                } else if (imageSource === 'url' && imageUrlInput) {
                    try { new URL(imageUrlInput); finalImageUrl = imageUrlInput; } catch (_) { throw new Error('Invalid Image URL.'); }
                } const { error: insertError } = await supabaseClient.from('listings').insert([{ name: itemName, description: itemDescription, price: itemPriceValue.toString(), contact_info: itemContact, image_url: finalImageUrl, user_id: currentUser.id }]); if (insertError) throw new Error('Save Failed: ' + insertError.message); showToast('Item posted successfully!', 'success'); trackGAEvent('post_item_success', { item_name: itemName, item_price: itemPriceValue }); resetPostItemModal(); hideModal(postItemModal); fetchListings(true);
            } catch (error) { console.error('Post item error:', error); showToast('Error: ' + error.message, 'error'); trackGAEvent('post_item_failure', { error_message: error.message }); } finally { showButtonLoadingState(submitButton, false, "Post Item"); if (processingOverlay) { processingOverlay.style.display = 'none'; processingOverlay.classList.remove('visible'); } }
        });
    }
    if (editItemForm) {
        editItemForm.addEventListener('submit', async (event) => {
            event.preventDefault(); if (!currentUser) { showToast("You must be logged in.", "error"); return; } const listingId = editItemIdField.value; const itemOwnerId = editItemOwnerIdField.value; const originalImageUrl = editItemOriginalImageUrlField.value; if (SUPERADMIN_USER_ID === 'YOUR_SUPERADMIN_UUID_HERE' && currentUser.id !== itemOwnerId) { showToast("Edit permission error (Admin ID not set).", "error"); return; } else if (!isSuperAdmin && currentUser.id !== itemOwnerId) { showToast("You do not have permission to edit this item.", "error"); return; } const submitButton = editItemForm.querySelector('button[type="submit"]'); const processingOverlay = editItemModal.querySelector('.modal-processing-overlay'); showButtonLoadingState(submitButton, true, "Save Changes", "Saving..."); if (processingOverlay) { processingOverlay.style.display = 'flex'; processingOverlay.classList.add('visible'); } let itemPriceValue; if (editModalItemFreeCheckbox.checked) itemPriceValue = 0; else { itemPriceValue = parseFloat(editModalItemPriceField.value); if (isNaN(itemPriceValue) || itemPriceValue < 0) { showToast('Valid price or "Free" required for edit.', "error"); showButtonLoadingState(submitButton, false, "Save Changes"); if (processingOverlay) { processingOverlay.style.display = 'none'; processingOverlay.classList.remove('visible'); } return; } } const updatedItemData = { name: editModalItemNameField.value, description: editModalItemDescriptionField.value, price: itemPriceValue.toString(), contact_info: editModalItemContactField.value }; const imageChangeOption = document.querySelector('input[name="editImageSource"]:checked').value; const newImageFile = editNewImageFileField.files[0]; const newImageUrlInput = editNewImageUrlField.value.trim(); let newPublicUrl = null; let updatedImageWasProcessed = false; try {
                if (imageChangeOption === 'file' && newImageFile) {
                    updatedImageWasProcessed = true; const fileExt = newImageFile.name.split('.').pop(); const newFilePath = itemOwnerId + '/' + listingId + '-' + Date.now() + '-edit.' + fileExt; const { error: uploadError } = await supabaseClient.storage.from('listing-images').upload(newFilePath, newImageFile, { metadata: { owner: itemOwnerId } }); if (uploadError) throw new Error('New image upload failed: ' + uploadError.message); const { data: urlData } = supabaseClient.storage.from('listing-images').getPublicUrl(newFilePath); if (!urlData || !urlData.publicUrl) throw new Error('Could not get public URL for new image.'); newPublicUrl = urlData.publicUrl; updatedItemData.image_url = newPublicUrl;
                } else if (imageChangeOption === 'url' && newImageUrlInput) {
                    updatedImageWasProcessed = true; try { new URL(newImageUrlInput); } catch (_) { throw new Error('Invalid new image URL.'); } newPublicUrl = newImageUrlInput; updatedItemData.image_url = newPublicUrl;
                } else if (imageChangeOption === 'none') { updatedItemData.image_url = originalImageUrl; } const { error: updateDbError } = await supabaseClient.from('listings').update(updatedItemData).eq('id', listingId); if (updateDbError) throw new Error('Database update failed: ' + updateDbError.message); if (updatedImageWasProcessed && originalImageUrl && newPublicUrl !== originalImageUrl && !originalImageUrl.startsWith('http')) {
                    try {
                        const oldImageKey = originalImageUrl.substring(originalImageUrl.indexOf(itemOwnerId + '/')); if (oldImageKey && oldImageKey.includes('/')) { await supabaseClient.storage.from('listing-images').remove([oldImageKey]); }
                    } catch (storageDeleteError) { console.warn("Could not delete old image:", storageDeleteError.message); }
                } showToast('Item updated successfully!', 'success'); trackGAEvent('edit_item_success', { item_id: listingId }); resetEditItemModal(); hideModal(editItemModal); fetchListings(true); if (currentOpenListingId === listingId && itemDetailView.style.display === 'block') { showItemDetailPage(listingId); }
            } catch (error) { console.error('Update item error:', error); showToast('Error: ' + error.message, 'error'); trackGAEvent('edit_item_failure', { item_id: listingId, error_message: error.message }); } finally { showButtonLoadingState(submitButton, false, "Save Changes"); if (processingOverlay) { processingOverlay.style.display = 'none'; processingOverlay.classList.remove('visible'); } }
        });
    }

    if (listingsContainer) {
        listingsContainer.addEventListener('click', async (event) => {
            const card = event.target.closest('.listing-card');
            if (!card) return;

            if (event.target.closest('.action-buttons')) {
                if (event.target.classList.contains('edit-button')) {
                    if (!currentUser) { showToast("Please log in.", "info"); return; }
                    const ownerId = card.dataset.ownerId;
                    if (!isSuperAdmin && currentUser.id !== ownerId && SUPERADMIN_USER_ID !== 'YOUR_SUPERADMIN_UUID_HERE') { showToast("Permission denied.", "error"); return; }
                    resetEditItemModal();
                    editItemIdField.value = card.dataset.id;
                    editItemOwnerIdField.value = ownerId;
                    editItemOriginalImageUrlField.value = card.dataset.imageUrl || '';
                    editModalItemNameField.value = card.dataset.name || '';
                    editModalItemDescriptionField.value = card.dataset.description || '';
                    const currentPrice = parseFloat(card.dataset.price);
                    if (card.dataset.price && (card.dataset.price.toLowerCase() === 'free' || currentPrice === 0)) { editModalItemPriceField.value = '0.00'; editModalItemPriceField.disabled = true; editModalItemPriceField.required = false; editModalItemFreeCheckbox.checked = true; }
                    else if (!isNaN(currentPrice)) { editModalItemPriceField.value = currentPrice.toFixed(2); editModalItemPriceField.disabled = false; editModalItemPriceField.required = true; editModalItemFreeCheckbox.checked = false; }
                    else { editModalItemPriceField.value = card.dataset.price || ''; editModalItemPriceField.disabled = false; editModalItemPriceField.required = true; editModalItemFreeCheckbox.checked = false; }
                    editModalItemContactField.value = card.dataset.contact || '';
                    if (editItemCurrentImage) { editItemCurrentImage.src = card.dataset.imageUrl || ""; editItemCurrentImage.style.display = card.dataset.imageUrl ? 'block' : 'none'; editItemCurrentImage.onerror = () => { editItemCurrentImage.style.display = 'none'; }; }
                    showModal(editItemModal);
                } else if (event.target.classList.contains('delete-button')) {
                    if (!currentUser) { showToast("Please log in.", "info"); return; }
                    const btn = event.target; const listId = btn.dataset.id; const ownerId = btn.dataset.ownerId; const imgFile = btn.dataset.imageFilename;
                    if (!isSuperAdmin && currentUser.id !== ownerId && SUPERADMIN_USER_ID !== 'YOUR_SUPERADMIN_UUID_HERE') { showToast("Permission denied.", "error"); return; }
                    if (confirm("Delete this listing?")) { btn.disabled = true; btn.textContent = "Deleting..."; await handleDeleteListing(listId, imgFile, ownerId); }
                }
            } else {
                const itemId = card.dataset.itemId || card.dataset.id;
                if (itemId) {
                    const itemNameForUrl = (card.dataset.name || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    const newPath = `/listing/${itemNameForUrl}-${itemId}`;

                    window.history.pushState({ itemId: itemId, path: newPath }, `${card.dataset.name || 'Item'} - Cleveland Marketplace`, newPath);

                    showItemDetailPage(itemId);
                }
            }
        });
    }

    if (backToListingsBtnFromDetail) {
        backToListingsBtnFromDetail.addEventListener('click', () => {
            window.history.pushState({}, 'Cleveland Marketplace', '/');

            if (itemDetailView) itemDetailView.style.display = 'none';
            if (mainListingsView) mainListingsView.style.display = 'block';
            currentOpenListingId = null;
            trackPageView('/listings', 'Cleveland Marketplace - All Listings');
            if (searchBar) searchBar.focus();
            window.scrollTo(0, 0);

            document.title = "Cleveland Marketplace - Buy & Sell Local Items in Cleveland, OH";
        });
    }
    if (backToListingsFromMessagesBtn) { backToListingsFromMessagesBtn.addEventListener('click', () => { window.history.pushState({}, 'Cleveland Marketplace - All Listings', '/'); if (messagesView) messagesView.style.display = 'none'; if (mainListingsView) mainListingsView.style.display = 'block'; currentOpenConversationId = null; if (activeChatPoller) clearInterval(activeChatPoller); clearReplyState(); trackPageView('/listings', 'Cleveland Marketplace - All Listings'); }); }
    if (backToListingsFromAdminMessagesViewBtn) { backToListingsFromAdminMessagesViewBtn.addEventListener('click', () => { window.history.pushState({}, 'Cleveland Marketplace - All Listings', '/'); if (adminMessagesView) adminMessagesView.style.display = 'none'; if (mainListingsView) mainListingsView.style.display = 'block'; currentOpenConversationId = null; if (activeChatPoller) clearInterval(activeChatPoller); trackPageView('/listings', 'Cleveland Marketplace - All Listings'); }); }
    if (backToListingsFromAdminUsersBtn) { backToListingsFromAdminUsersBtn.addEventListener('click', () => { window.history.pushState({}, 'Cleveland Marketplace - All Listings', '/'); if (adminUserManagementView) adminUserManagementView.style.display = 'none'; if (mainListingsView) mainListingsView.style.display = 'block'; trackPageView('/listings', 'Cleveland Marketplace - All Listings'); }); }

    if (addCommentForm) {
        addCommentForm.addEventListener('submit', async (event) => {
            event.preventDefault(); if (!currentUser || !currentOpenListingId || !commentContentField) { showToast("Login to comment.", "error"); return; } const content = commentContentField.value.trim(); if (!content) { showToast("Comment cannot be empty.", "error"); return; } const submitButton = addCommentForm.querySelector('button[type="submit"]'); const originalButtonText = "Post Comment"; showButtonLoadingState(submitButton, true, originalButtonText, "Posting..."); try { const { error } = await supabaseClient.from('comments').insert({ listing_id: currentOpenListingId, user_id: currentUser.id, content: content }); if (error) throw error; showToast("Comment posted!", "success"); trackGAEvent('post_comment_success', { listing_id: currentOpenListingId }); addCommentForm.reset(); fetchComments(currentOpenListingId); } catch (error) { console.error("Error posting comment:", error); showToast('Error: ' + error.message, "error"); trackGAEvent('post_comment_failure', { listing_id: currentOpenListingId, error_message: error.message }); } finally { showButtonLoadingState(submitButton, false, originalButtonText); }
        });
    }
    if (itemDetailView) {
        itemDetailView.addEventListener('click', function (event) {
            if (event.target && event.target.id === 'loginToCommentLink') { event.preventDefault(); showModal(loginModal); if (loginMessage) { loginMessage.textContent = ''; loginMessage.className = 'form-message'; } if (loginForm) loginForm.reset(); } if (event.target && event.target.classList.contains('delete-comment-btn')) { const commentId = event.target.dataset.commentId; if (commentId) deleteComment(commentId); }
        });
    }

    if (sendMessageForm) {
        sendMessageForm.addEventListener('submit', async (event) => {
            event.preventDefault(); if (!currentUser || !currentOpenConversationId || !newMessageContentField) return; const content = newMessageContentField.value.trim(); const file = messageAttachmentInput.files[0]; if (!content && !file) return; showButtonLoadingState(sendMessageButton, true); let attachment_url = null; let attachment_filename = null; let attachment_mimetype = null; let messageSentOrQueued = false; try {
                if (file) {
                    const sanitizedFilename = file.name.replace(/\s+/g, '_').replace(/[^\w.-]/g, ''); const pathInBucket = currentOpenConversationId + '/' + currentUser.id + '/' + Date.now() + '_' + sanitizedFilename; showToast("Uploading file...", "info", 20000); const { data: uploadData, error: uploadError } = await supabaseClient.storage.from(STORAGE_BUCKET_NAME).upload(pathInBucket, file, { cacheControl: '3600', upsert: false }); if (uploadError) throw new Error('File upload failed: ' + uploadError.message); showToast("File uploaded. Getting URL...", "info", 2000); const { data: urlData } = supabaseClient.storage.from(STORAGE_BUCKET_NAME).getPublicUrl(pathInBucket); if (!urlData || !urlData.publicUrl) throw new Error('Could not get public URL for new file.'); attachment_url = urlData.publicUrl; attachment_filename = file.name; attachment_mimetype = file.type; showToast("File URL obtained.", "info", 1000);
                } const messageData = { conversation_id: currentOpenConversationId, sender_id: currentUser.id, content: content || null, attachment_url: attachment_url, attachment_filename: attachment_filename, attachment_mimetype: attachment_mimetype, parent_message_id: replyingToMessageId, thread_id: replyingToThreadId, reply_snippet: replyingToMessageId ? `Replying to ${replyingToUser}: "${replyingToSnippet}"` : null }; if (navigator.onLine) { const { error: insertError } = await supabaseClient.from('messages').insert(messageData); if (insertError) throw new Error('Error sending message: ' + insertError.message); messageSentOrQueued = true; } else { await queueDataForSync(PENDING_MESSAGES_STORE, messageData, 'send-pending-data'); showToast("Message queued. Will send when online.", "info"); messageSentOrQueued = true; } if (messageSentOrQueued) { newMessageContentField.value = ''; if (messageAttachmentInput) messageAttachmentInput.value = null; if (fileNameDisplay) fileNameDisplay.textContent = ''; clearReplyState(); if (sendMessageButton) { sendMessageButton.classList.remove('has-text-or-file'); sendMessageButton.disabled = true; } if (navigator.onLine) { fetchMessagesForConversation(currentOpenConversationId, false, false); fetchUserConversations(); } trackGAEvent('send_message', { conversation_id: currentOpenConversationId, has_attachment: !!file, is_reply: !!replyingToMessageId, was_queued: !navigator.onLine }); }
            } catch (error) { console.error("Error in sendMessageForm:", error); showToast('Error: ' + error.message, "error", 5000); } finally { showButtonLoadingState(sendMessageButton, false); }
        });
    }
    if (messageSellerBtn) {
        messageSellerBtn.addEventListener('click', async () => {
            if (!currentUser) { showToast("Please log in to message.", "info"); showModal(loginModal); return; } const sellerId = messageSellerBtn.dataset.sellerId; const listingId = messageSellerBtn.dataset.listingId; let sellerNameForDisplay = messageSellerBtn.dataset.sellerName || "Seller"; let topicForDisplay = messageSellerBtn.dataset.listingName || "this item"; if (sellerId === SUPERADMIN_USER_ID) sellerNameForDisplay = "Support Team"; if (currentUser.id === sellerId) { showToast("You cannot message yourself.", "info"); return; } if (!sellerId) { showToast("Seller information is missing for this item.", "error"); return; } showToast("Initiating conversation...", "info"); try {
                const { data: convoData, error: rpcError } = await supabaseClient.rpc('get_or_create_conversation', { user1_id: currentUser.id, user2_id: sellerId, p_listing_id: listingId });
                if (rpcError) throw rpcError;
                if (convoData && convoData.length > 0 && convoData[0].id) {
                    const convoId = convoData[0].id;
                    const otherUserNameSlug = (sellerNameForDisplay || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    const topicSlug = (topicForDisplay || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    const newPath = `/messages/conversation/${topicSlug}-${otherUserNameSlug}-${convoId}`;
                    window.history.pushState({ conversationId: convoId, path: newPath }, `Message about ${topicForDisplay} - Cleveland Marketplace`, newPath);
                    showMessagesView();
                    openConversation(convoId, sellerNameForDisplay, topicForDisplay);
                    trackGAEvent('start_conversation', { listing_id: listingId, seller_id: sellerId });
                }
                else showToast("Could not start or find conversation. Users may be blocked or an error occurred.", "error");
            } catch (error) { showToast("Error initiating message: " + error.message, "error"); trackGAEvent('start_conversation_failure', { listing_id: listingId, seller_id: sellerId, error_message: error.message }); }
        });
    }

    if (searchBar) {
        searchBar.addEventListener('input', (e) => {
            clearTimeout(searchBar.searchTimeout); searchBar.searchTimeout = setTimeout(() => { currentSearchTerm = e.target.value.trim(); if (currentSearchTerm) trackGAEvent('search', { search_term: currentSearchTerm }); fetchListings(true); }, 500);
        });
    }
    if (applyFiltersBtn) { applyFiltersBtn.addEventListener('click', () => { currentMinPrice = minPriceInput.value !== '' ? parseFloat(minPriceInput.value) : null; currentMaxPrice = maxPriceInput.value !== '' ? parseFloat(maxPriceInput.value) : null; currentFilterFreeOnly = filterFreeItemsCheckbox.checked; currentSortOption = sortListingsSelect.value; trackGAEvent('filter_sort_apply', { min_price: currentMinPrice, max_price: currentMaxPrice, free_only: currentFilterFreeOnly, sort_by: currentSortOption }); fetchListings(true); }); }
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => { trackGAEvent('load_more_listings'); fetchListings(false); });

    if (postItemFreeCheckbox && postItemPriceField) { postItemFreeCheckbox.addEventListener('change', () => { postItemPriceField.disabled = postItemFreeCheckbox.checked; postItemPriceField.required = !postItemFreeCheckbox.checked; if (postItemFreeCheckbox.checked) postItemPriceField.value = '0.00'; else postItemPriceField.value = ''; }); }
    if (postImageSourceFileRadio && postImageSourceUrlRadio) {
        const hdl = () => {
            const iF = postImageSourceFileRadio.checked; if (postImageFileUploadContainer) postImageFileUploadContainer.style.display = iF ? 'block' : 'none'; if (postItemImageUrlContainer) postItemImageUrlContainer.style.display = iF ? 'none' : 'block'; if (postItemImageFileField) postItemImageFileField.required = iF; if (postItemImageUrlField) postItemImageUrlField.required = !iF; if (iF && postItemImageUrlField) postItemImageUrlField.value = ''; else if (postItemImageFileField) postItemImageFileField.value = ''; if (postItemImagePreview) postItemImagePreview.style.display = (iF && postItemImageFileField.files.length > 0) ? 'block' : 'none';
        }; postImageSourceFileRadio.addEventListener('change', hdl); postImageSourceUrlRadio.addEventListener('change', hdl); hdl();
    }
    if (postItemImageFileField && postItemImagePreview) {
        postItemImageFileField.addEventListener('change', function () {
            const f = this.files[0]; if (f) { const r = new FileReader(); r.onload = (e) => { postItemImagePreview.src = e.target.result; postItemImagePreview.style.display = 'block'; }; r.readAsDataURL(f); } else { postItemImagePreview.src = '#'; postItemImagePreview.style.display = 'none'; }
        });
    }
    if (editModalItemFreeCheckbox && editModalItemPriceField) { postModalItemFreeCheckbox.addEventListener('change', () => { editModalItemPriceField.disabled = editModalItemFreeCheckbox.checked; editModalItemPriceField.required = !editModalItemFreeCheckbox.checked; if (editModalItemFreeCheckbox.checked) editModalItemPriceField.value = '0.00'; else editModalItemPriceField.value = ''; }); }
    if (editImageSourceNoneRadio && editImageSourceFileRadio_Edit && editImageSourceUrlRadio_Edit) {
        const hdl = () => {
            if (editImageFileUploadContainer_Edit) editImageFileUploadContainer_Edit.style.display = editImageSourceFileRadio_Edit.checked ? 'block' : 'none'; if (editItemImageUrlContainer_Edit) editItemImageUrlContainer_Edit.style.display = editImageSourceUrl_Edit.checked ? 'block' : 'none'; if (editNewImageFileField) editNewImageFileField.required = editImageSourceFileRadio_Edit.checked; if (editNewImageUrlField) editNewImageUrlField.required = editImageSourceUrl_Edit.checked; if (!editImageSourceFileRadio_Edit.checked && editNewImageFileField) editNewImageFileField.value = ''; if (!editImageSourceUrl_Edit.checked && editNewImageUrlField) editNewImageUrlField.value = ''; if (editItemNewImagePreview) editItemNewImagePreview.style.display = (editImageSourceFileRadio_Edit.checked && editNewImageFileField.files.length > 0) ? 'block' : 'none';
        }; [editImageSourceNoneRadio, editImageSourceFileRadio_Edit, editImageSourceUrl_Edit].forEach(r => { if (r) r.addEventListener('change', hdl); }); hdl();
    }
    if (editNewImageFileField && editItemNewImagePreview) {
        editNewImageFileField.addEventListener('change', function () {
            const f = this.files[0]; if (f) { const r = new FileReader(); r.onload = (e) => { editItemNewImagePreview.src = e.target.result; editItemNewImagePreview.style.display = 'block'; }; r.readAsDataURL(f); } else { editItemNewImagePreview.src = '#'; editItemNewImagePreview.style.display = 'none'; }
        });
    }

    if (newMessageContentField && sendMessageButton) {
        const updateSendButtonState = () => {
            if (newMessageContentField.value.trim().length > 0 || (messageAttachmentInput && messageAttachmentInput.files.length > 0)) {
                sendMessageButton.classList.add('has-text-or-file'); sendMessageButton.disabled = false;
            } else {
                sendMessageButton.classList.remove('has-text-or-file'); sendMessageButton.disabled = true;
            }
        };
        newMessageContentField.addEventListener('input', updateSendButtonState);
        if (messageAttachmentInput) {
            messageAttachmentInput.addEventListener('change', () => {
                updateSendButtonState();
                if (fileNameDisplay) fileNameDisplay.textContent = messageAttachmentInput.files.length > 0 ? messageAttachmentInput.files[0].name : '';
            });
        }
        updateSendButtonState();
    }
    if (cancelReplyBtnGlobal) cancelReplyBtnGlobal.addEventListener('click', clearReplyState);
}

// interface-app.js - VERSION COMPLÈTE CORRIGÉE

// --- VARIABLES GLOBALES ---
let gestionCodesInstance = null;
let profileInstance = null;
let configurationInstance = null;
let gestionHorairesInstance = null;
let gestionCapaciteInstance = null;
let gestionEntreesInstance = null;
let gestionVestiairesInstance = null;
let vestiaireKiosqueInstance = null;
let kioskWorkflowInstance = null;
let kioskInterface2Instance = null;

document.addEventListener('DOMContentLoaded', () => {

    // --- SÉLECTION DES ÉLÉMENTS ---
    const menuItems = document.querySelectorAll('.menu-item');
    const submenuItems = document.querySelectorAll('.submenu-item');
    const backButtons = document.querySelectorAll('.back-button');
    const contentSections = document.querySelectorAll('.content-section');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const toggleIcon = document.getElementById('toggleIcon');
    const toggleBtn = document.querySelector('.toggle-btn');
    const toggleInterfaceBtn = document.getElementById('toggle-interface-btn');
    const toggleBackBtn = document.getElementById('toggle-back-btn');
    const kioskViewSection = document.getElementById('kiosk-view');
    const welcomeModal = document.getElementById('welcomeModal');
    const welcomeModalButton = document.querySelector('#welcomeModal button');
    const dontShowAgainCheckbox = document.getElementById('dontShowAgain');
    const confirmationModal = document.getElementById('confirmationModal');
    const confirmationModalButton = document.querySelector('#confirmationModal button');
    const profileForm = document.getElementById('profileForm');
    const coverUpload = document.getElementById('coverUpload');
    const coverImage = document.getElementById('coverImage');
    const coverPlaceholder = document.getElementById('coverPlaceholder');
    const removeCoverBtn = document.getElementById('removeCoverBtn');
    const coverSection = document.getElementById('coverSection');
    const coverError = document.getElementById('coverError');
    const discoNameInput = document.getElementById('discoName');
    const cityInput = document.getElementById('city');
    const postalCodeInput = document.getElementById('postalCode');
    const addressInput = document.getElementById('address');
    const phoneInput = document.getElementById('phone');
    const emailInput = document.getElementById('email');
    const countryCodeInput = document.getElementById('countryCode');
    const saveTaxSettingsBtn = document.getElementById('saveTaxSettingsBtn');
    const saveKiosqueSettings = document.getElementById('saveKiosqueSettings');
    const alert1Enabled = document.getElementById('alert1-enabled');
    const alert1Visual = document.getElementById('alert1-visual');
    const alert1Percentage = document.getElementById('alert1-percentage');
    const alert1Color = document.getElementById('alert1-color');
    const alert2Enabled = document.getElementById('alert2-enabled');
    const alert2Visual = document.getElementById('alert2-visual');
    const alert2Percentage = document.getElementById('alert2-percentage');
    const alert2Color = document.getElementById('alert2-color');
    const alert3Enabled = document.getElementById('alert3-enabled');
    const alert3Visual = document.getElementById('alert3-visual');
    const alert3Percentage = document.getElementById('alert3-percentage');
    const alert3Color = document.getElementById('alert3-color');

    async function showSection(targetId, options = {}) {
    if (!targetId) return;
    
    const mode = options.mode || 'client'; // Par défaut : mode client
    
    console.log('🔄 [Interface-App] Navigation vers:', targetId, 'Mode:', mode);
    console.log('📍 [Interface-App] Source de l\'appel:', new Error().stack);

    // Réinitialiser TOUTES les sections
    contentSections.forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    // Afficher la section cible
    const sectionToShow = document.getElementById(targetId);
    if (sectionToShow) {
        sectionToShow.classList.add('active');
        sectionToShow.style.display = 'block';
        sectionToShow.offsetHeight; // Force reflow
    }

    // --- GESTION DES SECTIONS ---

    // GESTION DE CAPACITÉ
    if (targetId === 'gestion-capacite') {
        if (!gestionCapaciteInstance) {
            gestionCapaciteInstance = new GestionCapacite('gestion-capacite');
            gestionCapaciteInstance.init();
        } else {
            gestionCapaciteInstance.loadData();
        }
    }

    // GESTION DES ENTRÉES
    if (targetId === 'gestion-tickets-entree') {
        console.log('📝 [Interface-App] Chargement gestion entrées');
        
        const currentPrestations = document.querySelector('.current-prestations');
        if (currentPrestations) {
            currentPrestations.style.display = 'block';
        }
        
        if (!gestionEntreesInstance) {
            try {
                gestionEntreesInstance = new GestionEntrees();
                await gestionEntreesInstance.init();
            } catch (error) {
                console.error('❌ [Interface-App] Erreur initialisation GestionEntrees:', error);
            }
        } else {
            try {
                await gestionEntreesInstance.loadData();
                if (typeof gestionEntreesInstance.initializeInterface === 'function') {
                    gestionEntreesInstance.initializeInterface();
                }
            } catch (error) {
                console.error('❌ [Interface-App] Erreur rechargement GestionEntrees:', error);
            }
        }
        
        if (gestionEntreesInstance && typeof gestionEntreesInstance.resetInterfaceState === 'function') {
            gestionEntreesInstance.resetInterfaceState();
        }
    }
    
    // NAVIGATION VERS LE KIOSQUE (kiosk-view = Interface 2)
if (targetId === 'kiosk-view') {
    console.log('🖥️ [Interface-App] Chargement Kiosk Interface 2 - Mode:', mode);
    
    if (typeof KioskInterface2 === 'undefined') {
        console.error('❌ [Interface-App] KioskInterface2 non disponible');
        return;
    }
    
    const kioskView = document.getElementById('kiosk-view');
    const toggleBackBtn = document.getElementById('toggle-back-btn');
    const kioskBackBtn = document.getElementById('kiosk-back-btn');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    // ✅ CORRECTION : Gérer sidebar selon le mode
    if (mode === 'admin') {
        // Mode admin : Cacher sidebar
        if (sidebar) sidebar.style.display = 'none';
        if (mainContent) {
            mainContent.style.marginLeft = '0';
            mainContent.style.padding = '0';
        }
        
        kioskView.classList.add('admin-mode');
        kioskView.classList.remove('client-mode');
        if (toggleBackBtn) toggleBackBtn.style.display = 'block';
        if (kioskBackBtn) kioskBackBtn.style.display = 'none';
    } else {
        // Mode client : Garder sidebar
        if (sidebar) sidebar.style.display = 'block'; // ✅ CORRECTION
        if (mainContent) {
            mainContent.style.marginLeft = '220px'; // ✅ CORRECTION
            mainContent.style.padding = '0';
        }
        
        kioskView.classList.add('client-mode');
        kioskView.classList.remove('admin-mode');
        if (toggleBackBtn) toggleBackBtn.style.display = 'none';
        if (kioskBackBtn) kioskBackBtn.style.display = 'block';
    }
    
    // Initialiser ou rafraîchir
    if (!kioskInterface2Instance) {
        try {
            kioskInterface2Instance = new KioskInterface2();
            await kioskInterface2Instance.init();
        } catch (error) {
            console.error('❌ [Interface-App] Erreur initialisation:', error);
        }
    } else {
        try {
            await kioskInterface2Instance.refresh();
        } catch (error) {
            console.error('❌ [Interface-App] Erreur rafraîchissement:', error);
        }
    }
}

    // INTERFACE 1 KIOSQUE
if (targetId === 'kiosk-interface-1') {
    console.log('🎯 [Interface-App] Chargement Interface 1 Kiosque');
    
    if (typeof KioskWorkflow === 'undefined') {
        console.error('❌ [Interface-App] KioskWorkflow non disponible');
        return;
    }
    
    // ✅ CORRECTION : GARDER la sidebar visible en mode client
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    
    if (sidebar) {
        sidebar.style.display = 'block'; // ✅ Garder visible
    }
    if (mainContent) {
        mainContent.style.marginLeft = '220px'; // ✅ Garder décalage
        mainContent.style.padding = '0';
    }
    
    if (!kioskWorkflowInstance) {
        try {
            kioskWorkflowInstance = new KioskWorkflow();
            await kioskWorkflowInstance.init();
        } catch (error) {
            console.error('❌ [Interface-App] Erreur initialisation:', error);
        }
    } else {
        try {
            await kioskWorkflowInstance.reset();
            await kioskWorkflowInstance.loadCapacity();
        } catch (error) {
            console.error('❌ [Interface-App] Erreur réinitialisation:', error);
        }
    }
}

    // GESTION DES TICKETS VESTIAIRE
    if (targetId === 'gestion-tickets-vestiaire') {
        console.log('👔 [Interface-App] Chargement gestion vestiaires');
        
        if (!gestionVestiairesInstance) {
            try {
                gestionVestiairesInstance = new GestionVestiaires();
                await gestionVestiairesInstance.init();
            } catch (error) {
                console.error('❌ [Interface-App] Erreur initialisation GestionVestiaires:', error);
            }
        } else {
            await gestionVestiairesInstance.loadArticles();
        }
    }

    // VESTIAIRE KIOSQUE
    if (targetId === 'vestiaire-selection') {
        console.log('🎽 [Interface-App] Affichage sélection vestiaire kiosque');
        
        if (!vestiaireKiosqueInstance) {
            try {
                vestiaireKiosqueInstance = new VestiaireKiosque();
                await vestiaireKiosqueInstance.init();
            } catch (error) {
                console.error('❌ [Interface-App] Erreur initialisation VestiaireKiosque:', error);
            }
        } else {
            await vestiaireKiosqueInstance.loadArticles();
            vestiaireKiosqueInstance.resetSelections();
        }
    }
    
    // GESTION DES CODES JOUR
    if (targetId === 'gestion-code-jour') {
        if (!gestionCodesInstance) {
            gestionCodesInstance = new GestionCodesJour();
            gestionCodesInstance.init();
        } else {
            gestionCodesInstance.loadMonthData(gestionCodesInstance.currentYear, gestionCodesInstance.currentMonth);
        }
    }
    
    // GESTION DU PROFIL
    if (targetId === 'profile') {
        if (!profileInstance) {
            profileInstance = new ProfileManager();
            profileInstance.init();
        } else {
            profileInstance.loadProfileData();
        }
    }
    
    // GESTION DES HORAIRES
    if (targetId === 'gestion-heures-creuses') {
        if (!gestionHorairesInstance) {
            gestionHorairesInstance = new GestionHoraires();
            const section = document.getElementById('gestion-heures-creuses');
            if (section) {
                const backButtonHTML = '<a href="#" class="back-button" data-target="gestion">← Retour</a>';
                section.innerHTML = backButtonHTML + gestionHorairesInstance.render();
                
                section.querySelector('.back-button').addEventListener('click', (e) => {
                    e.preventDefault();
                    showSection('gestion');
                });

                const container = section.querySelector('.horaires-container');
                gestionHorairesInstance.setContainer(container);
            }
        } else {
            gestionHorairesInstance.loadHoraires().then(() => {
                gestionHorairesInstance.initializeForm();
            });
        }
    }

    // GESTION DU KIOSQUE PRINCIPAL - Redirection vers Interface 1
    if (targetId === 'kiosque') {
        console.log('🔄 [Interface-App] Menu Kiosque cliqué → Redirection Interface 1');
        
        if (typeof KioskWorkflow === 'undefined') {
            console.error('❌ [Interface-App] KioskWorkflow non disponible pour kiosque – chargement échoué');
            return;
        }
        
        showSection('kiosk-interface-1');
        return;
    }

    // GESTION DE LA CONFIGURATION
    if (targetId.startsWith('configuration')) {
        if (!configurationInstance) {
            configurationInstance = new ConfigurationManager();
            configurationInstance.init();
        } else {
            configurationInstance.resetAndReload();
        }
    }
}

    // --- AUTRES FONCTIONS ---
    function toggleSidebar() {
        if (sidebar && mainContent && toggleIcon) {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('collapsed');
            toggleIcon.classList.toggle('chevron-left');
            toggleIcon.classList.toggle('chevron-right');
        }
    }

    function closeModal() {
        if (dontShowAgainCheckbox && dontShowAgainCheckbox.checked) {
            localStorage.setItem('dontShowWelcomeModal', 'true');
        }
        if (welcomeModal) {
            welcomeModal.style.display = 'none';
        }
    }

    function showConfirmationModal() {
        if (confirmationModal) {
            confirmationModal.style.display = 'flex';
        }
    }

    function closeConfirmationModal() {
        if (confirmationModal) {
            confirmationModal.style.display = 'none';
        }
    }

    function validateForm() {
        let isValid = true;
        profileForm.querySelectorAll('.form-group').forEach(group => group.classList.remove('invalid'));
        if (coverSection) coverSection.classList.remove('invalid');
        if (coverError) coverError.style.display = 'none';
        
        if (coverImage.src === '' || coverImage.style.display === 'none') {
            isValid = false;
            if (coverSection) coverSection.classList.add('invalid');
            if (coverError) {
                coverError.textContent = 'Veuillez ajouter une couverture.';
                coverError.style.display = 'block';
            }
        }
        
        if (!discoNameInput.value.trim()) {
            isValid = false;
            discoNameInput.closest('.form-group').classList.add('invalid');
        }
        
        if (!cityInput.value.trim()) {
            isValid = false;
            cityInput.closest('.form-group').classList.add('invalid');
        }
        
        if (!postalCodeInput.value.trim() || !/^\d{5}$/.test(postalCodeInput.value)) {
            isValid = false;
            postalCodeInput.closest('.form-group').classList.add('invalid');
        }
        
        if (!addressInput.value.trim()) {
            isValid = false;
            addressInput.closest('.form-group').classList.add('invalid');
        }
        
        if (!phoneInput.value.trim() || !/^\d{9,10}$/.test(phoneInput.value)) {
            isValid = false;
            phoneInput.closest('.form-group').classList.add('invalid');
        }
        
        if (!emailInput.value.trim() || !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(emailInput.value)) {
            isValid = false;
            emailInput.closest('.form-group').classList.add('invalid');
        }
        
        // FIX: Utiliser countryCodeInput au lieu de countryInput
        if (countryCodeInput && !countryCodeInput.value.trim()) {
            isValid = false;
            countryCodeInput.closest('.form-group').classList.add('invalid');
        }
        
        return isValid;
    }

    function resetForm() {
        if (profileForm) profileForm.reset();
        if (coverImage) {
            coverImage.src = '';
            coverImage.style.display = 'none';
        }
        if (coverPlaceholder) coverPlaceholder.style.display = 'flex';
        if (removeCoverBtn) removeCoverBtn.style.display = 'none';
        if (coverUpload) coverUpload.value = '';
        if (coverSection) coverSection.classList.remove('invalid');
        profileForm.querySelectorAll('.form-group').forEach(group => group.classList.remove('invalid'));
    }

    // --- ÉVÉNEMENTS ---
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            showSection(target);
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    submenuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(item.getAttribute('data-target'));
        });
    });

    backButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(button.getAttribute('data-target'));
        });
    });

    if (toggleInterfaceBtn) {
    toggleInterfaceBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('🔄 [Interface-App] Basculement vers le kiosque (mode admin)');
        
        contentSections.forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        
        // ✅ MODE ADMIN
        await showSection('kiosk-view', { mode: 'admin' });
    });
}

    // Bouton retour gérant (existant)
// Bouton retour gérant - VERSION CORRIGÉE
if (toggleBackBtn) {
    // IMPORTANT : Supprimer tous les listeners existants
    const newToggleBackBtn = toggleBackBtn.cloneNode(true);
    toggleBackBtn.parentNode.replaceChild(newToggleBackBtn, toggleBackBtn);
    
    newToggleBackBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🔙 [Interface-App] Retour GÉRANT vers gestion-tickets-entree');
        
        // ✅ NOUVEAU : Réafficher la sidebar
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        
        if (sidebar) {
            sidebar.style.display = 'block';
        }
        if (mainContent) {
            mainContent.style.marginLeft = ''; // Réinitialiser
            mainContent.style.padding = '';
        }
        
        // Cacher kiosk-view
        const kioskView = document.getElementById('kiosk-view');
        if (kioskView) {
            kioskView.style.display = 'none';
            kioskView.classList.remove('active');
            kioskView.classList.remove('admin-mode');
            kioskView.classList.remove('client-mode');
        }
        
        // Cacher Interface 1 (au cas où)
        const kioskInterface1 = document.getElementById('kiosk-interface-1');
        if (kioskInterface1) {
            kioskInterface1.style.display = 'none';
            kioskInterface1.classList.remove('active');
        }
        
        // Forcer l'affichage de gestion-tickets-entree
        await showSection('gestion-tickets-entree');
        
        console.log('✅ [Interface-App] Retour gérant terminé - gestion-tickets-entree affiché');
    });
}

// ✅ NOUVEAU : Bouton retour client
const kioskBackBtn = document.getElementById('kiosk-back-btn');
if (kioskBackBtn) {
    kioskBackBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('🔙 [Interface-App] Retour Interface 1 (client)');
        
        // Retour à Interface 1 (nombre de personnes)
        // La sidebar reste cachée car on reste dans le workflow client
        await showSection('kiosk-interface-1');
    });
}

    if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
    if (welcomeModalButton) welcomeModalButton.addEventListener('click', closeModal);
    if (confirmationModalButton) confirmationModalButton.addEventListener('click', closeConfirmationModal);
    
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (validateForm()) {
                if (profileInstance && typeof profileInstance.handleSave === 'function') {
                    profileInstance.handleSave();
                }
                showConfirmationModal();
            }
        });
    }

    if (coverUpload) {
        coverUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    if (coverImage) {
                        coverImage.src = e.target.result;
                        coverImage.style.display = 'block';
                    }
                    if (coverPlaceholder) coverPlaceholder.style.display = 'none';
                    if (removeCoverBtn) removeCoverBtn.style.display = 'inline-block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (removeCoverBtn) {
        removeCoverBtn.addEventListener('click', () => {
            if (coverImage) {
                coverImage.src = '';
                coverImage.style.display = 'none';
            }
            if (coverPlaceholder) coverPlaceholder.style.display = 'flex';
            if (removeCoverBtn) removeCoverBtn.style.display = 'none';
            if (coverUpload) coverUpload.value = '';
        });
    }
    
    [alert1Enabled, alert2Enabled, alert3Enabled].forEach((alertEnabled, index) => {
        if (alertEnabled) {
            const alertVisual = document.getElementById(`alert${index + 1}-visual`);
            const alertColor = document.getElementById(`alert${index + 1}-color`);
            const alertPercentage = document.getElementById(`alert${index + 1}-percentage`);
            const alertNotification = alertEnabled.closest('.toggle-group')?.querySelector('.notification');

            const updateNotification = () => {
                if (alertNotification && alertEnabled.checked) {
                    alertNotification.textContent = `Alerte activée à ${alertPercentage.value}% avec la couleur ${alertColor.value}.`;
                    alertNotification.classList.add('show');
                    setTimeout(() => alertNotification.classList.remove('show'), 2000);
                }
            };

            alertEnabled.addEventListener('change', () => {
                if (alertVisual) alertVisual.classList.toggle('active', alertEnabled.checked);
                updateNotification();
            });

            if (alertColor && alertVisual) {
                alertColor.addEventListener('input', () => {
                    alertVisual.style.borderColor = alertColor.value;
                    alertVisual.style.setProperty('--alert-color', alertColor.value);
                    updateNotification();
                });
            }

            if (alertPercentage) {
                alertPercentage.addEventListener('input', updateNotification);
            }
        }
    });

    document.addEventListener('entreesUpdated', (event) => {
        console.log('✅ [Interface-App] Entrées mises à jour:', event.detail);
        if (typeof renderKioskItems === 'function') {
            renderKioskItems();
        }
    });

    // Événement après validation du vestiaire (Interface 3)
    document.addEventListener('vestiaireValidated', async (event) => {
        console.log('✅ [Interface-App] Vestiaire validé:', event.detail);
        
        // Sauvegarder la sélection vestiaire dans localStorage
        localStorage.setItem('kioskVestiaireSelection', JSON.stringify(event.detail.selection || {}));
        localStorage.setItem('kioskVestiaireTotal', event.detail.total || 0);
        
        // TODO: Passer à l'Interface 4 (Récap panier) une fois créée
        // await showSection('kiosk-interface-4-recap');
        
        // Pour l'instant, on log simplement en attendant la création de l'Interface 4
        console.log('📋 [Interface-App] Prêt pour Interface 4 (Récap panier) - À créer');
        console.log('💾 Données vestiaire sauvegardées:', event.detail);
    });

    // Événement si l'utilisateur skip le vestiaire (Interface 3)
    document.addEventListener('vestiaireSkipped', async () => {
        console.log('⏭️ [Interface-App] Vestiaire ignoré - passage direct à Interface 4');
        
        // Supprimer toute sélection vestiaire précédente
        localStorage.removeItem('kioskVestiaireSelection');
        localStorage.removeItem('kioskVestiaireTotal');
        
        // TODO: Passer à l'Interface 4 (Récap panier) une fois créée
        // await showSection('kiosk-interface-4-recap');
        
        console.log('📋 [Interface-App] Prêt pour Interface 4 (Récap panier) - À créer');
    });

    // Écouter l'event custom pour transition kiosque
    document.addEventListener('kioskToViewTransition', () => {
        console.log('🔄 [Interface-App] Transition kiosque détectée – sync si besoin');
    });

    // 🔒 VALIDATION ANTI-FRAUDE : Transition Interface 2 → Interface 3
    document.addEventListener('validateKioskOrder', async (event) => {
        console.log('🔒 [Interface-App] Validation anti-fraude Interface 2');
        
        const nombrePersonnes = parseInt(localStorage.getItem('kioskGroupSize')) || 1;
        const panierData = event.detail || {};
        const nombreEntrees = panierData.totalEntrees || 0;
        
        // 🚨 RÈGLE ANTI-FRAUDE : Nombre d'entrées doit être >= Nombre de personnes
        if (nombreEntrees < nombrePersonnes) {
            // Afficher erreur
            showKioskError(`⚠️ ATTENTION : Vous devez sélectionner au moins ${nombrePersonnes} entrées pour ${nombrePersonnes} personnes.`);
            console.warn(`❌ [Anti-Fraude] Bloqué: ${nombreEntrees} entrées < ${nombrePersonnes} personnes`);
            return; // BLOQUER la transition
        }
        
        // ✅ Validation OK - Sauvegarder les données et passer à Interface 3
        console.log('✅ [Anti-Fraude] Validation OK:', {
            personnes: nombrePersonnes,
            entrees: nombreEntrees
        });
        
        localStorage.setItem('kioskOrderData', JSON.stringify(panierData));
        
        // Passer à Interface 3 (Vestiaire)
        await showSection('vestiaire-selection');
    });

    // Fonction helper pour afficher les erreurs kiosque
    function showKioskError(message) {
        // Vérifier si une modal d'erreur existe déjà
        let errorModal = document.getElementById('kiosk-error-modal');
        
        if (!errorModal) {
            // Créer la modal d'erreur
            errorModal = document.createElement('div');
            errorModal.id = 'kiosk-error-modal';
            errorModal.className = 'kiosk-error-modal';
            errorModal.innerHTML = `
                <div class="kiosk-error-content">
                    <div class="kiosk-error-icon">⚠️</div>
                    <div class="kiosk-error-message"></div>
                    <button class="kiosk-error-btn">COMPRIS</button>
                </div>
            `;
            document.body.appendChild(errorModal);
            
            // Ajouter l'événement de fermeture
            errorModal.querySelector('.kiosk-error-btn').addEventListener('click', () => {
                errorModal.classList.remove('show');
                setTimeout(() => {
                    errorModal.style.display = 'none';
                }, 300);
            });
        }
        
        // Afficher le message
        const messageElement = errorModal.querySelector('.kiosk-error-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        errorModal.style.display = 'flex';
        setTimeout(() => {
            errorModal.classList.add('show');
        }, 10);
    }

    // --- DEBUG ATTACHEMENT LISTENERS ---
    console.log('🔗 [Interface-App] Attachement menu-items:', menuItems.length);
    console.log('🔗 [Interface-App] Attachement submenu-items:', submenuItems.length);
    submenuItems.forEach((item, index) => {
        console.log(`🔗 Submenu ${index}:`, item.getAttribute('data-target'));
    });

    // --- DÉMARRAGE ---
    window.showSection = showSection;
    showSection('gestion');

    if (welcomeModal && !localStorage.getItem('dontShowWelcomeModal')) {
        welcomeModal.style.display = 'flex';
    }

});

// --- FONCTIONS GLOBALES ---
window.getGestionEntreesInstance = function() {
    return gestionEntreesInstance;
};

window.refreshEntrees = async function() {
    if (gestionEntreesInstance) {
        await gestionEntreesInstance.loadData();
    }
};

window.forceReloadGestionEntrees = async function() {
    const section = document.getElementById('gestion-tickets-entree');
    if (section) {
        gestionEntreesInstance = null;
        section.classList.add('active');
        section.style.display = 'block';
        
        try {
            gestionEntreesInstance = new GestionEntrees();
            await gestionEntreesInstance.init();
        } catch (error) {
            console.error('❌ [Interface-App] Erreur rechargement forcé:', error);
        }
    }
};

window.getGestionVestiairesInstance = function() {
    return gestionVestiairesInstance;
};

window.getVestiaireKiosqueInstance = function() {
    return vestiaireKiosqueInstance;
};

window.showVestiaireKiosque = async function() {
    await showSection('vestiaire-selection');
};

window.hideVestiaireKiosque = function() {
    const section = document.getElementById('vestiaire-selection');
    if (section) {
        section.style.display = 'none';
    }
};

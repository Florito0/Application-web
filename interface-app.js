// --- VARIABLES GLOBALES (en dehors du DOMContentLoaded pour accès externe) ---
let gestionCodesInstance = null;
let profileInstance = null;
let configurationInstance = null;
let gestionHorairesInstance = null;
let gestionCapaciteInstance = null;
let gestionEntreesInstance = null;
let gestionVestiairesInstance = null;
let vestiaireKiosqueInstance = null;

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. SÉLECTION DE TOUS LES ÉLÉMENTS DE LA PAGE ---
    
    // Navigation et Structure
    const menuItems = document.querySelectorAll('.menu-item');
    const submenuItems = document.querySelectorAll('.submenu-item');
    const backButtons = document.querySelectorAll('.back-button');
    const contentSections = document.querySelectorAll('.content-section');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const toggleIcon = document.getElementById('toggleIcon');
    const toggleBtn = document.querySelector('.toggle-btn');

    // Gestion du basculement Gestion ↔ Kiosque
    const toggleInterfaceBtn = document.getElementById('toggle-interface-btn');
    const toggleBackBtn = document.getElementById('toggle-back-btn');
    const kioskViewSection = document.getElementById('kiosk-view');

    // Modales
    const welcomeModal = document.getElementById('welcomeModal');
    const welcomeModalButton = document.querySelector('#welcomeModal button');
    const dontShowAgainCheckbox = document.getElementById('dontShowAgain');
    const confirmationModal = document.getElementById('confirmationModal');
    const confirmationModalButton = document.querySelector('#confirmationModal button');

    // Formulaire de Profil
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
    const countryInput = document.getElementById('country');
    const phoneInput = document.getElementById('phone');
    const emailInput = document.getElementById('email');
    const countryCodeInput = document.getElementById('countryCode');

    // Autres formulaires
    const saveTaxSettingsBtn = document.getElementById('saveTaxSettingsBtn');
    const saveKiosqueSettings = document.getElementById('saveKiosqueSettings');

    // Kiosque
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

    // --- 2. DÉFINITION DES FONCTIONS ---

    async function showSection(targetId) {
        if (!targetId) return;
        
        console.log('Navigation vers:', targetId);

        // Réinitialiser TOUTES les sections proprement
        contentSections.forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none'; // Force le display à none pour toutes
        });
        
        // Afficher la section cible
        const sectionToShow = document.getElementById(targetId);
        if (sectionToShow) {
            sectionToShow.classList.add('active');
            sectionToShow.style.display = 'block'; // Force le display à block
            
            // Forcer un reflow pour s'assurer que le DOM est mis à jour
            sectionToShow.offsetHeight;
        }

        // --- Logique d'initialisation pour chaque section ---

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
            console.log('Chargement gestion entrées');
            
            // S'assurer que tous les éléments sont visibles
            const currentPrestations = document.querySelector('.current-prestations');
            if (currentPrestations) {
                currentPrestations.style.display = 'block';
            }
            
            if (!gestionEntreesInstance) {
                try {
                    gestionEntreesInstance = new GestionEntrees();
                    await gestionEntreesInstance.init();
                } catch (error) {
                    console.error('Erreur initialisation GestionEntrees:', error);
                }
            } else {
                // TOUJOURS recharger les données pour éviter les problèmes d'affichage
                try {
                    await gestionEntreesInstance.loadData();
                    // Forcer la réinitialisation de l'interface si la méthode existe
                    if (typeof gestionEntreesInstance.initializeInterface === 'function') {
                        gestionEntreesInstance.initializeInterface();
                    }
                } catch (error) {
                    console.error('Erreur rechargement GestionEntrees:', error);
                }
            }
            
            // NOUVEAU : Réinitialiser l'état de l'interface
            if (gestionEntreesInstance && typeof gestionEntreesInstance.resetInterfaceState === 'function') {
                gestionEntreesInstance.resetInterfaceState();
            }
        }
        
        // GESTION DU BASCULEMENT VERS LE KIOSQUE
        if (targetId === 'kiosk-view') {
            console.log('Affichage du kiosque');
            
            // S'assurer que le kiosque est bien visible
            const kioskSection = document.getElementById('kiosk-view');
            if (kioskSection) {
                kioskSection.style.display = 'block';
                kioskSection.classList.add('active');
            }
            
            // Synchroniser les données si possible
            if (gestionEntreesInstance && typeof gestionEntreesInstance.syncToKiosk === 'function') {
                try {
                    gestionEntreesInstance.syncToKiosk();
                } catch (error) {
                    console.error('Erreur synchronisation kiosque:', error);
                }
            }
        }

        // GESTION DES TICKETS VESTIAIRE
        if (targetId === 'gestion-tickets-vestiaire') {
            console.log('Chargement gestion vestiaires');
            
            if (!gestionVestiairesInstance) {
                try {
                    gestionVestiairesInstance = new GestionVestiaires();
                    await gestionVestiairesInstance.init();
                } catch (error) {
                    console.error('Erreur initialisation GestionVestiaires:', error);
                }
            } else {
                await gestionVestiairesInstance.loadArticles();
            }
        }

        // VESTIAIRE KIOSQUE (dans le flux kiosque)
        if (targetId === 'vestiaire-selection') {
            console.log('Affichage sélection vestiaire kiosque');
            
            if (!vestiaireKiosqueInstance) {
                try {
                    vestiaireKiosqueInstance = new VestiaireKiosque();
                    await vestiaireKiosqueInstance.init();
                } catch (error) {
                    console.error('Erreur initialisation VestiaireKiosque:', error);
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
                    
                    // Ré-attacher l'événement au nouveau bouton retour
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

        // GESTION DU KIOSQUE PRINCIPAL
        if (targetId === 'kiosque') {
            const genreSelection = document.getElementById('genre-selection');
            const ticketsEntree = document.getElementById('tickets-entree');
            if (genreSelection) genreSelection.style.display = 'block';
            if (ticketsEntree) ticketsEntree.style.display = 'none';
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
        // Reset previous invalid classes
        profileForm.querySelectorAll('.form-group').forEach(group => group.classList.remove('invalid'));
        if (coverSection) coverSection.classList.remove('invalid');
        if (coverError) coverError.style.display = 'none';
        
        // Validate cover image
        if (coverImage.src === '' || coverImage.style.display === 'none') {
            isValid = false;
            if (coverSection) coverSection.classList.add('invalid');
            if (coverError) {
                coverError.textContent = 'Veuillez ajouter une couverture.';
                coverError.style.display = 'block';
            }
        }
        
        // Validate discoName
        if (!discoNameInput.value.trim()) {
            isValid = false;
            discoNameInput.closest('.form-group').classList.add('invalid');
        }
        
        // Validate city
        if (!cityInput.value.trim()) {
            isValid = false;
            cityInput.closest('.form-group').classList.add('invalid');
        }
        
        // Validate postalCode
        if (!postalCodeInput.value.trim() || !/^\d{5}$/.test(postalCodeInput.value)) {
            isValid = false;
            postalCodeInput.closest('.form-group').classList.add('invalid');
        }
        
        // Validate address
        if (!addressInput.value.trim()) {
            isValid = false;
            addressInput.closest('.form-group').classList.add('invalid');
        }
        
        // Validate phone
        if (!phoneInput.value.trim() || !/^\d{9,10}$/.test(phoneInput.value)) {
            isValid = false;
            phoneInput.closest('.form-group').classList.add('invalid');
        }
        
        // Validate email
        if (!emailInput.value.trim() || !/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(emailInput.value)) {
            isValid = false;
            emailInput.closest('.form-group').classList.add('invalid');
        }
        
        // Validate country if exists
        if (countryInput && !countryInput.value.trim()) {
            isValid = false;
            countryInput.closest('.form-group').classList.add('invalid');
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

    // --- 3. ATTACHEMENT DES ÉCOUTEURS D'ÉVÉNEMENTS ---

    // Navigation principale
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

    // Gestion du basculement Gestion ↔ Kiosque
    if (toggleInterfaceBtn) {
        toggleInterfaceBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Basculement vers le kiosque');
            
            // Masquer toutes les sections avant d'afficher le kiosque
            contentSections.forEach(section => {
                section.classList.remove('active');
                section.style.display = 'none';
            });
            
            // Afficher le kiosque
            await showSection('kiosk-view');
        });
    }

    if (toggleBackBtn) {
        toggleBackBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Retour vers la gestion');
            
            // Masquer le kiosque
            const kioskView = document.getElementById('kiosk-view');
            if (kioskView) {
                kioskView.style.display = 'none';
                kioskView.classList.remove('active');
            }
            
            // Afficher la gestion des entrées
            await showSection('gestion-tickets-entree');
        });
    }

    // Boutons et actions spécifiques
    if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
    if (welcomeModalButton) welcomeModalButton.addEventListener('click', closeModal);
    if (confirmationModalButton) confirmationModalButton.addEventListener('click', closeConfirmationModal);
    
    // Formulaire de Profil
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (validateForm()) {
                // Appeler la méthode de sauvegarde si l'instance existe
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
    
    // Alertes du Kiosque
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

    // ÉVÉNEMENTS PERSONNALISÉS POUR LES ENTRÉES
    document.addEventListener('entreesUpdated', (event) => {
        console.log('Les entrées ont été mises à jour:', event.detail);
        // Mettre à jour le kiosque si les entrées changent
        if (typeof renderKioskItems === 'function') {
            renderKioskItems();
        }
    });

    // ÉVÉNEMENTS PERSONNALISÉS POUR LES VESTIAIRES
    document.addEventListener('vestiaireValidated', (event) => {
        console.log('Vestiaire validé:', event.detail);
        // Ajouter le montant au total de la commande si nécessaire
        // Passer à l'étape suivante du flux
    });

    document.addEventListener('vestiaireSkipped', () => {
        console.log('Vestiaire ignoré');
        // Passer directement à l'étape suivante
    });

    // --- 4. LOGIQUE DE DÉMARRAGE ---

    // Stocker une référence à showSection pour accès global
    window.showSection = showSection;

    // Afficher la section Gestion par défaut
    showSection('gestion');

    // Afficher la modale de bienvenue si nécessaire
    if (welcomeModal && !localStorage.getItem('dontShowWelcomeModal')) {
        welcomeModal.style.display = 'flex';
    }

});

// --- FONCTIONS GLOBALES POUR ACCÈS EXTERNE ---

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
        // Réinitialiser complètement l'instance
        gestionEntreesInstance = null;
        
        // Réafficher la section
        section.classList.add('active');
        section.style.display = 'block';
        
        // Recréer l'instance
        try {
            gestionEntreesInstance = new GestionEntrees();
            await gestionEntreesInstance.init();
        } catch (error) {
            console.error('Erreur lors du rechargement forcé:', error);
        }
    }
    
};

// FONCTIONS GLOBALES POUR LES VESTIAIRES
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
